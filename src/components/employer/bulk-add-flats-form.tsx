"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { NumberField } from "@/components/ui-inputs";
import type { TranslationKey } from "@/lib/i18n";

export function BulkAddFlatsForm({ t }: { t: Record<TranslationKey, string> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wing, setWing] = useState("");
  const [floors, setFloors] = useState(1);
  const [unitStart, setUnitStart] = useState(1);
  const [unitEnd, setUnitEnd] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (unitEnd < unitStart || floors < 1) {
      setError("Enter a valid floor count and unit range");
      return;
    }
    setLoading(true);
    try {
      // flatNumber = floor * 100 + unit, matching how units are actually
      // numbered on the door (e.g. floor 1, units 1-4 -> 101..104; floor 11
      // -> 1101..1104).
      const flatNumbers: string[] = [];
      for (let floor = 1; floor <= floors; floor++) {
        for (let unit = unitStart; unit <= unitEnd; unit++) {
          flatNumbers.push(String(floor * 100 + unit));
        }
      }

      const res = await fetch("/api/residents/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flatNumbers, wing: wing.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add flats");
      setResult({ created: data.created, skipped: data.skipped });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add flats");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="ghost" className="w-full sm:w-auto">
        <Layers size={18} aria-hidden="true" />
        {t.bulk_add_flats.replace("+ ", "")}
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium text-neutral-500">{t.bulk_add_flats_description}</p>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-4">
        <input
          required
          placeholder={t.wing_placeholder}
          value={wing}
          onChange={(e) => setWing(e.target.value)}
          className="rounded-2xl border-2 border-neutral-200 px-3 py-2.5 font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        />
        <NumberField required placeholder={t.floors_placeholder} value={floors} onChange={setFloors} />
        <NumberField required placeholder={t.unit_start_placeholder} value={unitStart} onChange={setUnitStart} />
        <NumberField required placeholder={t.unit_end_placeholder} value={unitEnd} onChange={setUnitEnd} />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? t.generating : t.generate}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
        {result && (
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400 sm:col-span-4">
            {result.created} {t.bulk_add_result_added}
            {result.skipped > 0 && ` (${result.skipped} ${t.bulk_add_result_skipped})`}
          </p>
        )}
      </form>
    </Card>
  );
}
