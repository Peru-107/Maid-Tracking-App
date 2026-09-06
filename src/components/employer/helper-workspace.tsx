"use client";

import { useCallback, useState } from "react";
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

  return (
    <>
      <AttendanceCalendar t={t} helperId={helperId} onChange={bump} />
      <LoanSection t={t} helperId={helperId} loans={loans} onChange={bump} />
      <KharchaSection t={t} helperId={helperId} kharchas={kharchas} onChange={bump} />
      <SettlementPanel
        t={t}
        key={refreshToken}
        helperId={helperId}
        helperName={helperName}
        helperPhone={helperPhone}
      />
    </>
  );
}
