"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

export function GaonToggle({
  helperId,
  initialGaonMode,
  onChange,
}: {
  helperId: string;
  initialGaonMode: boolean;
  onChange?: () => void;
}) {
  const router = useRouter();
  const [gaonMode, setGaonMode] = useState(initialGaonMode);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !gaonMode;
    try {
      const res = await fetch(`/api/helpers/${helperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaonMode: next }),
      });
      if (res.ok) {
        setGaonMode(next);
        router.refresh();
        onChange?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div>
        <div className="flex items-center gap-2 font-semibold">
          <span>🚂</span> Village (Gaon) Mode
        </div>
        <p className="text-sm text-neutral-500">
          Freezes salary accrual and pauses loan EMI deductions until the helper is back.
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        role="switch"
        aria-checked={gaonMode}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          gaonMode ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            gaonMode ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </Card>
  );
}
