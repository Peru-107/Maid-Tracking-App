"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
        className="self-start text-sm font-semibold text-red-600 underline"
      >
        {t.delete_helper}
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-2 border-red-200 p-4 dark:border-red-900">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        {t.confirm_delete_title} {helperName}?
      </p>
      <p className="text-sm text-neutral-500">{t.confirm_delete_body}</p>
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
