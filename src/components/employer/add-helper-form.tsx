"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { NumberField } from "@/components/ui-inputs";
import type { TranslationKey } from "@/lib/i18n";

type Category = "MAID" | "COOK" | "GARDENER" | "GARBAGE_COLLECTOR" | "WATCHMAN";

const CATEGORIES: { value: Category; key: TranslationKey }[] = [
  { value: "MAID", key: "category_maid" },
  { value: "COOK", key: "category_cook" },
  { value: "GARDENER", key: "category_gardener" },
  { value: "GARBAGE_COLLECTOR", key: "category_garbage_collector" },
  { value: "WATCHMAN", key: "category_watchman" },
];

export function AddHelperForm({
  t,
  showCategoryFields = true,
}: {
  t: Record<TranslationKey, string>;
  // Residents only ever hire Maid-category personal helpers -- the API
  // enforces this server-side regardless, but there's no point showing the
  // category/shift controls to them.
  showCategoryFields?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [salary, setSalary] = useState(0);
  const [category, setCategory] = useState<Category>("MAID");
  const [shift, setShift] = useState<"DAY" | "NIGHT">("DAY");
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
        body: JSON.stringify({
          name,
          phone,
          baseMonthlySalary: salary,
          category,
          shift: category === "WATCHMAN" ? shift : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add helper");
      setName("");
      setPhone("");
      setSalary(0);
      setCategory("MAID");
      setShift("DAY");
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
        <UserPlus size={18} aria-hidden="true" />
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
        {showCategoryFields && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            aria-label={t.category_label}
            className="rounded-2xl border-2 border-neutral-200 bg-white px-3 py-2.5 font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {t[c.key]}
              </option>
            ))}
          </select>
        )}
        {showCategoryFields && category === "WATCHMAN" && (
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value as "DAY" | "NIGHT")}
            aria-label={t.shift_label}
            className="rounded-2xl border-2 border-neutral-200 bg-white px-3 py-2.5 font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
          >
            <option value="DAY">{t.shift_day}</option>
            <option value="NIGHT">{t.shift_night}</option>
          </select>
        )}
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
