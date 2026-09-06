"use client";

import { useCallback, useState } from "react";
import { AttendanceCalendar } from "@/components/employer/attendance-calendar";
import { LoanSection } from "@/components/employer/loan-section";
import { KharchaSection } from "@/components/employer/kharcha-section";
import { SettlementPanel } from "@/components/employer/settlement-panel";

type Loan = Parameters<typeof LoanSection>[0]["loans"][number];
type Kharcha = Parameters<typeof KharchaSection>[0]["kharchas"][number];

export function HelperWorkspace({
  helperId,
  helperName,
  helperPhone,
  loans,
  kharchas,
}: {
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
      <AttendanceCalendar helperId={helperId} onChange={bump} />
      <LoanSection helperId={helperId} loans={loans} onChange={bump} />
      <KharchaSection helperId={helperId} kharchas={kharchas} onChange={bump} />
      <SettlementPanel
        key={refreshToken}
        helperId={helperId}
        helperName={helperName}
        helperPhone={helperPhone}
      />
    </>
  );
}
