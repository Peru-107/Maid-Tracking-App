"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { sortFlatNumbers } from "@/lib/format";
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
  loggedBy: { name: string | null } | null;
};

const PURPOSE_KEY: Record<Purpose, TranslationKey> = {
  GUEST: "purpose_guest",
  DELIVERY: "purpose_delivery",
  CAB: "purpose_cab",
  VENDOR: "purpose_vendor",
  STAFF: "purpose_staff",
  OTHER: "purpose_other",
};

export function GateLogView({
  t,
  wings,
}: {
  t: Record<TranslationKey, string>;
  wings: WingGroup[];
}) {
  const [wingFilter, setWingFilter] = useState("");
  const [flatFilter, setFlatFilter] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [entries, setEntries] = useState<VisitorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const flatOptions = useMemo(() => {
    if (wingFilter) return wings.find((w) => w.wing === wingFilter)?.flats ?? [];
    return sortFlatNumbers(wings.flatMap((w) => w.flats));
  }, [wings, wingFilter]);

  function handleWingChange(wing: string) {
    setWingFilter(wing);
    setFlatFilter("");
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (flatFilter) params.set("flatNumber", flatFilter);
    if (purposeFilter) params.set("purpose", purposeFilter);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/visitor-entries?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { entries: VisitorEntry[] }) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }, [flatFilter, purposeFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {wings.length > 1 && (
          <select
            value={wingFilter}
            onChange={(e) => handleWingChange(e.target.value)}
            className="rounded-2xl border-2 border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
          >
            <option value="">{t.filter_by_wing}</option>
            {wings.map((w) => (
              <option key={w.wing || "ungrouped"} value={w.wing}>
                {w.wing || t.no_wing_label}
              </option>
            ))}
          </select>
        )}
        <select
          value={flatFilter}
          onChange={(e) => setFlatFilter(e.target.value)}
          className="rounded-2xl border-2 border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        >
          <option value="">{t.filter_by_flat}</option>
          {flatOptions.map((flat) => (
            <option key={flat} value={flat}>
              {flat}
            </option>
          ))}
        </select>
        <select
          value={purposeFilter}
          onChange={(e) => setPurposeFilter(e.target.value)}
          className="rounded-2xl border-2 border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-teal-500 dark:border-neutral-700 dark:bg-transparent"
        >
          <option value="">{t.filter_by_purpose}</option>
          {(Object.keys(PURPOSE_KEY) as Purpose[]).map((p) => (
            <option key={p} value={p}>
              {t[PURPOSE_KEY[p]]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-neutral-400">{t.loading}</p>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center font-medium text-neutral-500">{t.no_visitor_entries}</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-neutral-100 text-xs font-bold text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-2.5">{t.flat_number}</th>
                <th className="px-4 py-2.5">{t.visitor_name}</th>
                <th className="px-4 py-2.5">{t.purpose_label}</th>
                <th className="px-4 py-2.5">{t.entry_time}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-neutral-50 last:border-0 dark:border-neutral-800/60">
                  <td className="px-4 py-2.5 font-bold">{entry.flatNumber}</td>
                  <td className="px-4 py-2.5">{entry.visitorName}</td>
                  <td className="px-4 py-2.5">
                    {t[PURPOSE_KEY[entry.purpose]]}
                    {entry.purpose === "OTHER" && entry.note && (
                      <span className="text-neutral-500"> — {entry.note}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    {new Date(entry.entryTime).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
