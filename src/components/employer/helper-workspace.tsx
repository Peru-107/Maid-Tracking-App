"use client";

import { useCallback, useState } from "react";
import { AttendanceCalendar } from "@/components/employer/attendance-calendar";
import { GaonToggle } from "@/components/employer/gaon-toggle";
import { LoanSection } from "@/components/employer/loan-section";
import { KharchaSection } from "@/components/employer/kharcha-section";
import { SettlementPanel } from "@/components/employer/settlement-panel";

type Loan = Parameters<typeof LoanSection>[0]["loans"][number];
type Kharcha = Parameters<typeof KharchaSection>[0]["kharchas"][number];

export function HelperWorkspace({
  helperId,
  helperName,
  helperPhone,
  initialGaonMode,
  loans,
  kharchas,
}: {
  helperId: string;
  helperName: string;
  helperPhone: string;
  initialGaonMode: boolean;
  loans: Loan[];
  kharchas: Kharcha[];
}) {
  // Bumped whenever attendance, loans, kharcha or Gaon mode change, so the
  // otherwise-independent SettlementPanel remounts and recomputes the slip
  // instead of showing stale numbers from when it first loaded.
  const [refreshToken, setRefreshToken] = useState(0);
  const bump = useCallback(() => setRefreshToken((n) => n + 1), []);

  return (
    <>
      <GaonToggle helperId={helperId} initialGaonMode={initialGaonMode} onChange={bump} />
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
