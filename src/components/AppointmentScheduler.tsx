"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "@/lib/form-context";

interface TimeSlot {
  start: string;
  end: string;
  label: string;
  staffName: string;
}

interface CalendarDay {
  key: string;
  label: string;
  slots: TimeSlot[];
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const INITIAL_VISIBLE_DAYS = 3;
const EXPANDED_VISIBLE_DAYS = 7;

function getJstParts(date: Date) {
  const jstDate = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: jstDate.getUTCFullYear(),
    month: jstDate.getUTCMonth() + 1,
    date: jstDate.getUTCDate(),
    day: jstDate.getUTCDay(),
  };
}

function formatDateKey(parts: { year: number; month: number; date: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.date,
  ).padStart(2, "0")}`;
}

function getCalendarDay(offsetDays: number) {
  const nowJst = new Date(Date.now() + JST_OFFSET_MS);
  const day = new Date(
    Date.UTC(
      nowJst.getUTCFullYear(),
      nowJst.getUTCMonth(),
      nowJst.getUTCDate() + offsetDays,
    ),
  );
  const parts = {
    year: day.getUTCFullYear(),
    month: day.getUTCMonth() + 1,
    date: day.getUTCDate(),
    day: day.getUTCDay(),
  };
  return {
    key: formatDateKey(parts),
    label: `${parts.month}/${parts.date}(${DAY_NAMES[parts.day]})`,
  };
}

function getSlotDateKey(slot: TimeSlot) {
  return formatDateKey(getJstParts(new Date(slot.start)));
}

function getSlotTimeLabel(slot: TimeSlot) {
  return slot.label.split(" ").slice(1).join(" ");
}

function buildCalendarDays(
  slots: TimeSlot[],
  visibleDays: number,
): CalendarDay[] {
  const groups = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    const dateKey = getSlotDateKey(slot);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(slot);
  }

  return Array.from({ length: visibleDays }, (_, index) => {
    const day = getCalendarDay(index);
    return {
      ...day,
      slots: groups.get(day.key) ?? [],
    };
  });
}

export default function AppointmentScheduler() {
  const { state, dispatch, accidentFilesRef } = useFormContext();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [visibleDays, setVisibleDays] = useState(INITIAL_VISIBLE_DAYS);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/availability");
      if (!res.ok) throw new Error("空き時間の取得に失敗しました");
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "空き時間の取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSlot) return;
    setIsBooking(true);
    setBookingError(null);

    try {
      // 1. スプレッドシートへの送信
      const submitRes = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicInfo: state.basicInfo,
          facilities: state.facilities,
          clinicId: state.clinicId,
          clinicName: state.clinicName,
        }),
      });

      if (!submitRes.ok) {
        throw new Error("スプレッドシートへの送信に失敗しました");
      }

      const submitData = await submitRes.json();

      // 2. ファイルアップロード（ある場合のみ、失敗してもブロックしない）
      const files = accidentFilesRef.current;
      if (files.length > 0) {
        try {
          const uploadToken = submitData.uploadToken;

          if (uploadToken) {
            setUploadStatus("写真・映像をアップロード中...");
            const formData = new FormData();
            formData.append("uploadToken", uploadToken);
            for (const file of files) {
              formData.append("files", file);
            }

            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });

            if (!uploadRes.ok) {
              setUploadWarning(
                "写真・映像のアップロードに失敗しました。予約は完了しますが、ファイルは後日お送りください。",
              );
            }
          } else {
            setUploadWarning(
              "写真・映像のアップロード準備に失敗しました。予約は完了しますが、ファイルは後日お送りください。",
            );
          }
        } catch {
          setUploadWarning(
            "写真・映像のアップロードに失敗しました。予約は完了しますが、ファイルは後日お送りください。",
          );
        } finally {
          setUploadStatus(null);
        }
      }

      // 3. カレンダーに予約を追加
      const bookRes = await fetch("/api/calendar/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: selectedSlot.start,
          end: selectedSlot.end,
          name: state.basicInfo.name,
          phoneNumber: state.basicInfo.phoneNumber,
        }),
      });

      if (!bookRes.ok) {
        const bookData = await bookRes.json();
        const bookError = bookData.error || "カレンダー予約に失敗しました";
        // If conflict, refresh slots
        if (bookError.includes("既に予約")) {
          setSelectedSlot(null);
          fetchSlots();
        }
        throw new Error(bookError);
      }

      // Save booked appointment info and move to complete step
      dispatch({
        type: "SET_BOOKED_APPOINTMENT",
        payload: {
          start: selectedSlot.start,
          end: selectedSlot.end,
          label: selectedSlot.label,
        },
      });
      dispatch({ type: "SET_STEP", payload: 6 });
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "送信に失敗しました"
      );
    } finally {
      setIsBooking(false);
    }
  };

  const handleBack = () => dispatch({ type: "SET_STEP", payload: 4 });

  const calendarDays = buildCalendarDays(slots, visibleDays);
  const canShowMoreDays = visibleDays < EXPANDED_VISIBLE_DAYS;

  return (
    <div>
      {/* Title card */}
      <div className="mb-3 overflow-hidden rounded-lg border border-gf-border bg-white">
        <div className="h-[10px] bg-gf-purple" />
        <div className="px-6 py-5">
          <h2 className="text-2xl font-normal text-gf-text">
            カウンセリング日程の選択
          </h2>
          <p className="mt-2 text-sm text-gf-text-secondary">
            まずは直近3日以内の日程からお選びください。ご都合が合わない場合は、下のボタンから先の日程を表示できます。
          </p>
          <p className="mt-1 text-xs text-gray-400">
            対応時間: 全日 9:00〜21:00
          </p>
        </div>
      </div>

      {/* Slot selection */}
      <div className="mb-3 rounded-lg border border-gf-border bg-white px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <svg
              className="h-6 w-6 animate-spin text-gf-purple"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="ml-2 text-sm text-gf-text-secondary">
              空き時間を確認中...
            </span>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gf-error">{error}</p>
            <button
              type="button"
              onClick={fetchSlots}
              className="mt-3 text-sm text-gf-purple underline"
            >
              再読み込み
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {calendarDays.map((day) => (
              <div key={day.key}>
                <h3 className="mb-2 text-sm font-medium text-gf-text">
                  {day.label}
                </h3>
                {day.slots.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gf-border bg-gray-50 px-4 py-3 text-sm text-gf-text-secondary">
                    この日の受付可能枠はありません
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => {
                      const timeLabel = getSlotTimeLabel(slot);
                      const isSelected =
                        selectedSlot?.start === slot.start;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                            isSelected
                              ? "border-gf-purple bg-gf-purple text-white"
                              : "border-gf-border bg-white text-gf-text hover:border-gf-purple hover:bg-gf-purple-light"
                          }`}
                        >
                          {timeLabel}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {canShowMoreDays && (
              <button
                type="button"
                onClick={() => setVisibleDays(EXPANDED_VISIBLE_DAYS)}
                className="w-full rounded border border-gf-purple bg-white px-4 py-3 text-sm font-medium text-gf-purple transition-colors hover:bg-gf-purple-light"
              >
                もっと先の予定を見る
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected slot confirmation */}
      {selectedSlot && (
        <div className="mb-3 rounded-lg border border-gf-purple/30 bg-gf-purple-light px-6 py-4">
          <p className="text-sm text-gf-text">
            <span className="font-medium">選択中: </span>
            {selectedSlot.label}
          </p>
        </div>
      )}

      {/* Upload status */}
      {uploadStatus && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gf-border bg-white px-6 py-4">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gf-purple border-t-transparent" />
          <span className="text-sm text-gf-text-secondary">{uploadStatus}</span>
        </div>
      )}

      {/* Upload warning */}
      {uploadWarning && (
        <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-6 py-4 text-sm text-yellow-800">
          {uploadWarning}
        </div>
      )}

      {/* Booking error */}
      {bookingError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-gf-error">
          {bookingError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={isBooking}
          className="rounded bg-white px-5 py-2.5 text-sm font-medium text-gf-purple shadow-sm ring-1 ring-gf-border transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedSlot || isBooking}
          className="rounded bg-gf-purple px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gf-purple-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBooking
            ? uploadStatus
              ? "アップロード中..."
              : "送信中..."
            : "送信"}
        </button>
      </div>
    </div>
  );
}
