"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Phone, Wallet } from "lucide-react";
import { Button } from "@/components/ui";
import { NumberField } from "@/components/ui-inputs";
import { rupees } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";

export function EditHelperButton({
  t,
  helperId,
  currentName,
  currentPhone,
  currentSalary,
}: {
  t: Record<TranslationKey, string>;
  helperId: string;
  currentName: string;
  currentPhone: string;
  currentSalary: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone.replace("+91", ""));
  const [salary, setSalary] = useState(currentSalary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit() {
    setName(currentName);
    setPhone(currentPhone.replace("+91", ""));
    setSalary(currentSalary);
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/helpers/${helperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, baseMonthlySalary: salary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update helper");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update helper");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          <Phone size={14} aria-hidden="true" />
          +91 {currentPhone.replace("+91", "")}
        </span>
        <button
          onClick={openEdit}
          className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1.5 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
        >
          <Wallet size={14} aria-hidden="true" />
          {rupees(currentSalary)}/mo
          <Pencil size={12} aria-hidden="true" className="opacity-60" />
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-2 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="flex-1 text-xs font-bold text-neutral-500">
        {t.helpers_name_placeholder}
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border-2 border-neutral-200 px-3 py-2 text-sm font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        />
      </label>
      <label className="flex-1 text-xs font-bold text-neutral-500">
        {t.mobile_number_placeholder}
        <div className="mt-1 flex items-center gap-1 rounded-xl border-2 border-neutral-200 px-3 py-2 focus-within:border-teal-500 dark:border-neutral-700">
          <span className="text-sm font-medium text-neutral-500">+91</span>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-transparent text-sm font-medium outline-none"
          />
        </div>
      </label>
      <label className="text-xs font-bold text-neutral-500">
        {t.monthly_salary_placeholder}
        <NumberField value={salary} onChange={setSalary} className="mt-1 w-32 py-2 text-sm" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="px-3 py-2 text-sm">
          {saving ? t.saving : t.save}
        </Button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="text-sm font-medium text-neutral-500 underline"
        >
          {t.cancel}
        </button>
      </div>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
