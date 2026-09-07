"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";
import { calculateMonthlySettlement, SettlementInput } from "@/lib/salary";
import { buildHisaabMessage, buildWhatsAppShareUrl } from "@/lib/whatsapp";
import type { MonthlySettlement } from "@prisma/client";
import type { TranslationKey } from "@/lib/i18n";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function rupees(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function SettlementPanel({
  t,
  helperId,
  helperName,
  helperPhone,
}: {
  t: Record<TranslationKey, string>;
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

  const [loanAmount, setLoanAmount] = useState("0");
  const [overtimeBonus, setOvertimeBonus] = useState("0");
  const [festivalBonus, setFestivalBonus] = useState("0");

  async function refetch() {
    const res = await fetch(`/api/helpers/${helperId}/settlement?year=${year}&month=${month}`);
    const data: { existing: MonthlySettlement | null; draft: { input: SettlementInput } } =
      await res.json();
    setBaseInput(data.draft.input);
    setExisting(data.existing);
    setLoanAmount(String(data.draft.input.loanEmiAmount));
    setOvertimeBonus(String(data.draft.input.overtimeBonus));
    setFestivalBonus(String(data.draft.input.festivalBonus));
  }

  useEffect(() => {
    // Resetting local UI state for a new month is intentional here, not an
    // effect that could be replaced by derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    refetch().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helperId, year, month]);

  const liveResult = useMemo(() => {
    if (!baseInput) return null;
    return calculateMonthlySettlement({
      ...baseInput,
      loanEmiAmount: Number(loanAmount) || 0,
      overtimeBonus: Number(overtimeBonus) || 0,
      festivalBonus: Number(festivalBonus) || 0,
    });
  }, [baseInput, loanAmount, overtimeBonus, festivalBonus]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    else if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  async function postDraft(): Promise<MonthlySettlement> {
    const res = await fetch(`/api/helpers/${helperId}/settlement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        month,
        loanEmiAmount: Number(loanAmount) || 0,
        overtimeBonus: Number(overtimeBonus) || 0,
        festivalBonus: Number(festivalBonus) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not save slip");
    return data.settlement;
  }

  async function saveDraft() {
    setSaving(true);
    setError(null);
    try {
      const settlement = await postDraft();
      setExisting(settlement);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save slip");
    } finally {
      setSaving(false);
    }
  }

  // Marking paid no longer requires a separate "Generate / Update Slip" tap
  // first -- it saves the current numbers as the draft (if one doesn't
  // already exist) and finalizes it in one action, since the loan amount
  // already defaults to the scheduled EMI.
  async function markPaid() {
    setSaving(true);
    setError(null);
    try {
      const settlement = existing ?? (await postDraft());
      const res = await fetch(`/api/helpers/${helperId}/settlement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: settlement.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not mark as paid");
      await refetch();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as paid");
    } finally {
      setSaving(false);
    }
  }

  async function undoMarkPaid() {
    if (!existing) return;
    if (!window.confirm(t.undo_confirm)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/helpers/${helperId}/settlement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: existing.id, paid: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not undo");
      await refetch();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not undo");
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
          {t.salary_slip} — {MONTH_NAMES[month - 1]} {year}
        </h3>
        <button onClick={() => changeMonth(1)} className="rounded-full px-2 py-1 hover:bg-black/5">→</button>
      </div>

      {existing?.paid && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">{t.paid_on} {new Date(existing.paidAt!).toLocaleDateString("en-IN")}</Badge>
          <button
            onClick={undoMarkPaid}
            disabled={saving}
            className="text-xs font-semibold text-neutral-500 underline hover:text-red-600 disabled:opacity-50"
          >
            {t.undo_mistake}
          </button>
        </div>
      )}

      {loading || !liveResult ? (
        <p className="py-6 text-center text-sm text-neutral-400">{t.loading}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-neutral-500">{t.base_salary}</dt>
            <dd className="text-right">{rupees(baseInput!.baseSalary)}</dd>
          </dl>

          <details className="rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
            <summary className="cursor-pointer font-semibold text-neutral-700 dark:text-neutral-200">
              {t.attendance_breakdown}
            </summary>
            <dl className="mt-2 grid grid-cols-2 gap-y-1.5">
              <dt className="text-neutral-500">{t.present}</dt>
              <dd className="text-right">{baseInput!.attendance.presentDays}</dd>
              <dt className="text-neutral-500">{t.absent}</dt>
              <dd className="text-right">{baseInput!.attendance.absentDays}</dd>
              <dt className="text-neutral-500">{t.half_day}</dt>
              <dd className="text-right">{baseInput!.attendance.halfDays}</dd>
              <dt className="text-neutral-500">{t.paid_leave}</dt>
              <dd className="text-right">{baseInput!.attendance.paidLeaveDays}</dd>
              <dt className="text-neutral-500">{t.per_day_wage}</dt>
              <dd className="text-right">{rupees(liveResult.perDayWage)}</dd>
            </dl>
          </details>

          <details className="rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800" open>
            <summary className="cursor-pointer font-semibold text-neutral-700 dark:text-neutral-200">
              {t.deductions_bonuses}
            </summary>
            <dl className="mt-2 grid grid-cols-2 gap-y-1.5">
              {liveResult.lossOfPay > 0 && (
                <>
                  <dt className="text-neutral-500">{t.loss_of_pay}</dt>
                  <dd className="text-right text-red-600">-{rupees(liveResult.lossOfPay)}</dd>
                </>
              )}

              {liveResult.loanEmiDue > 0 && (
                <>
                  <dt className="text-neutral-500">
                    {t.loan_repayment} {liveResult.loanEmiDeducted === 0 && t.skipped}
                  </dt>
                  <dd
                    className={`text-right ${liveResult.loanEmiDeducted === 0 ? "text-neutral-400" : "text-red-600"}`}
                  >
                    -{rupees(liveResult.loanEmiDeducted)}
                  </dd>
                </>
              )}

              {liveResult.kharchaDeducted > 0 && (
                <>
                  <dt className="text-neutral-500">{t.kharcha_advance}</dt>
                  <dd className="text-right text-red-600">-{rupees(liveResult.kharchaDeducted)}</dd>
                </>
              )}

              {liveResult.overtimeBonus > 0 && (
                <>
                  <dt className="text-neutral-500">{t.overtime_bonus}</dt>
                  <dd className="text-right text-green-600">+{rupees(liveResult.overtimeBonus)}</dd>
                </>
              )}

              {liveResult.festivalBonus > 0 && (
                <>
                  <dt className="text-neutral-500">{t.festival_bonus}</dt>
                  <dd className="text-right text-green-600">+{rupees(liveResult.festivalBonus)}</dd>
                </>
              )}

              {liveResult.lossOfPay === 0 &&
                liveResult.loanEmiDue === 0 &&
                liveResult.kharchaDeducted === 0 &&
                liveResult.overtimeBonus === 0 &&
                liveResult.festivalBonus === 0 && (
                  <dd className="col-span-2 text-neutral-400">{t.nothing_to_deduct}</dd>
                )}
            </dl>
          </details>

          <div className="flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-700">
            <span className="text-lg font-bold">{t.final_payout}</span>
            <span className="text-lg font-bold">{rupees(liveResult.finalPayout)}</span>
          </div>

          {!existing?.paid && (
            <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
              {baseInput!.loanOutstandingTotal > 0 && (
                <label className="text-sm">
                  {t.loan_repayment_this_month}
                  <input
                    type="number"
                    min="0"
                    max={baseInput!.loanOutstandingTotal}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-transparent"
                  />
                  <span className="mt-1 block text-xs text-neutral-500">
                    {t.loan_hint_prefix} {rupees(baseInput!.loanEmiDue)} · {t.loan_hint_outstanding} {rupees(baseInput!.loanOutstandingTotal)}.{" "}
                    {t.loan_hint_suffix}
                  </span>
                </label>
              )}
              <div className="flex gap-3">
                <label className="flex-1 text-sm">
                  {t.overtime_guest_bonus_label}
                  <input
                    type="number"
                    min="0"
                    value={overtimeBonus}
                    onChange={(e) => setOvertimeBonus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-transparent"
                  />
                </label>
                <label className="flex-1 text-sm">
                  {t.festival_bonus_label}
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
                {saving ? t.saving : t.generate_update_slip}
              </Button>
            )}
            {!existing?.paid && (
              <Button onClick={markPaid} disabled={saving}>
                {saving ? t.processing : t.mark_as_paid}
              </Button>
            )}
            {existing && (
              <Button onClick={shareOnWhatsApp} variant="ghost" className="text-green-700">
                {t.share_hisaab_whatsapp}
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
