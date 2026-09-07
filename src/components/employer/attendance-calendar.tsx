"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "PAID_LEAVE";

type AttendanceLog = {
  id: string;
  date: string;
  status: AttendanceStatus;
  badli: boolean;
  markedByHelper: boolean;
  approvedByEmployer: boolean;
};

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-500 text-white",
  ABSENT: "bg-red-500 text-white",
  HALF_DAY: "bg-yellow-400 text-neutral-900",
  PAID_LEAVE: "bg-blue-500 text-white",
};

const STATUS_KEYS: Record<AttendanceStatus, TranslationKey> = {
  PRESENT: "present",
  ABSENT: "absent",
  HALF_DAY: "half_day",
  PAID_LEAVE: "paid_leave",
};

const LONG_PRESS_MS = 450;

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function AttendanceCalendar({
  t,
  helperId,
  year,
  month,
  onChangeMonth,
  onChange,
}: {
  t: Record<TranslationKey, string>;
  helperId: string;
  year: number;
  month: number;
  onChangeMonth: (delta: number) => void;
  onChange?: () => void;
}) {
  const [logs, setLogs] = useState<Record<string, AttendanceLog>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pendingBadli, setPendingBadli] = useState(false);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  useEffect(() => {
    // Resetting local UI state for a new month is intentional here, not an
    // effect that could be replaced by derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setSelectedDay(null);
    fetch(`/api/helpers/${helperId}/attendance?year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data: { logs: AttendanceLog[] }) => {
        const map: Record<string, AttendanceLog> = {};
        for (const log of data.logs ?? []) {
          map[log.date.slice(0, 10)] = log;
        }
        setLogs(map);
      })
      .finally(() => setLoading(false));
  }, [helperId, year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  async function setStatus(day: number, status: AttendanceStatus, badli: boolean) {
    const dateKey = toDateKey(year, month, day);
    const res = await fetch(`/api/helpers/${helperId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateKey, status, badli }),
    });
    const data = await res.json();
    if (res.ok) {
      setLogs((prev) => ({ ...prev, [dateKey]: data.log }));
      setSelectedDay(null);
      onChange?.();
    }
  }

  async function clearStatus(day: number) {
    const dateKey = toDateKey(year, month, day);
    const res = await fetch(`/api/helpers/${helperId}/attendance?date=${dateKey}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setLogs((prev) => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
      setSelectedDay(null);
      onChange?.();
    }
  }

  function clearPressTimer() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function handlePressStart(day: number, log: AttendanceLog | undefined) {
    longPressFired.current = false;
    clearPressTimer();
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSelectedDay(day);
      setPendingBadli(log?.badli ?? false);
    }, LONG_PRESS_MS);
  }

  function handlePressEnd(day: number, log: AttendanceLog | undefined, isSelected: boolean) {
    clearPressTimer();
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (isSelected) {
      setSelectedDay(null);
      return;
    }
    if (!log) {
      setStatus(day, "PRESENT", false);
    } else {
      clearStatus(day);
    }
  }

  function handlePressCancel() {
    clearPressTimer();
    longPressFired.current = false;
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => onChangeMonth(-1)}
          className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-base font-bold">{monthLabel}</h3>
        <button
          onClick={() => onChangeMonth(1)}
          className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mb-1 flex flex-wrap gap-3 text-xs font-medium text-neutral-600 dark:text-neutral-400">
        {(Object.keys(STATUS_KEYS) as AttendanceStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1">
            <span className={clsx("h-3 w-3 rounded-full", STATUS_STYLES[status])} />
            {t[STATUS_KEYS[status]]}
          </div>
        ))}
      </div>
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-500">{t.attendance_hint}</p>

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-400">{t.loading}</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 text-center text-sm">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="pb-1 text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {d}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateKey = toDateKey(year, month, day);
            const log = logs[dateKey];
            const isSelected = selectedDay === day;
            return (
              <div key={day} className="relative">
                <button
                  onPointerDown={() => handlePressStart(day, log)}
                  onPointerUp={() => handlePressEnd(day, log, isSelected)}
                  onPointerLeave={handlePressCancel}
                  onPointerCancel={handlePressCancel}
                  onContextMenu={(e) => e.preventDefault()}
                  className={clsx(
                    "flex aspect-square w-full touch-manipulation select-none flex-col items-center justify-center rounded-xl text-xs font-bold transition",
                    log
                      ? STATUS_STYLES[log.status]
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300",
                    isSelected && "ring-2 ring-teal-600 ring-offset-1",
                  )}
                >
                  {day}
                  {log?.badli && <span className="text-[9px] leading-none">Badli</span>}
                  {log?.markedByHelper && !log?.approvedByEmployer && (
                    <span className="text-[9px] leading-none">•</span>
                  )}
                </button>
                {isSelected && (
                  <div className="absolute z-20 mt-1 w-48 rounded-2xl bg-white p-2 shadow-[0_4px_10px_rgba(15,23,42,0.06),0_16px_32px_-8px_rgba(15,23,42,0.24)] dark:bg-neutral-900">
                    <div className="grid grid-cols-2 gap-1">
                      {(Object.keys(STATUS_KEYS) as AttendanceStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatus(day, status, pendingBadli)}
                          className={clsx(
                            "rounded-lg px-2 py-1.5 text-[11px] font-bold",
                            STATUS_STYLES[status],
                          )}
                        >
                          {t[STATUS_KEYS[status]]}
                        </button>
                      ))}
                    </div>
                    <label className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                      <input
                        type="checkbox"
                        checked={pendingBadli}
                        onChange={(e) => setPendingBadli(e.target.checked)}
                      />
                      {t.substitute_badli}
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedDay !== null && (
        <div className="mt-2 flex justify-end">
          <Button variant="ghost" onClick={() => setSelectedDay(null)}>
            {t.close}
          </Button>
        </div>
      )}
    </Card>
  );
}
