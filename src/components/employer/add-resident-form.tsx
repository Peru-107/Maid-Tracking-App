"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

export function AddResidentForm({ t }: { t: Record<TranslationKey, string> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [wing, setWing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, flatNumber, wing: wing.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add resident");
      setName("");
      setPhone("");
      setFlatNumber("");
      setWing("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add resident");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <UserPlus size={18} aria-hidden="true" />
        {t.add_resident.replace("+ ", "")}
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-5">
        <input
          required
          placeholder={t.resident_name_placeholder}
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
        <input
          required
          placeholder={t.flat_number_placeholder}
          value={flatNumber}
          onChange={(e) => setFlatNumber(e.target.value)}
          className="rounded-2xl border-2 border-neutral-200 px-3 py-2.5 font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        />
        <input
          placeholder={t.wing_placeholder}
          value={wing}
          onChange={(e) => setWing(e.target.value)}
          className="rounded-2xl border-2 border-neutral-200 px-3 py-2.5 font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? t.saving : t.save}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-5">{error}</p>}
      </form>
    </Card>
  );
}
