"use client";

import { useState } from "react";
import type { TranslationKey } from "@/lib/i18n";

export function MarkPresentButton({
  t,
  alreadyMarked,
  approved,
}: {
  t: Record<TranslationKey, string>;
  alreadyMarked: boolean;
  approved: boolean;
}) {
  const [marked, setMarked] = useState(alreadyMarked);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (marked) return;
    setLoading(true);
    try {
      const res = await fetch("/api/me/attendance", { method: "POST" });
      if (res.ok) setMarked(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={marked || loading}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-3xl py-10 text-2xl font-bold shadow-md transition active:scale-[0.98] ${
        marked
          ? approved
            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
          : "bg-teal-600 text-white hover:bg-teal-700"
      }`}
    >
      {marked ? (approved ? t.present : t.pending_approval) : t.mark_present}
    </button>
  );
}
