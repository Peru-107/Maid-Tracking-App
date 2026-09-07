"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setDevCode(data.devCode ?? null);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push(data.role === "EMPLOYER" ? "/employer" : "/helper");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-white px-4 dark:from-neutral-950 dark:to-neutral-900">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Maid Tracker</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Attendance, advances &amp; salary — sorted every month.
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        {step === "phone" ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                Mobile number
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2.5 focus-within:border-teal-600 dark:border-neutral-700">
                <span className="text-neutral-500">+91</span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  required
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent text-lg outline-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                Your name <span className="text-neutral-400">(first time only)</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-lg outline-none focus:border-teal-600 dark:border-neutral-700 dark:bg-transparent"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full text-lg">
              {loading ? "Sending code…" : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Enter the code sent to <span className="font-semibold">+91 {phone}</span>
            </p>
            {devCode && (
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                <strong>Dev Mode OTP:</strong> {devCode}
                <div className="mt-0.5 text-xs opacity-80">
                  No SMS gateway is configured yet — the code is shown here for testing.
                </div>
              </div>
            )}
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              required
              maxLength={4}
              placeholder="0000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-center text-3xl tracking-[0.5em] outline-none focus:border-teal-600 dark:border-neutral-700 dark:bg-transparent"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full text-lg">
              {loading ? "Verifying…" : "Verify & Continue"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-sm text-neutral-500 underline"
            >
              Change number
            </button>
          </form>
        )}
      </Card>
    </main>
  );
}
