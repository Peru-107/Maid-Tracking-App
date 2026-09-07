"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Hand } from "lucide-react";
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
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-3xl py-10 text-2xl font-bold shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_26px_-10px_rgba(15,23,42,0.3)] transition active:scale-[0.98] ${
        marked
          ? approved
            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
          : "bg-teal-600 text-white hover:bg-teal-700"
      }`}
    >
      <span className="relative grid h-10 w-10 place-items-center">
        <Hand
          size={40}
          aria-hidden="true"
          className={`col-start-1 row-start-1 transition-opacity duration-180 ease-out ${marked ? "opacity-0" : "opacity-100"}`}
        />
        <Clock
          size={40}
          aria-hidden="true"
          className={`col-start-1 row-start-1 transition-opacity duration-180 ease-out ${marked && !approved ? "opacity-100" : "opacity-0"}`}
        />
        <CheckCircle2
          size={40}
          aria-hidden="true"
          className={`col-start-1 row-start-1 transition-opacity duration-180 ease-out ${marked && approved ? "opacity-100" : "opacity-0"}`}
        />
      </span>
      {marked ? (approved ? t.present : t.pending_approval) : t.mark_present}
    </button>
  );
}
