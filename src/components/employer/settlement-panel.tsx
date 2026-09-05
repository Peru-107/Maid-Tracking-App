"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";
import { calculateMonthlySettlement, SettlementInput } from "@/lib/salary";
import { buildHisaabMessage, buildWhatsAppShareUrl } from "@/lib/whatsapp";
import type { MonthlySettlement } from "@prisma/client";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function rupees(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function SettlementPanel({
  helperId,
  helperName,
  helperPhone,
}: {
  helperId: string;
  helperName: string;
  helperPhone: string;
}) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [baseInput, setBaseInput] = useState<SettlementInput | null>(null);
  const [existing, setExisting] = useState<MonthlySettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [skipEmi, setSkipEmi] = useState(false);
  const [overtimeBonus, setOvertimeBonus] = useState("0");
  const [festivalBonus, setFestivalBonus] = useState("0");

  useEffect(() => {
    // Resetting local UI state for a new month is intentional here, not an
    // effect that could be replaced by derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch(`/api/helpers/${helperId}/settlement?year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data: { existing: MonthlySettlement | null; draft: { input: SettlementInput } }) => {
        setBaseInput(data.draft.input);
        setExisting(data.existing);
        setSkipEmi(data.draft.input.loanEmiSkipRequested);
        setOvertimeBonus(String(data.draft.input.overtimeBonus));
        setFestivalBonus(String(data.draft.input.festivalBonus));
      })
      .finally(() => setLoading(false));
  }, [helperId, year, month]);

  const liveResult = useMemo(() => {
    if (!baseInput) return null;
    return calculateMonthlySettlement({
      ...baseInput,
      loanEmiSkipRequested: skipEmi,
      overtimeBonus: Number(overtimeBonus) || 0,
      festivalBonus: Number(festivalBonus) || 0,
    });
  }, [baseInput, skipEmi, overtimeBonus, festivalBonus]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    else if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  async function saveDraft() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/helpers/${helperId}/settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          loanEmiSkipRequested: skipEmi,
          overtimeBonus: Number(overtimeBonus) || 0,
          festivalBonus: Number(festivalBonus) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save slip");
      setExisting(data.settlement);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save slip");
    } finally {
      setSaving(false);
    }
  }

  async function markPaid() {
    if (!existing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/helpers/${helperId}/settlement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: existing.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not mark as paid");
      setExisting(data.settlement);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as paid");
    } finally {
      setSaving(false);
    }
  }

  function shareOnWhatsApp() {
    if (!existing) return;
    const message = buildHisaabMessage(helperName, existing);
    window.open(buildWhatsAppShareUrl(helperPhone, message), "_blank");
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="rounded-full px-2 py-1 hover:bg-black/5">←</button>
        <h3 className="font-semibold">
          Salary Slip — {MONTH_NAMES[month - 1]} {year}
        </h3>
        <button onClick={() => changeMonth(1)} className="rounded-full px-2 py-1 hover:bg-black/5">→</button>
      </div>

      {existing?.paid && (
        <Badge tone="green" className="w-fit">Paid on {new Date(existing.paidAt!).toLocaleDateString("en-IN")}</Badge>
      )}

      {loading || !liveResult ? (
        <p className="py-6 text-center text-sm text-neutral-400">Loading…</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-neutral-500">Base Salary</dt>
            <dd className="text-right">{rupees(baseInput!.baseSalary)}</dd>

            <dt className="text-neutral-500">
              Attendance ({baseInput!.attendance.presentDays}P / {baseInput!.attendance.absentDays}A / {baseInput!.attendance.halfDays}H / {baseInput!.attendance.paidLeaveDays}PL)
            </dt>
            <dd className="text-right">Per-day {rupees(liveResult.perDayWage)}</dd>

            {liveResult.lossOfPay > 0 && (
              <>
                <dt className="text-neutral-500">Loss of Pay</dt>
                <dd className="text-right text-red-600">-{rupees(liveResult.lossOfPay)}</dd>
              </>
            )}

            {liveResult.gaonModeActive && (
              <>
                <dt className="text-neutral-500">Village Leave ({baseInput!.attendance.gaonDays}d, unpaid)</dt>
                <dd className="text-right text-red-600">-{rupees(liveResult.gaonFreezeDeduction)}</dd>
              </>
            )}

            {liveResult.loanEmiDue > 0 && (
              <>
                <dt className="text-neutral-500">Loan EMI {liveResult.loanEmiSkipped && "(Skipped)"}</dt>
                <dd className={`text-right ${liveResult.loanEmiSkipped ? "text-neutral-400" : "text-red-600"}`}>
                  {liveResult.loanEmiSkipped ? "₹0" : `-${rupees(liveResult.loanEmiDeducted)}`}
                </dd>
              </>
            )}

            {liveResult.kharchaDeducted > 0 && (
              <>
                <dt className="text-neutral-500">Kharcha (Advance)</dt>
                <dd className="text-right text-red-600">-{rupees(liveResult.kharchaDeducted)}</dd>
              </>
            )}

            {liveResult.overtimeBonus > 0 && (
              <>
                <dt className="text-neutral-500">Overtime / Guest Bonus</dt>
                <dd className="text-right text-green-600">+{rupees(liveResult.overtimeBonus)}</dd>
              </>
            )}

            {liveResult.festivalBonus > 0 && (
              <>
                <dt className="text-neutral-500">Festival Bonus</dt>
                <dd className="text-right text-green-600">+{rupees(liveResult.festivalBonus)}</dd>
              </>
            )}
          </dl>

          <div className="flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-700">
            <span className="text-lg font-bold">Final Payout</span>
            <span className="text-lg font-bold">{rupees(liveResult.finalPayout)}</span>
          </div>

          {!existing?.paid && (
            <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
              {baseInput!.loanEmiDue > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={skipEmi} onChange={(e) => setSkipEmi(e.target.checked)} />
                  Skip Loan Deduction this Month (adds EMI back, extends loan by 1 month)
                </label>
              )}
              <div className="flex gap-3">
                <label className="flex-1 text-sm">
                  Overtime / Guest Bonus (₹)
                  <input
                    type="number"
                    min="0"
                    value={overtimeBonus}
                    onChange={(e) => setOvertimeBonus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-transparent"
                  />
                </label>
                <label className="flex-1 text-sm">
                  Festival Bonus (₹)
                  <input
                    type="number"
                    min="0"
                    value={festivalBonus}
                    onChange={(e) => setFestivalBonus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-transparent"
                  />
                </label>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {!existing?.paid && (
              <Button onClick={saveDraft} disabled={saving} variant="secondary">
                {saving ? "Saving…" : "Generate / Update Slip"}
              </Button>
            )}
            {existing && !existing.paid && (
              <Button onClick={markPaid} disabled={saving}>
                {saving ? "Processing…" : "Mark as Paid"}
              </Button>
            )}
            {existing && (
              <Button onClick={shareOnWhatsApp} variant="ghost" className="text-green-700">
                Share Hisaab on WhatsApp
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
