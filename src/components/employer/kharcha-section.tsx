"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

type Kharcha = {
  id: string;
  amount: number;
  reason: string | null;
  date: Date | string;
};

export function KharchaSection({
  helperId,
  kharchas,
  onChange,
}: {
  helperId: string;
  kharchas: Kharcha[];
  onChange?: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
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
        body: JSON.stringify({ amount: Number(amount), reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add advance");
      setAmount("");
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
      <h3 className="font-semibold">Kharcha (Mid-month Advance)</h3>
      <p className="text-sm text-neutral-500">
        Small cash advances get deducted in full the next time you generate a salary slip for this
        helper — separate from long-term loans, and not tied to a calendar month.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          required
          type="number"
          min="1"
          placeholder="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-transparent"
        />
        <input
          placeholder="Reason (e.g. ration)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-transparent"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Adding…" : "+ Add"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {kharchas.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-lg border border-neutral-100 p-2 text-sm dark:border-neutral-800">
            <div>
              <div className="font-medium">
                ₹{k.amount.toLocaleString("en-IN")}
                {k.reason && <span className="text-neutral-500"> · {k.reason}</span>}
              </div>
              <div className="text-neutral-500">{new Date(k.date).toLocaleDateString("en-IN")}</div>
            </div>
            <button
              onClick={() => handleDelete(k.id)}
              disabled={deletingId === k.id}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
            >
              {deletingId === k.id ? "Removing…" : "Remove"}
            </button>
          </div>
        ))}
        {kharchas.length === 0 && <p className="text-sm text-neutral-400">No pending advances.</p>}
      </div>

      {kharchas.length > 0 && (
        <div className="text-right text-sm font-semibold">
          Pending total: ₹{total.toLocaleString("en-IN")}
        </div>
      )}
    </Card>
  );
}
