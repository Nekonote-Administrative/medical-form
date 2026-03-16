"use client";

import { useState } from "react";
import { useFormContext } from "@/lib/form-context";

const EVENT_TITLE = "初回カウンセリング（電話）";
const EVENT_DESCRIPTION =
  "初回カウンセリング（お電話）です。";

function toICSDateUTC(isoString: string): string {
  // Convert to "YYYYMMDDTHHmmssZ" format
  return isoString.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildGoogleCalendarUrl(start: string, end: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: EVENT_TITLE,
    dates: `${toICSDateUTC(start)}/${toICSDateUTC(end)}`,
    details: EVENT_DESCRIPTION,
    ctz: "Asia/Tokyo",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildICSContent(start: string, end: string): string {
  const now = new Date().toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Medical Form//Appointment//JP",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${toICSDateUTC(start)}`,
    `DTEND:${toICSDateUTC(end)}`,
    `DTSTAMP:${toICSDateUTC(now)}`,
    `UID:${crypto.randomUUID()}@medical-form`,
    `SUMMARY:${EVENT_TITLE}`,
    `DESCRIPTION:${EVENT_DESCRIPTION}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(start: string, end: string) {
  const content = buildICSContent(start, end);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "counseling-appointment.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CompleteView() {
  const { state } = useFormContext();
  const appointment = state.bookedAppointment;
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-gf-border bg-white">
        <div className="h-[10px] bg-gf-purple" />
        <div className="flex flex-col items-center px-6 py-10 text-center">
          {/* Purple checkmark */}
          <svg
            className="h-16 w-16 text-gf-purple"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="24" cy="24" r="24" fill="currentColor" opacity="0.12" />
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <path
              d="M15 25l6 6 12-12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>

          <h2 className="mt-5 text-2xl font-normal text-gf-text">送信完了</h2>

          <p className="mt-3 text-sm text-gf-text-secondary">
            ご回答ありがとうございました。内容は正常に送信されました。
          </p>

          {/* Appointment info */}
          {appointment && (
            <div className="mt-5 w-full max-w-sm rounded-lg border border-gf-purple/20 bg-gf-purple-light/50 px-5 py-4">
              <p className="text-xs text-gf-text-secondary">
                カウンセリング予約日時
              </p>
              <p className="mt-1 text-base font-medium text-gf-text">
                {appointment.label}
              </p>
            </div>
          )}

          {/* Add to Calendar */}
          {appointment && (
            <div className="mt-4 w-full max-w-sm">
              {!showCalendarOptions ? (
                <button
                  type="button"
                  onClick={() => setShowCalendarOptions(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gf-purple bg-white px-5 py-3 text-sm font-medium text-gf-purple shadow-sm transition-colors hover:bg-gf-purple-light"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="12" y1="14" x2="12" y2="18" />
                    <line x1="10" y1="16" x2="14" y2="16" />
                  </svg>
                  カレンダーに追加する
                </button>
              ) : (
                <div className="space-y-2">
                  {/* Google Calendar */}
                  <a
                    href={buildGoogleCalendarUrl(
                      appointment.start,
                      appointment.end,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-3 rounded-lg border border-gf-border bg-white px-4 py-3 text-sm text-gf-text shadow-sm transition-colors hover:bg-gray-50"
                  >
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM0 5.684h5.684v12.632H0V5.684z"
                        fill="#4285F4"
                      />
                      <path
                        d="M5.684 0v5.684h12.632V0H5.684z"
                        fill="#EA4335"
                      />
                      <path d="M0 5.684V0h5.684v5.684H0z" fill="#FBBC04" />
                      <path
                        d="M18.316 5.684V0H24v5.684h-5.684z"
                        fill="#34A853"
                      />
                      <path
                        d="M0 18.316V24h5.684v-5.684H0z"
                        fill="#188038"
                      />
                      <path
                        d="M18.316 18.316V24H24v-5.684h-5.684z"
                        fill="#1967D2"
                      />
                      <path
                        d="M0 5.684h5.684v12.632H0V5.684z"
                        fill="#4285F4"
                        opacity=".2"
                      />
                    </svg>
                    Google カレンダーに追加
                  </a>

                  {/* .ics download (Apple Calendar, Outlook, etc.) */}
                  <button
                    type="button"
                    onClick={() =>
                      downloadICS(appointment.start, appointment.end)
                    }
                    className="flex w-full items-center gap-3 rounded-lg border border-gf-border bg-white px-4 py-3 text-sm text-gf-text shadow-sm transition-colors hover:bg-gray-50"
                  >
                    <svg
                      className="h-5 w-5 shrink-0 text-gray-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    その他のカレンダー（.icsファイル）
                  </button>

                  <p className="pt-1 text-xs text-gray-400">
                    Apple カレンダー、Outlook
                    などをお使いの方は .ics ファイルをダウンロードしてください。
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="mt-5 text-xs text-gray-400">
            このページを閉じていただいて構いません。
          </p>
        </div>
      </div>
    </div>
  );
}
