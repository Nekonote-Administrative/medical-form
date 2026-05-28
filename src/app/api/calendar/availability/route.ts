import { NextResponse } from "next/server";
import { google } from "googleapis";

interface StaffConfig {
  name: string;
  calendarId: string;
  priority: number; // lower = higher priority
}

function getStaffList(): StaffConfig[] {
  const raw = process.env.GOOGLE_CALENDAR_STAFF;
  if (!raw) {
    // Fallback: single calendar from legacy env var
    const legacy = process.env.GOOGLE_CALENDAR_ID;
    if (legacy) {
      return [{ name: "担当者", calendarId: legacy, priority: 1 }];
    }
    return [];
  }
  try {
    const parsed: StaffConfig[] = JSON.parse(raw);
    return parsed.sort((a, b) => a.priority - b.priority);
  } catch {
    console.error("Failed to parse GOOGLE_CALENDAR_STAFF JSON");
    return [];
  }
}

function getAuth() {
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
  return new google.auth.JWT(email, undefined, privateKey, [
    "https://www.googleapis.com/auth/calendar.readonly",
  ]);
}

interface TimeSlot {
  start: string;
  end: string;
  label: string;
  calendarId: string; // which staff's calendar to book into
  staffName: string;
}

interface BusyPeriod {
  start: number;
  end: number;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 21;
const SLOT_DURATION_HOURS = 1;

async function fetchBusyPeriods(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<BusyPeriod[]> {
  const eventsRes = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
  });

  const periods: BusyPeriod[] = [];
  for (const event of eventsRes.data.items || []) {
    if (event.start?.dateTime && event.end?.dateTime) {
      periods.push({
        start: new Date(event.start.dateTime).getTime(),
        end: new Date(event.end.dateTime).getTime(),
      });
    } else if (event.start?.date) {
      const dayStart = new Date(event.start.date).getTime();
      const dayEnd = event.end?.date
        ? new Date(event.end.date).getTime()
        : dayStart + 24 * 60 * 60 * 1000;
      periods.push({ start: dayStart, end: dayEnd });
    }
  }
  return periods;
}

function hasConflict(
  busyPeriods: BusyPeriod[],
  slotStart: number,
  slotEnd: number,
): boolean {
  return busyPeriods.some(
    (busy) => slotStart < busy.end && slotEnd > busy.start,
  );
}

export async function GET() {
  try {
    const staffList = getStaffList();
    if (staffList.length === 0) {
      return NextResponse.json(
        { error: "GOOGLE_CALENDAR_STAFF is not configured" },
        { status: 500 },
      );
    }

    const auth = getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const timeMin = now.toISOString();
    const lookAheadDays = 7;
    const timeMax = new Date(
      now.getTime() + lookAheadDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const staffBusyResults = await Promise.allSettled(
      staffList.map((staff) =>
        fetchBusyPeriods(calendar, staff.calendarId, timeMin, timeMax),
      ),
    );

    // Map staff index to busy periods
    const staffBusy: Map<number, BusyPeriod[]> = new Map();
    for (let i = 0; i < staffList.length; i++) {
      const result = staffBusyResults[i];
      if (result.status === "fulfilled") {
        staffBusy.set(i, result.value);
      } else {
        console.warn(
          `Could not fetch calendar for ${staffList[i].name}:`,
          result.reason,
        );
        // Treat as fully busy if we can't read their calendar
        staffBusy.set(i, [{ start: 0, end: Infinity }]);
      }
    }

    // Generate available slots
    const slots: TimeSlot[] = [];
    for (let d = 0; d < lookAheadDays; d++) {
      const dayDate = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      const dayJST = new Date(dayDate.getTime() + jstOffset);
      const dayOfWeek = dayJST.getUTCDay();

      for (
        let hour = BUSINESS_START_HOUR;
        hour + SLOT_DURATION_HOURS <= BUSINESS_END_HOUR;
        hour += SLOT_DURATION_HOURS
      ) {
        const slotStartJST = new Date(
          Date.UTC(
            dayJST.getUTCFullYear(),
            dayJST.getUTCMonth(),
            dayJST.getUTCDate(),
            hour,
            0,
            0,
          ),
        );
        const slotStartUTC = new Date(slotStartJST.getTime() - jstOffset);
        const slotEndUTC = new Date(
          slotStartUTC.getTime() + SLOT_DURATION_HOURS * 60 * 60 * 1000,
        );

        if (slotStartUTC.getTime() < now.getTime()) continue;

        // Find the highest-priority staff member who is free
        let assignedStaff: StaffConfig | null = null;
        for (let i = 0; i < staffList.length; i++) {
          const busy = staffBusy.get(i) || [];
          if (
            !hasConflict(busy, slotStartUTC.getTime(), slotEndUTC.getTime())
          ) {
            assignedStaff = staffList[i];
            break; // staffList is sorted by priority, so first match is best
          }
        }

        if (!assignedStaff) continue; // No staff available

        const month = dayJST.getUTCMonth() + 1;
        const date = dayJST.getUTCDate();
        const dayName = DAY_NAMES[dayOfWeek];
        const endHour = hour + SLOT_DURATION_HOURS;

        slots.push({
          start: slotStartUTC.toISOString(),
          end: slotEndUTC.toISOString(),
          label: `${month}/${date}(${dayName}) ${hour}:00〜${endHour}:00`,
          calendarId: assignedStaff.calendarId,
          staffName: assignedStaff.name,
        });
      }
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Calendar availability error:", error);
    return NextResponse.json(
      { error: "カレンダーの取得に失敗しました" },
      { status: 500 },
    );
  }
}
