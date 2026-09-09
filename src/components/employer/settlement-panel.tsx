"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, IndianRupee, MessageCircle } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { NumberField, YesNoToggle } from "@/components/ui-inputs";
import { calculateMonthlySettlement, SettlementInput } from "@/lib/salary";
import { buildHisaabMessage, buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { buildUpiPayUrl } from "@/lib/upi";
import { rupees } from "@/lib/format";
import type { MonthlySettlement } from "@prisma/client";
import type { TranslationKey } from "@/lib/i18n";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SettlementPanel({
  t,
  helperId,
  helperName,
  helperPhone,
  helperUpiId,
  year,
  month,
  onChangeMonth,
}: {
  t: Record<TranslationKey, string>;
  helperId: string;
  helperName: string;
  helperPhone: string;
  helperUpiId?: string | null;
  year: number;
  month: number;
  onChangeMonth: (delta: number) => void;
}) {
  const router = useRouter();

  const [baseInput, setBaseInput] = useState<SettlementInput | null>(null);
  const [existing, setExisting] = useState<MonthlySettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loanAmount, setLoanAmount] = useState(0);
  const [loanSkipped, setLoanSkipped] = useState(false);
  const [overtimeBonus, setOvertimeBonus] = useState(0);
  const [festivalBonus, setFestivalBonus] = useState(0);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [deductionsOpen, setDeductionsOpen] = useState(true);

  async function refetch() {
    const res = await fetch(`/api/helpers/${helperId}/settlement?year=${year}&month=${month}`);
    const data: { existing: MonthlySettlement | null; draft: { input: SettlementInput } } =
      await res.json();
    setBaseInput(data.draft.input);
    setExisting(data.existing);
    setLoanAmount(data.draft.input.loanEmiAmount);
    setLoanSkipped(data.draft.input.loanEmiAmount === 0 && data.draft.input.loanEmiDue > 0);
    setOvertimeBonus(data.draft.input.overtimeBonus);
    setFestivalBonus(data.draft.input.festivalBonus);
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

  const effectiveLoanAmount = loanSkipped ? 0 : loanAmount;

  const liveResult = useMemo(() => {
    if (!baseInput) return null;
    return calculateMonthlySettlement({
      ...baseInput,
      loanEmiAmount: effectiveLoanAmount,
      overtimeBonus,
      festivalBonus,
    });
  }, [baseInput, effectiveLoanAmount, overtimeBonus, festivalBonus]);

  function handleSkipToggle(skip: boolean) {
    setLoanSkipped(skip);
    if (!skip && loanAmount === 0 && baseInput) {
      setLoanAmount(baseInput.loanEmiDue);
    }
  }

  async function postDraft(): Promise<MonthlySettlement> {
    const res = await fetch(`/api/helpers/${helperId}/settlement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        month,
        loanEmiAmount: effectiveLoanAmount,
        overtimeBonus,
        festivalBonus,
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

  const upiPayUrl = useMemo(() => {
    if (!helperUpiId || !liveResult || liveResult.finalPayout <= 0) return null;
    try {
      return buildUpiPayUrl({
        vpa: helperUpiId,
        payeeName: helperName,
        amount: liveResult.finalPayout,
        note: `Salary ${MONTH_NAMES[month - 1]} ${year}`,
      });
    } catch {
      // A malformed upiId shouldn't ever reach here (validated on save),
      // but never surface a broken deep link if it somehow does.
      return null;
    }
  }, [helperUpiId, helperName, liveResult, month, year]);

  const netDeductionsAndBonuses = liveResult
    ? liveResult.overtimeBonus +
      liveResult.festivalBonus -
      liveResult.lossOfPay -
      liveResult.loanEmiDeducted -
      liveResult.kharchaDeducted
    : 0;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onChangeMonth(-1)}
          aria-label="Previous month"
          className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h3 className="text-base font-bold">
          {t.salary_slip} — {MONTH_NAMES[month - 1]} {year}
        </h3>
        <button
          onClick={() => onChangeMonth(1)}
          aria-label="Next month"
          className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      {existing?.paid && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">{t.paid_on} {new Date(existing.paidAt!).toLocaleDateString("en-IN")}</Badge>
          <button
            onClick={undoMarkPaid}
            disabled={saving}
            className="text-xs font-bold text-neutral-500 underline hover:text-red-600 disabled:opacity-50"
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
            <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.base_salary}</dt>
            <dd className="text-right font-semibold">{rupees(baseInput!.baseSalary)}</dd>
          </dl>

          <div className="rounded-2xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => setAttendanceOpen((v) => !v)}
              aria-expanded={attendanceOpen}
              className="flex w-full cursor-pointer list-none items-center justify-between font-bold text-neutral-700 dark:text-neutral-200"
            >
              <span>{t.attendance_breakdown}</span>
              <span className="flex items-center gap-1.5">
                <span className={liveResult.lossOfPay > 0 ? "text-red-600" : "text-neutral-400"}>
                  {liveResult.lossOfPay > 0 ? `-${rupees(liveResult.lossOfPay)}` : rupees(0)}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`text-neutral-400 transition-transform ${attendanceOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            <div className={`accordion-rows ${attendanceOpen ? "is-open" : ""}`}>
              <div>
                <dl className="mt-2 grid grid-cols-2 gap-y-1.5">
                  <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.present}</dt>
                  <dd className="text-right">{baseInput!.attendance.presentDays}</dd>
                  <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.absent}</dt>
                  <dd className="text-right">{baseInput!.attendance.absentDays}</dd>
                  <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.half_day}</dt>
                  <dd className="text-right">{baseInput!.attendance.halfDays}</dd>
                  <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.paid_leave}</dt>
                  <dd className="text-right">{baseInput!.attendance.paidLeaveDays}</dd>
                  <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.per_day_wage}</dt>
                  <dd className="text-right">{rupees(liveResult.perDayWage)}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => setDeductionsOpen((v) => !v)}
              aria-expanded={deductionsOpen}
              className="flex w-full cursor-pointer list-none items-center justify-between font-bold text-neutral-700 dark:text-neutral-200"
            >
              <span>{t.deductions_bonuses}</span>
              <span className="flex items-center gap-1.5">
                <span className={netDeductionsAndBonuses < 0 ? "text-red-600" : "text-green-600"}>
                  {netDeductionsAndBonuses < 0 ? "-" : "+"}
                  {rupees(Math.abs(netDeductionsAndBonuses))}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`text-neutral-400 transition-transform ${deductionsOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            <div className={`accordion-rows ${deductionsOpen ? "is-open" : ""}`}>
              <div>
                <dl className="mt-2 grid grid-cols-2 gap-y-1.5">
                  {liveResult.lossOfPay > 0 && (
                    <>
                      <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.loss_of_pay}</dt>
                      <dd className="text-right text-red-600">-{rupees(liveResult.lossOfPay)}</dd>
                    </>
                  )}

                  {liveResult.loanEmiDue > 0 && (
                    <>
                      <dt className="font-medium text-neutral-600 dark:text-neutral-400">
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
                      <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.kharcha_advance}</dt>
                      <dd className="text-right text-red-600">-{rupees(liveResult.kharchaDeducted)}</dd>
                    </>
                  )}

                  {liveResult.overtimeBonus > 0 && (
                    <>
                      <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.overtime_bonus}</dt>
                      <dd className="text-right text-green-600">+{rupees(liveResult.overtimeBonus)}</dd>
                    </>
                  )}

                  {liveResult.festivalBonus > 0 && (
                    <>
                      <dt className="font-medium text-neutral-600 dark:text-neutral-400">{t.festival_bonus}</dt>
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
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t-2 border-neutral-100 pt-3 dark:border-neutral-800">
            <span className="text-lg font-bold">{t.final_payout}</span>
            <span className="text-lg font-bold text-teal-700 dark:text-teal-400">{rupees(liveResult.finalPayout)}</span>
          </div>

          {!existing?.paid && (
            <div className="flex flex-col gap-3 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800">
              {baseInput!.loanOutstandingTotal > 0 && (
                <div className="text-sm">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">{t.skip_loan_question}</span>
                    <YesNoToggle value={loanSkipped} onChange={handleSkipToggle} yesLabel={t.yes} noLabel={t.no} />
                  </div>
                  {!loanSkipped && (
                    <label className="block">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">
                        {t.loan_repayment_this_month}
                      </span>
                      <NumberField
                        value={loanAmount}
                        onChange={(n) => setLoanAmount(Math.min(n, baseInput!.loanOutstandingTotal))}
                        className="mt-1 w-full"
                      />
                    </label>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <label className="flex-1 text-sm">
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">{t.overtime_guest_bonus_label}</span>
                  <NumberField value={overtimeBonus} onChange={setOvertimeBonus} className="mt-1 w-full" />
                </label>
                <label className="flex-1 text-sm">
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">{t.festival_bonus_label}</span>
                  <NumberField value={festivalBonus} onChange={setFestivalBonus} className="mt-1 w-full" />
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
            {!existing?.paid && upiPayUrl && (
              <a
                href={upiPayUrl}
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-100 px-4 py-2.5 font-semibold text-amber-900 shadow-[0_3px_0_rgba(180,130,20,0.28)] transition-all hover:bg-amber-200 active:translate-y-[2px] active:shadow-none dark:bg-amber-900/30 dark:text-amber-200 dark:shadow-[0_3px_0_rgba(0,0,0,0.5)]"
              >
                <IndianRupee size={16} aria-hidden="true" />
                {t.pay_via_upi}
              </a>
            )}
            {existing && (
              <Button onClick={shareOnWhatsApp} variant="ghost" className="text-green-700 dark:text-green-400">
                <MessageCircle size={16} aria-hidden="true" />
                {t.share_hisaab_whatsapp}
              </Button>
            )}
          </div>
          {!existing?.paid && !helperUpiId && (
            <p className="text-xs font-medium text-neutral-400">{t.add_upi_id_hint}</p>
          )}
        </>
      )}
    </Card>
  );
}
