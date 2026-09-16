"use client";

import { FormEvent, useEffect, useState } from "react";
import clsx from "clsx";
import { DoorOpen } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

type Purpose = "GUEST" | "DELIVERY" | "CAB" | "VENDOR" | "STAFF" | "OTHER";

type WingGroup = { wing: string; flats: string[] };

type VisitorEntry = {
  id: string;
  flatNumber: string;
  visitorName: string;
  purpose: Purpose;
  note: string | null;
  entryTime: string;
};

const PURPOSES: { value: Purpose; key: TranslationKey }[] = [
  { value: "GUEST", key: "purpose_guest" },
  { value: "DELIVERY", key: "purpose_delivery" },
  { value: "CAB", key: "purpose_cab" },
  { value: "VENDOR", key: "purpose_vendor" },
  { value: "STAFF", key: "purpose_staff" },
  { value: "OTHER", key: "purpose_other" },
];

export function GateLogEntry({ t }: { t: Record<TranslationKey, string> }) {
  const [wings, setWings] = useState<WingGroup[]>([]);
  const [entries, setEntries] = useState<VisitorEntry[]>([]);
  const [selectedWing, setSelectedWing] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("GUEST");
  const [otherNote, setOtherNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refetch() {
    fetch("/api/me/visitor-entries")
      .then((res) => res.json())
      .then((data: { entries: VisitorEntry[]; wings: WingGroup[] }) => {
        setEntries(data.entries ?? []);
        setWings(data.wings ?? []);
        setSelectedWing((prev) => prev || data.wings?.[0]?.wing || "");
      });
  }

  useEffect(refetch, []);

  const flatsInWing = wings.find((w) => w.wing === selectedWing)?.flats ?? [];

  function handleWingChange(wing: string) {
    setSelectedWing(wing);
    setFlatNumber("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/me/visitor-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flatNumber,
          visitorName,
          purpose,
          note: purpose === "OTHER" ? otherNote : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not log entry");
      setEntries((prev) => [data.entry, ...prev]);
      setVisitorName("");
      setOtherNote("");
      // Wing/flat and purpose are left as-is -- a watchman logging several
      // visitors to the same flat back-to-back shouldn't have to reselect.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log entry");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-lg font-bold">
        <DoorOpen size={20} aria-hidden="true" className="text-teal-600 dark:text-teal-400" />
        {t.log_visitor}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2.5">
        {wings.length > 1 && (
          <select
            required
            value={selectedWing}
            onChange={(e) => handleWingChange(e.target.value)}
            aria-label={t.select_wing}
            className="rounded-2xl border-2 border-neutral-200 bg-white px-3 py-2.5 text-base font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
          >
            {wings.map((w) => (
              <option key={w.wing || "ungrouped"} value={w.wing}>
                {w.wing || t.no_wing_label}
              </option>
            ))}
          </select>
        )}

        <select
          required
          value={flatNumber}
          onChange={(e) => setFlatNumber(e.target.value)}
          aria-label={t.select_flat}
          className="rounded-2xl border-2 border-neutral-200 bg-white px-3 py-2.5 text-base font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        >
          <option value="" disabled>
            {t.select_flat}
          </option>
          {flatsInWing.map((flat) => (
            <option key={flat} value={flat}>
              {flat}
            </option>
          ))}
        </select>

        <input
          required
          placeholder={t.visitor_name_placeholder}
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          className="rounded-2xl border-2 border-neutral-200 px-3 py-2.5 text-base font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        />

        <div className="flex flex-wrap gap-1.5">
          {PURPOSES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPurpose(p.value)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-sm font-bold",
                purpose === p.value
                  ? "bg-teal-600 text-white"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
              )}
            >
              {t[p.key]}
            </button>
          ))}
        </div>

        {purpose === "OTHER" && (
          <input
            required
            placeholder={t.other_purpose_placeholder}
            value={otherNote}
            onChange={(e) => setOtherNote(e.target.value)}
            className="rounded-2xl border-2 border-neutral-200 px-3 py-2.5 text-base font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={submitting} className="text-base">
          {submitting ? t.logging : t.log_entry}
        </Button>
      </form>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{t.todays_entries}</h3>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">{t.no_entries_today}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800"
              >
                <span className="font-bold">{entry.flatNumber}</span>
                <span className="flex-1 truncate text-neutral-600 dark:text-neutral-300">
                  {entry.visitorName}
                  {entry.purpose === "OTHER" && entry.note && ` — ${entry.note}`}
                </span>
                <span className="text-xs font-medium text-neutral-400">
                  {new Date(entry.entryTime).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
