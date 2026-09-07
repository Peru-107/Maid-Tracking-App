import { ButtonHTMLAttributes, HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-10px_rgba(15,23,42,0.16)]",
        "dark:bg-neutral-900 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-10px_rgba(0,0,0,0.6)]",
        className,
      )}
      {...props}
    />
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-teal-600 text-white shadow-[0_3px_0_rgba(13,90,80,0.55)] hover:bg-teal-700 active:translate-y-[2px] active:shadow-none dark:shadow-[0_3px_0_rgba(0,0,0,0.5)]",
    secondary:
      "bg-amber-100 text-amber-900 shadow-[0_3px_0_rgba(180,130,20,0.28)] hover:bg-amber-200 active:translate-y-[2px] active:shadow-none dark:bg-amber-900/30 dark:text-amber-200 dark:shadow-[0_3px_0_rgba(0,0,0,0.5)]",
    danger:
      "bg-red-600 text-white shadow-[0_3px_0_rgba(120,20,20,0.5)] hover:bg-red-700 active:translate-y-[2px] active:shadow-none dark:shadow-[0_3px_0_rgba(0,0,0,0.5)]",
    ghost:
      "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:translate-y-[1px] dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10",
  };

  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "green" | "red" | "yellow" | "blue" | "neutral";
}) {
  const tones: Record<string, string> = {
    green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
