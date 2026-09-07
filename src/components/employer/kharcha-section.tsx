"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { NumberField } from "@/components/ui-inputs";
import { rupees } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";

type Kharcha = {
  id: string;
  amount: number;
  reason: string | null;
  date: Date | string;
};

export function KharchaSection({
  t,
  helperId,
  kharchas,
  onChange,
}: {
  t: Record<TranslationKey, string>;
  helperId: string;
  kharchas: Kharcha[];
  onChange?: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/helpers/${helperId}/kharcha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add advance");
      setAmount(0);
      setReason("");
      router.refresh();
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add advance");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(kharchaId: string) {
    setError(null);
    setDeletingId(kharchaId);
    try {
      const res = await fetch(`/api/helpers/${helperId}/kharcha/${kharchaId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete entry");
      router.refresh();
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  const total = kharchas.reduce((s, k) => s + k.amount, 0);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="flex items-center gap-2 font-bold">
        <Wallet size={18} aria-hidden="true" className="text-teal-600 dark:text-teal-400" />
        {t.kharcha_heading}
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <NumberField required placeholder={t.amount_placeholder} value={amount} onChange={setAmount} className="w-32" />
        <input
          placeholder={t.kharcha_reason_placeholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex-1 rounded-2xl border-2 border-neutral-200 px-3 py-2.5 font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        />
        <Button type="submit" disabled={loading}>
          {loading ? t.adding : t.add.replace("+ ", "")}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {kharchas.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-2xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
            <div>
              <div className="font-semibold">
                {rupees(k.amount)}
                {k.reason && <span className="font-medium text-neutral-500"> · {k.reason}</span>}
              </div>
              <div className="font-medium text-neutral-500">{new Date(k.date).toLocaleDateString("en-IN")}</div>
            </div>
            <button
              onClick={() => handleDelete(k.id)}
              disabled={deletingId === k.id}
              aria-label={deletingId === k.id ? t.removing : t.remove}
              title={t.remove}
              className="rounded-xl p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        {kharchas.length === 0 && <p className="text-sm font-medium text-neutral-400">{t.no_pending_advances}</p>}
      </div>

      {kharchas.length > 0 && (
        <div className="text-right text-sm font-bold">
          {t.pending_total}: {rupees(total)}
        </div>
      )}
    </Card>
  );
}
