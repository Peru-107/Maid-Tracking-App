"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";
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
  const [amount, setAmount] = useState("");
  const [emi, setEmi] = useState("");
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
        body: JSON.stringify({ amount: Number(amount), monthlyEmi: Number(emi), reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add loan");
      setAmount("");
      setEmi("");
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
        <h3 className="font-semibold">{t.loans_and_advances}</h3>
        <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? t.cancel : t.new_loan}
        </Button>
      </div>

      {loans.length > 0 && (
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-neutral-500">{t.total_taken}</div>
            <div className="font-semibold">₹{totalTaken.toLocaleString("en-IN")}</div>
          </div>
          <div>
            <div className="text-neutral-500">{t.outstanding}</div>
            <div className="font-semibold">₹{totalOutstanding.toLocaleString("en-IN")}</div>
          </div>
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="grid gap-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
          <input
            required
            type="number"
            min="1"
            placeholder={t.loan_amount_placeholder}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-transparent"
          />
          <input
            required
            type="number"
            min="1"
            placeholder={t.monthly_emi_placeholder}
            value={emi}
            onChange={(e) => setEmi(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-transparent"
          />
          <input
            placeholder={t.reason_placeholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-transparent"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? t.saving : t.add_loan}
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {loans.map((loan) => (
          <div key={loan.id} className="flex items-center justify-between rounded-lg border border-neutral-100 p-2 text-sm dark:border-neutral-800">
            <div>
              <div className="font-medium">
                ₹{loan.amount.toLocaleString("en-IN")}
                {loan.reason && <span className="text-neutral-500"> · {loan.reason}</span>}
              </div>
              <div className="text-neutral-500">
                EMI ₹{loan.monthlyEmi.toLocaleString("en-IN")}/mo · {new Date(loan.date).toLocaleDateString("en-IN")}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">₹{loan.remainingPrincipal.toLocaleString("en-IN")}</div>
              <Badge tone={loan.closed ? "green" : "yellow"}>{loan.closed ? t.cleared : t.active}</Badge>
            </div>
          </div>
        ))}
        {loans.length === 0 && <p className="text-sm text-neutral-400">{t.no_loans_recorded}</p>}
      </div>
    </Card>
  );
}
