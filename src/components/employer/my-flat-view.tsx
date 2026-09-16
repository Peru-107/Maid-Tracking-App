"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

type Purpose = "GUEST" | "DELIVERY" | "CAB" | "VENDOR" | "STAFF" | "OTHER";

type VisitorEntry = {
  id: string;
  visitorName: string;
  purpose: Purpose;
  entryTime: string;
};

const PURPOSE_KEY: Record<Purpose, TranslationKey> = {
  GUEST: "purpose_guest",
  DELIVERY: "purpose_delivery",
  CAB: "purpose_cab",
  VENDOR: "purpose_vendor",
  STAFF: "purpose_staff",
  OTHER: "purpose_other",
};

export function MyFlatView({ t }: { t: Record<TranslationKey, string> }) {
  const [flatNumber, setFlatNumber] = useState<string | null>(null);
  const [entries, setEntries] = useState<VisitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refetch() {
    return fetch("/api/employer/my-flat")
      .then((res) => res.json())
      .then((data: { flatNumber: string | null; entries: VisitorEntry[] }) => {
        setFlatNumber(data.flatNumber);
        setEntries(data.entries ?? []);
        setInput(data.flatNumber ?? "");
      });
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/employer/my-flat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flatNumber: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save flat number");
      await refetch();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save flat number");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="py-6 text-center text-sm text-neutral-400">{t.loading}</p>;
  }

  if (!flatNumber || editing) {
    return (
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <label className="flex-1 text-xs font-bold text-neutral-500">
            {t.flat_number_placeholder}
            <input
              required
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.flat_number_placeholder}
              className="mt-1 w-full rounded-xl border-2 border-neutral-200 px-3 py-2 text-sm font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
            />
          </label>
          <Button type="submit" disabled={saving} className="px-3 py-2 text-sm">
            {saving ? t.saving : t.save}
          </Button>
          {flatNumber && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="text-sm font-medium text-neutral-500 underline"
            >
              {t.cancel}
            </button>
          )}
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </form>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-500">
          {t.flat_number_placeholder}: <span className="font-bold text-neutral-900 dark:text-white">{flatNumber}</span>
        </span>
        <button onClick={() => setEditing(true)} className="text-xs font-bold text-teal-700 underline dark:text-teal-400">
          {t.edit}
        </button>
      </div>

      {entries.length === 0 ? (
        <Card className="p-8 text-center font-medium text-neutral-500">{t.resident_gate_log_empty}</Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card className="flex items-center justify-between gap-3 p-3.5">
                <div>
                  <p className="font-bold">{entry.visitorName}</p>
                  <p className="text-sm font-medium text-neutral-500">{t[PURPOSE_KEY[entry.purpose]]}</p>
                </div>
                <span className="text-sm font-medium text-neutral-400">
                  {new Date(entry.entryTime).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
