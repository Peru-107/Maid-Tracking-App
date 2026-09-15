"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Phone, Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

export function ResidentCard({
  t,
  residentId,
  currentName,
  currentPhone,
  currentFlatNumber,
}: {
  t: Record<TranslationKey, string>;
  residentId: string;
  currentName: string;
  currentPhone: string;
  currentFlatNumber: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [name, setName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone.replace("+91", ""));
  const [flatNumber, setFlatNumber] = useState(currentFlatNumber);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/residents/${residentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, flatNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update resident");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update resident");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/residents/${residentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete resident");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete resident");
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-4">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-2xl border-2 border-neutral-200 px-3 py-2 text-sm font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
          />
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-2xl border-2 border-neutral-200 px-3 py-2 text-sm font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
          />
          <input
            required
            value={flatNumber}
            onChange={(e) => setFlatNumber(e.target.value)}
            className="rounded-2xl border-2 border-neutral-200 px-3 py-2 text-sm font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1 py-2 text-sm">
              {saving ? t.saving : t.save}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="py-2 text-sm">
              {t.cancel}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
        </form>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{currentName}</h2>
          <p className="text-sm font-medium text-neutral-500">{t.flat_number_placeholder}: {currentFlatNumber}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          <Phone size={14} aria-hidden="true" />
          +91 {currentPhone.replace("+91", "")}
        </span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {confirmingDelete ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            {t.confirm_delete_resident_body}
          </span>
          <Button variant="danger" onClick={handleDelete} disabled={saving} className="py-1.5 text-sm">
            {saving ? t.deleting : t.yes_delete_permanently}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={saving} className="py-1.5 text-sm">
            {t.cancel}
          </Button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm font-bold text-teal-700 dark:text-teal-400"
          >
            <Pencil size={14} aria-hidden="true" />
            {t.edit}
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-1.5 text-sm font-bold text-red-600"
          >
            <Trash2 size={14} aria-hidden="true" />
            {t.delete_resident}
          </button>
        </div>
      )}
    </Card>
  );
}
