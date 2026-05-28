import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import {
  generateAvailableSlots,
  getCalendarAuth,
} from "@/lib/calendar-slots";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface BookBody {
  start: string;
  end: string;
  name: string;
  phoneNumber?: string;
}

function normalizeIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

async function notifyGoogleChat(message: string) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "GOOGLE_CHAT_WEBHOOK_URL is not configured, skipping notification",
    );
    return;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ text: message }),
  });

  if (!res.ok) {
    console.error("Google Chat notification failed:", await res.text());
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "calendar-book", {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: BookBody = await request.json();
    const start = normalizeIsoDate(body.start);
    const end = normalizeIsoDate(body.end);
    const name = cleanText(body.name, 80);
    const phoneNumber = cleanText(body.phoneNumber, 40);

    if (!start || !end || !name) {
      return NextResponse.json(
        { error: "必要なデータが不足しています" },
        { status: 400 },
      );
    }

    const availableSlots = await generateAvailableSlots([
      "https://www.googleapis.com/auth/calendar",
    ]);
    const selectedSlot = availableSlots.find(
      (slot) => slot.start === start && slot.end === end,
    );

    if (!selectedSlot) {
      return NextResponse.json(
        {
          error:
            "この時間枠は既に予約が入っています。別の時間を選択してください。",
        },
        { status: 409 },
      );
    }

    const auth = getCalendarAuth(["https://www.googleapis.com/auth/calendar"]);
    const calendar = google.calendar({ version: "v3", auth });

    // Re-check the selected staff calendar immediately before insertion.
    const conflictCheck = await calendar.events.list({
      calendarId: selectedSlot.calendarId,
      timeMin: start,
      timeMax: end,
      singleEvents: true,
    });

    const hasConflict = (conflictCheck.data.items || []).some((event) => {
      const eventStart = event.start?.dateTime || event.start?.date;
      const eventEnd = event.end?.dateTime || event.end?.date;
      if (!eventStart || !eventEnd) return false;
      return (
        new Date(eventStart).getTime() < new Date(end).getTime() &&
        new Date(eventEnd).getTime() > new Date(start).getTime()
      );
    });

    if (hasConflict) {
      return NextResponse.json(
        {
          error:
            "この時間枠は既に予約が入っています。別の時間を選択してください。",
        },
        { status: 409 },
      );
    }

    const event = await calendar.events.insert({
      calendarId: selectedSlot.calendarId,
      requestBody: {
        summary: `初回カウンセリング - ${name}`,
        description: `氏名: ${name}\n電話番号: ${
          phoneNumber || "未記入"
        }\n担当: ${selectedSlot.staffName}`,
        start: {
          dateTime: start,
          timeZone: "Asia/Tokyo",
        },
        end: {
          dateTime: end,
          timeZone: "Asia/Tokyo",
        },
      },
    });

    const chatMessage =
      `📅 新規カウンセリング予約が入りました\n` +
      `・氏名: ${name}\n` +
      `・電話番号: ${phoneNumber || "未記入"}\n` +
      `・日時: ${selectedSlot.label}\n` +
      `・担当: ${selectedSlot.staffName}`;

    await notifyGoogleChat(chatMessage);

    return NextResponse.json({
      success: true,
      eventId: event.data.id,
    });
  } catch (error) {
    console.error("Calendar book error:", error);
    return NextResponse.json(
      { error: "予約の登録に失敗しました" },
      { status: 500 },
    );
  }
}
