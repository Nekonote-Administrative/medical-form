import { NextRequest, NextResponse } from "next/server";
import {
  generateAvailableSlots,
  toPublicTimeSlot,
} from "@/lib/calendar-slots";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, "calendar-availability", {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const slots = await generateAvailableSlots();
    return NextResponse.json({ slots: slots.map(toPublicTimeSlot) });
  } catch (error) {
    console.error("Calendar availability error:", error);
    return NextResponse.json(
      { error: "カレンダーの取得に失敗しました" },
      { status: 500 },
    );
  }
}
