"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { NumberField } from "@/components/ui-inputs";
import type { TranslationKey } from "@/lib/i18n";

export function AddHelperForm({ t }: { t: Record<TranslationKey, string> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [salary, setSalary] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/helpers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, baseMonthlySalary: salary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add helper");
      setName("");
      setPhone("");
      setSalary(0);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add helper");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <UserPlus size={18} />
        {t.add_helper.replace("+ ", "")}
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-4">
        <input
          required
          placeholder={t.helpers_name_placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-2xl border-2 border-neutral-200 px-3 py-2.5 font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        />
        <input
          required
          placeholder={t.mobile_number_placeholder}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-2xl border-2 border-neutral-200 px-3 py-2.5 font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        />
        <NumberField required placeholder={t.monthly_salary_placeholder} value={salary} onChange={setSalary} />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? t.saving : t.save}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
      </form>
    </Card>
  );
}
