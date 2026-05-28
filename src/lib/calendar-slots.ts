import { google } from "googleapis";

interface StaffConfig {
  name: string;
  calendarId: string;
  priority: number;
}

interface BusyPeriod {
  start: number;
  end: number;
}

export interface InternalTimeSlot {
  start: string;
  end: string;
  label: string;
  calendarId: string;
  staffName: string;
}

export interface PublicTimeSlot {
  start: string;
  end: string;
  label: string;
  staffName: string;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 21;
const SLOT_DURATION_HOURS = 1;
const JST_OFFSET = 9 * 60 * 60 * 1000;
const LOOK_AHEAD_DAYS = 7;

function getStaffList(): StaffConfig[] {
  const raw = process.env.GOOGLE_CALENDAR_STAFF;
  if (!raw) {
    const legacy = process.env.GOOGLE_CALENDAR_ID;
    if (legacy) {
      return [{ name: "担当者", calendarId: legacy, priority: 1 }];
    }
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StaffConfig>[];
    return parsed
      .filter(
        (staff): staff is StaffConfig =>
          typeof staff.name === "string" &&
          typeof staff.calendarId === "string" &&
          typeof staff.priority === "number",
      )
      .sort((a, b) => a.priority - b.priority);
  } catch {
    console.error("Failed to parse GOOGLE_CALENDAR_STAFF JSON");
    return [];
  }
}

export function getCalendarAuth(scopes: string[]) {
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
  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes,
  });
}

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

export async function generateAvailableSlots(scopes = [
  "https://www.googleapis.com/auth/calendar.readonly",
]): Promise<InternalTimeSlot[]> {
  const staffList = getStaffList();
  if (staffList.length === 0) {
    throw new Error("GOOGLE_CALENDAR_STAFF is not configured");
  }

  const auth = getCalendarAuth(scopes);
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(
    now.getTime() + LOOK_AHEAD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const staffBusyResults = await Promise.allSettled(
    staffList.map((staff) =>
      fetchBusyPeriods(calendar, staff.calendarId, timeMin, timeMax),
    ),
  );

  const staffBusy = new Map<number, BusyPeriod[]>();
  for (let i = 0; i < staffList.length; i++) {
    const result = staffBusyResults[i];
    if (result.status === "fulfilled") {
      staffBusy.set(i, result.value);
    } else {
      console.warn(
        `Could not fetch calendar for ${staffList[i].name}:`,
        result.reason,
      );
      staffBusy.set(i, [{ start: 0, end: Infinity }]);
    }
  }

  const slots: InternalTimeSlot[] = [];
  for (let d = 0; d < LOOK_AHEAD_DAYS; d++) {
    const dayDate = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const dayJST = new Date(dayDate.getTime() + JST_OFFSET);
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
      const slotStartUTC = new Date(slotStartJST.getTime() - JST_OFFSET);
      const slotEndUTC = new Date(
        slotStartUTC.getTime() + SLOT_DURATION_HOURS * 60 * 60 * 1000,
      );

      if (slotStartUTC.getTime() < now.getTime()) continue;

      const assignedStaff = staffList.find((_, index) => {
        const busy = staffBusy.get(index) || [];
        return !hasConflict(
          busy,
          slotStartUTC.getTime(),
          slotEndUTC.getTime(),
        );
      });

      if (!assignedStaff) continue;

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

  return slots;
}

export function toPublicTimeSlot(slot: InternalTimeSlot): PublicTimeSlot {
  return {
    start: slot.start,
    end: slot.end,
    label: slot.label,
    staffName: slot.staffName,
  };
}
