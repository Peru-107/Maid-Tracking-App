"use client";

import { useCallback, useMemo, useState } from "react";
import { AttendanceCalendar } from "@/components/employer/attendance-calendar";
import { LoanSection } from "@/components/employer/loan-section";
import { KharchaSection } from "@/components/employer/kharcha-section";
import { SettlementPanel } from "@/components/employer/settlement-panel";
import type { TranslationKey } from "@/lib/i18n";

type Loan = Parameters<typeof LoanSection>[0]["loans"][number];
type Kharcha = Parameters<typeof KharchaSection>[0]["kharchas"][number];

export function HelperWorkspace({
  t,
  helperId,
  helperName,
  helperPhone,
  loans,
  kharchas,
}: {
  t: Record<TranslationKey, string>;
  helperId: string;
  helperName: string;
  helperPhone: string;
  loans: Loan[];
  kharchas: Kharcha[];
}) {
  // Bumped whenever attendance, loans or kharcha change, so the
  // otherwise-independent SettlementPanel remounts and recomputes the slip
  // instead of showing stale numbers from when it first loaded.
  const [refreshToken, setRefreshToken] = useState(0);
  const bump = useCallback(() => setRefreshToken((n) => n + 1), []);

  // Shared between the attendance calendar and the settlement panel, so
  // changing the month in either one moves the other to match. Kept as one
  // state object so the year/month pair always updates atomically.
  const now = useMemo(() => new Date(), []);
  const [{ year, month }, setPeriod] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }));

  const changeMonth = useCallback((delta: number) => {
    setPeriod((prev) => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      } else if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
      return { year: newYear, month: newMonth };
    });
  }, []);

  return (
    <>
      <AttendanceCalendar
        t={t}
        helperId={helperId}
        year={year}
        month={month}
        onChangeMonth={changeMonth}
        onChange={bump}
      />
      <LoanSection t={t} helperId={helperId} loans={loans} onChange={bump} />
      <KharchaSection t={t} helperId={helperId} kharchas={kharchas} onChange={bump} />
      <SettlementPanel
        t={t}
        key={refreshToken}
        helperId={helperId}
        helperName={helperName}
        helperPhone={helperPhone}
        year={year}
        month={month}
        onChangeMonth={changeMonth}
      />
    </>
  );
}
