"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

type Purpose = "GUEST" | "DELIVERY" | "CAB" | "VENDOR" | "STAFF" | "OTHER";

type VisitorEntry = {
  id: string;
  visitorName: string;
  purpose: Purpose;
  entryTime: string;
};

const PURPOSE_KEY: Record<Purpose, TranslationKey> = {
  GUEST: "purpose_guest",
  DELIVERY: "purpose_delivery",
  CAB: "purpose_cab",
  VENDOR: "purpose_vendor",
  STAFF: "purpose_staff",
  OTHER: "purpose_other",
};

export function ResidentGateLogList({ t }: { t: Record<TranslationKey, string> }) {
  const [entries, setEntries] = useState<VisitorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/resident/visitor-entries")
      .then((res) => res.json())
      .then((data: { entries: VisitorEntry[] }) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="py-6 text-center text-sm text-neutral-400">{t.loading}</p>;
  }

  if (entries.length === 0) {
    return <Card className="p-8 text-center font-medium text-neutral-500">{t.resident_gate_log_empty}</Card>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Card className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <p className="font-bold">{entry.visitorName}</p>
              <p className="text-sm font-medium text-neutral-500">{t[PURPOSE_KEY[entry.purpose]]}</p>
            </div>
            <span className="text-sm font-medium text-neutral-400">
              {new Date(entry.entryTime).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </Card>
        </li>
      ))}
    </ul>
  );
}
