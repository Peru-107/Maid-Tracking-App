"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui";
import { NumberField } from "@/components/ui-inputs";
import { rupees } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";

export function EditSalaryButton({
  t,
  helperId,
  currentSalary,
}: {
  t: Record<TranslationKey, string>;
  helperId: string;
  currentSalary: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [salary, setSalary] = useState(currentSalary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/helpers/${helperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseMonthlySalary: salary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update salary");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update salary");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setSalary(currentSalary);
          setEditing(true);
        }}
        className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1.5 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
      >
        <Wallet size={14} />
        {rupees(currentSalary)}/mo
        <Pencil size={12} className="opacity-60" />
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <NumberField
        required
        placeholder={t.monthly_salary_placeholder}
        value={salary}
        onChange={setSalary}
        className="w-32 px-2 py-1 text-sm"
      />
      <Button type="submit" disabled={saving} className="px-3 py-1 text-xs">
        {saving ? t.saving : t.save}
      </Button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={saving}
        className="text-xs font-medium text-neutral-500 underline"
      >
        {t.cancel}
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
