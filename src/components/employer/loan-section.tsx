"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Plus } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { NumberField } from "@/components/ui-inputs";
import { rupees } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";

type Loan = {
  id: string;
  amount: number;
  reason: string | null;
  monthlyEmi: number;
  remainingPrincipal: number;
  closed: boolean;
  date: Date | string;
};

export function LoanSection({
  t,
  helperId,
  loans,
  onChange,
}: {
  t: Record<TranslationKey, string>;
  helperId: string;
  loans: Loan[];
  onChange?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [emi, setEmi] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/helpers/${helperId}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, monthlyEmi: emi, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add loan");
      setAmount(0);
      setEmi(0);
      setReason("");
      setOpen(false);
      router.refresh();
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add loan");
    } finally {
      setLoading(false);
    }
  }

  const active = loans.filter((l) => !l.closed);
  const totalTaken = loans.reduce((s, l) => s + l.amount, 0);
  const totalOutstanding = active.reduce((s, l) => s + l.remainingPrincipal, 0);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold">
          <HandCoins size={18} aria-hidden="true" className="text-amber-600 dark:text-amber-400" />
          {t.loans_and_advances}
        </h3>
        <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? t.cancel : (
            <>
              <Plus size={16} aria-hidden="true" />
              {t.new_loan.replace("+ ", "")}
            </>
          )}
        </Button>
      </div>

      {loans.length > 0 && (
        <div className="flex gap-6 text-sm">
          <div>
            <div className="font-medium text-neutral-600 dark:text-neutral-400">{t.total_taken}</div>
            <div className="font-bold">{rupees(totalTaken)}</div>
          </div>
          <div>
            <div className="font-medium text-neutral-600 dark:text-neutral-400">{t.outstanding}</div>
            <div className="font-bold">{rupees(totalOutstanding)}</div>
          </div>
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="grid gap-2 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800">
          <NumberField required placeholder={t.loan_amount_placeholder} value={amount} onChange={setAmount} />
          <NumberField required placeholder={t.monthly_emi_placeholder} value={emi} onChange={setEmi} />
          <input
            placeholder={t.reason_placeholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-2xl border-2 border-neutral-200 px-3 py-2.5 font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? t.saving : t.add_loan}
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {loans.map((loan) => (
          <div
            key={loan.id}
            className="entry-row flex items-center justify-between rounded-2xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800"
          >
            <div>
              <div className="font-semibold">
                {rupees(loan.amount)}
                {loan.reason && <span className="font-medium text-neutral-500"> · {loan.reason}</span>}
              </div>
              <div className="font-medium text-neutral-500">
                EMI {rupees(loan.monthlyEmi)}/mo · {new Date(loan.date).toLocaleDateString("en-IN")}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{rupees(loan.remainingPrincipal)}</div>
              <Badge tone={loan.closed ? "green" : "yellow"}>{loan.closed ? t.cleared : t.active}</Badge>
            </div>
          </div>
        ))}
        {loans.length === 0 && <p className="text-sm font-medium text-neutral-400">{t.no_loans_recorded}</p>}
      </div>
    </Card>
  );
}
