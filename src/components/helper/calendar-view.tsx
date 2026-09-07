"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "PAID_LEAVE";

type AttendanceLog = {
  date: string;
  status: AttendanceStatus;
  approvedByEmployer: boolean;
  markedByHelper: boolean;
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

export function HelperCalendarView({ t }: { t: Record<TranslationKey, string> }) {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [logs, setLogs] = useState<Record<string, AttendanceLog>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/me/attendance?year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data: { logs: AttendanceLog[] }) => {
        const map: Record<string, AttendanceLog> = {};
        for (const log of data.logs ?? []) {
          map[log.date.slice(0, 10)] = log;
        }
        setLogs(map);
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-lg font-bold">{t.calendar}</h3>

      <div className="mb-2 flex flex-wrap gap-3 text-xs text-neutral-500">
        {(Object.keys(STATUS_KEYS) as AttendanceStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1">
            <span className={clsx("h-3 w-3 rounded-full", STATUS_STYLES[status])} />
            {t[STATUS_KEYS[status]]}
          </div>
        ))}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-neutral-400">…</p>
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
            const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const log = logs[dateKey];
            return (
              <div
                key={day}
                className={clsx(
                  "flex aspect-square w-full flex-col items-center justify-center rounded-lg text-sm font-semibold",
                  log ? STATUS_STYLES[log.status] : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800",
                )}
              >
                {day}
                {log && !log.approvedByEmployer && log.markedByHelper && (
                  <span className="text-[9px] leading-none">•</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
