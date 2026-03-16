import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function getAuth(scopes: string[]) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (privateKey && !privateKey.includes("-----BEGIN")) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
  }
  if (!email || !privateKey) {
    throw new Error("Google credentials not configured");
  }
  return new google.auth.JWT(email, undefined, privateKey, scopes);
}

async function notifyGoogleChat(message: string) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("GOOGLE_CHAT_WEBHOOK_URL is not configured, skipping notification");
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

interface BookBody {
  start: string;
  end: string;
  name: string;
  phoneNumber: string;
  calendarId: string;
  staffName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BookBody = await request.json();
    const { start, end, name, phoneNumber, calendarId, staffName } = body;

    if (!start || !end || !name || !calendarId) {
      return NextResponse.json(
        { error: "必要なデータが不足しています" },
        { status: 400 },
      );
    }

    const auth = getAuth([
      "https://www.googleapis.com/auth/calendar",
    ]);
    const calendar = google.calendar({ version: "v3", auth });

    // Double-check the slot is still available
    const conflictCheck = await calendar.events.list({
      calendarId,
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
        { error: "この時間枠は既に予約が入っています。別の時間を選択してください。" },
        { status: 409 },
      );
    }

    // Create calendar event
    const startDate = new Date(start);
    const jstOffset = 9 * 60 * 60 * 1000;
    const startJST = new Date(startDate.getTime() + jstOffset);
    const month = startJST.getUTCMonth() + 1;
    const date = startJST.getUTCDate();
    const hour = startJST.getUTCHours();
    const endDate = new Date(end);
    const endJST = new Date(endDate.getTime() + jstOffset);
    const endHour = endJST.getUTCHours();

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `初回カウンセリング - ${name}`,
        description: `氏名: ${name}\n電話番号: ${phoneNumber || "未記入"}\n担当: ${staffName || "未定"}`,
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

    // Send Google Chat notification
    const chatMessage =
      `📅 新規カウンセリング予約が入りました\n` +
      `・氏名: ${name}\n` +
      `・電話番号: ${phoneNumber || "未記入"}\n` +
      `・日時: ${month}/${date} ${hour}:00〜${endHour}:00\n` +
      `・担当: ${staffName || "未定"}`;

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
