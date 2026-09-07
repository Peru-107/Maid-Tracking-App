"use client";

import { InputHTMLAttributes, useState } from "react";
import clsx from "clsx";
import { formatIndianNumber } from "@/lib/format";

function onlyDigits(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

/**
 * A number input that displays Indian digit grouping (1,000 / 1,00,000)
 * while not focused, and plain digits while being typed into -- avoids
 * cursor-jump bugs that come from inserting commas live.
 */
export function NumberField({
  value,
  onChange,
  className,
  ...rest
}: {
  value: number;
  onChange: (value: number) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState("");

  // While not focused, the display is derived straight from `value` (no
  // effect needed to keep it in sync); while focused, it's the raw digits
  // the user is actively typing, so commas don't jump the cursor around.
  const displayValue = focused ? rawText : value ? formatIndianNumber(value) : "";

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onFocus={(e) => {
        setFocused(true);
        setRawText(value ? String(value) : "");
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        rest.onBlur?.(e);
      }}
      onChange={(e) => {
        const digits = onlyDigits(e.target.value);
        setRawText(digits);
        onChange(digits ? Number(digits) : 0);
      }}
      className={clsx(
        "rounded-2xl border-2 border-neutral-200 bg-white px-3 py-2.5 text-base font-medium text-neutral-900 outline-none transition-colors focus:border-teal-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white",
        className,
      )}
    />
  );
}

/** A two-way Yes/No segmented control. */
export function YesNoToggle({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="inline-flex rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-800">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={clsx(
          "rounded-xl px-3.5 py-1.5 text-sm font-bold transition-colors",
          !value
            ? "bg-white text-teal-700 shadow-sm dark:bg-neutral-700 dark:text-teal-300"
            : "text-neutral-500 dark:text-neutral-400",
        )}
      >
        {noLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={clsx(
          "rounded-xl px-3.5 py-1.5 text-sm font-bold transition-colors",
          value
            ? "bg-white text-red-600 shadow-sm dark:bg-neutral-700 dark:text-red-400"
            : "text-neutral-500 dark:text-neutral-400",
        )}
      >
        {yesLabel}
      </button>
    </div>
  );
}
