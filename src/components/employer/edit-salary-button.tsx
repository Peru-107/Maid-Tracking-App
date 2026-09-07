"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";
import { NumberField } from "@/components/ui-inputs";
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
        className="flex items-center gap-1 text-xs font-bold text-teal-700 underline dark:text-teal-400"
      >
        <Pencil size={12} />
        {t.edit}
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
