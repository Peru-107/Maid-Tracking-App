"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Button, Card } from "@/components/ui";

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

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half-day",
  PAID_LEAVE: "Paid Leave",
};

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function AttendanceCalendar({
  helperId,
  onChange,
}: {
  helperId: string;
  onChange?: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [logs, setLogs] = useState<Record<string, AttendanceLog>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pendingBadli, setPendingBadli] = useState(false);

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

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

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

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="rounded-full px-2 py-1 hover:bg-black/5" aria-label="Previous month">
          ←
        </button>
        <h3 className="font-semibold">{monthLabel}</h3>
        <button onClick={() => changeMonth(1)} className="rounded-full px-2 py-1 hover:bg-black/5" aria-label="Next month">
          →
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-3 text-xs text-neutral-500">
        {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1">
            <span className={clsx("h-3 w-3 rounded-full", STATUS_STYLES[status])} />
            {STATUS_LABELS[status]}
          </div>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 text-center text-sm">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="pb-1 text-xs font-semibold text-neutral-400">
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
                  onClick={() => {
                    setSelectedDay(isSelected ? null : day);
                    setPendingBadli(log?.badli ?? false);
                  }}
                  className={clsx(
                    "flex aspect-square w-full flex-col items-center justify-center rounded-lg text-xs font-semibold transition",
                    log ? STATUS_STYLES[log.status] : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800",
                    isSelected && "ring-2 ring-teal-600 ring-offset-1",
                  )}
                >
                  {day}
                  {log?.badli && <span className="text-[9px] leading-none">Badli</span>}
                  {log?.markedByHelper && !log?.approvedByEmployer && (
                    <span className="text-[9px] leading-none">⏳</span>
                  )}
                </button>
                {isSelected && (
                  <div className="absolute z-20 mt-1 w-48 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="grid grid-cols-2 gap-1">
                      {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatus(day, status, pendingBadli)}
                          className={clsx(
                            "rounded-md px-2 py-1 text-[11px] font-semibold",
                            STATUS_STYLES[status],
                          )}
                        >
                          {STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                    <label className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                      <input
                        type="checkbox"
                        checked={pendingBadli}
                        onChange={(e) => setPendingBadli(e.target.checked)}
                      />
                      Substitute (Badli) came today
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
            Close
          </Button>
        </div>
      )}
    </Card>
  );
}
