"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

export function DeleteHelperButton({
  t,
  helperId,
  helperName,
}: {
  t: Record<TranslationKey, string>;
  helperId: string;
  helperName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/helpers/${helperId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete helper");
      router.push("/employer");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete helper");
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 self-start text-sm font-bold text-red-600 underline"
      >
        <Trash2 size={14} aria-hidden="true" />
        {t.delete_helper}
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-2 bg-red-50 p-4 dark:bg-red-950/30">
      <p className="text-sm font-bold text-red-700 dark:text-red-400">
        {t.confirm_delete_title} {helperName}?
      </p>
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{t.confirm_delete_body}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? t.deleting : t.yes_delete_permanently}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
          {t.cancel}
        </Button>
      </div>
    </Card>
  );
}
