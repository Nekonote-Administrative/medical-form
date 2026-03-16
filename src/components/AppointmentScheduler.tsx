"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "@/lib/form-context";

interface TimeSlot {
  start: string;
  end: string;
  label: string;
  calendarId: string;
  staffName: string;
}

// Group slots by date for display
function groupByDate(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const groups = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    // Extract date part from label (e.g. "3/16(月)")
    const dateKey = slot.label.split(" ")[0];
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(slot);
  }
  return groups;
}

export default function AppointmentScheduler() {
  const { state, dispatch } = useFormContext();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

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
        }),
      });

      if (!submitRes.ok) {
        throw new Error("スプレッドシートへの送信に失敗しました");
      }

      // 2. スプレッドシート送信成功後、カレンダーに予約を追加
      const bookRes = await fetch("/api/calendar/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: selectedSlot.start,
          end: selectedSlot.end,
          name: state.basicInfo.name,
          phoneNumber: state.basicInfo.phoneNumber,
          calendarId: selectedSlot.calendarId,
          staffName: selectedSlot.staffName,
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

  const grouped = groupByDate(slots);

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
            初回カウンセリング（お電話）の日程を選択し、「送信」を押してください。
          </p>
          <p className="mt-1 text-xs text-gray-400">
            対応時間: 平日 10:00〜17:00（土日祝を除く）
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
        ) : slots.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gf-text-secondary">
              現在、予約可能な時間枠がありません。
            </p>
            <p className="mt-1 text-xs text-gray-400">
              後日改めてご確認ください。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([dateKey, dateSlots]) => (
              <div key={dateKey}>
                <h3 className="mb-2 text-sm font-medium text-gf-text">
                  {dateKey}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {dateSlots.map((slot) => {
                    const timeLabel = slot.label.split(" ")[1];
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
              </div>
            ))}
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
          {isBooking ? "送信中..." : "送信"}
        </button>
      </div>
    </div>
  );
}
