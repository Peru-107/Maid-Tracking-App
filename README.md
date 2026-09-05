# Maid Tracker

A mobile-first web app for managing the working relationship between domestic
helpers (maids) and their employers in India — attendance, salary advances
(loans + mid-month Kharcha), and automatic monthly salary settlement,
replacing the wall calendar and notebook.

## Why a web app instead of native mobile

The brief asked for "a suitable tech stack for a cross-platform mobile app."
An installable, mobile-first **Next.js web app** was chosen over React
Native/Flutter for this build because it ships a single codebase that runs
immediately in any phone browser (no app-store review, no separate
iOS/Android builds) while still being installable as a home-screen PWA-style
app, and it let this whole slice — schema, API, both dashboards, i18n — be
built and verified end-to-end without native build tooling. The
architecture (a typed API layer + a pure calculation engine) carries over
directly if a native shell is added later.

## Tech stack

- **Next.js 16** (App Router, TypeScript) — server components for data
  fetching, API routes for mutations.
- **Prisma 6 + PostgreSQL** — works with any Postgres (local, [Neon](https://neon.tech),
  [Supabase](https://supabase.com), Railway, RDS, …), which is what makes this
  deployable to serverless hosts like Vercel that don't offer persistent
  local disk (a prior SQLite-based version of this schema doesn't survive
  there).
- **Tailwind CSS 4** for styling.
- **jose** for JWT session cookies, **zod** for API input validation.
- **Vitest** for unit tests (the salary engine).

## Getting started

```bash
cp .env.example .env     # then set DATABASE_URL to a Postgres connection string
npm install
npx prisma migrate dev   # applies migrations
npm run db:seed          # optional: seeds one employer + one helper
npm run dev              # http://localhost:3000
```

You need a Postgres database to run this — either `docker run -e
POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16` locally, or a free
hosted one from [Neon](https://neon.tech) or [Supabase](https://supabase.com).

Login is phone number + OTP. No SMS gateway is wired up (see
[Auth / OTP](#auth--otp) below), so in development the code is shown on
screen in a "Dev Mode OTP" banner instead of being texted.

Seeded demo accounts (after `npm run db:seed`):

| Role     | Phone        |
| -------- | ------------ |
| Employer | 98765 43210  |
| Helper   | 87654 32109  |

## Deploying to Vercel

1. Create a free Postgres database at [neon.tech](https://neon.tech) or
   [supabase.com](https://supabase.com) and copy its connection string.
2. On [vercel.com](https://vercel.com), **Add New Project** → import this
   repo → select the `claude/helper-salary-management-app-qkviyf` branch.
3. Under **Environment Variables**, set:
   - `DATABASE_URL` — the Postgres connection string from step 1
   - `JWT_SECRET` — any long random string
4. Deploy. Vercel runs `next build`, which does **not** run migrations —
   the first deploy needs the schema applied once, either by running
   `npx prisma migrate deploy` locally against the same `DATABASE_URL`
   before deploying, or by adding it as a one-off Vercel build step
   (`"buildCommand": "prisma migrate deploy && next build"` in
   `vercel.json`).
5. Optionally run `npm run db:seed` locally (pointed at the same
   `DATABASE_URL`) to get the demo employer/helper accounts on the live site.

## Architecture

```
src/
  lib/
    salary.ts       Pure settlement-calculation engine (no I/O — unit tested)
    settlement.ts    Reads attendance/loans/kharcha from the DB, builds a
                     SettlementInput, and persists draft/paid settlements
    auth.ts, otp.ts, phone.ts   Session + phone/OTP login
    whatsapp.ts      Builds the "Hisaab" WhatsApp share message + wa.me link
    i18n/            Dictionaries for 7 languages
  app/
    login/           Phone + OTP screens
    employer/        Employer dashboard + per-helper workspace
    helper/          Helper dashboard (vernacular, icon-first)
    api/             REST endpoints backing both dashboards
  components/
    employer/        Attendance calendar, loan/kharcha sections, settlement panel
    helper/          Mark-present button, read-only calendar, language switcher
```

### Auth / OTP

Employers and helpers both log in with **phone number + OTP**
(`src/lib/otp.ts`). No SMS gateway is configured — there's no
Twilio/MSG91 account to wire up in this environment — so the generated
code is returned to the client and shown in a banner in development
(`NODE_ENV !== "production"`). Swap `sendSms()` in `otp.ts` for a real
gateway call to go live; nothing else about the flow needs to change.

The **first user to log in from a phone number employers haven't already
added as a helper becomes an Employer**; a phone number an employer *has*
already entered while adding a helper becomes that Helper's account the
first time they log in. This matches the brief's "focus on the employer
first" guidance — employers self-serve sign-up, helpers get provisioned.

### Salary settlement engine

`src/lib/salary.ts` is the one place the payout formula lives, and it has
no dependency on Next.js, Prisma, or the network — just numbers in,
numbers out — so it's covered by focused unit tests
(`src/lib/salary.test.ts`, run with `npm test`):

```
Final Payout = Base Salary
             − Loss of Pay (absences × per-day wage, half-days × half)
             − Village (Gaon) freeze (days away × per-day wage, unpaid)
             − Loan EMI (unless skipped or Gaon mode is active)
             − Kharcha (mid-month advances, deducted in full)
             + Overtime / Guest Bonus
             + Festival Bonus
```

`src/lib/settlement.ts` wires this engine to the database: it tallies the
month's attendance, sums EMIs due across any open loans, sums unsettled
Kharcha, and can persist a **draft** settlement (recomputed on demand as
the employer edits bonus fields or the skip-EMI checkbox) or **finalize**
it — at which point loan principals are actually reduced, Kharcha entries
are marked settled, and the row is locked as paid.

### Indian-context edge cases

- **Badli (substitute)**: marking a day present has a "Substitute came
  today" checkbox, so approved attendance is preserved for payroll while
  the record still shows a substitute worked, for dispute resolution.
- **Gaon (village) mode**: a toggle on the helper's profile opens a
  `GaonPeriod` span. Days inside that span for a given month are excluded
  from earnings (frozen, not treated as unpaid absence) and the loan EMI
  is automatically skipped for as long as the toggle is on — independent
  of the manual "skip EMI" button.
- **Loan vs. Kharcha**: a `LoanEntry` (e.g. ₹10,000 for a medical bill) is
  repaid via a fixed monthly EMI over time and can be skipped for a month
  without penalty (the term just extends). A `KharchaEntry` (e.g. ₹500 for
  ration) is a same-month advance deducted in full at settlement — the two
  ledgers are independent, matching how these advances actually get repaid.
- **Skip EMI**: one click on the settlement screen adds that month's EMI
  back into the payout and leaves the loan's `remainingPrincipal`
  untouched, so the next month's draft asks for it again.
- **WhatsApp Hisaab**: "Share Hisaab on WhatsApp" on a generated slip opens
  `wa.me` with an itemized, pre-filled message (attendance, loss of pay,
  loan/kharcha deductions, bonuses, final payout) addressed to the
  helper's registered number.

### Vernacular + accessibility

The helper dashboard supports English, Hindi, Marathi, Telugu, Tamil,
Kannada, and Bengali (`src/lib/i18n`), switchable from a dropdown that
persists to the helper's profile. The helper view favors large tap
targets (a full-width "Mark Present" button), emoji/icon-first labels (₹
for salary, 🚂 for Gaon mode, 🤝 for loans), and a simple color-coded
calendar (green/red/yellow/blue) that needs no reading to interpret.

## Database schema

See `prisma/schema.prisma`. Core models: `User` (role + phone + language),
`HelperProfile` (employer-owned, one optional linked login), `AttendanceLog`
(day + status + badli), `GaonPeriod` (village-leave spans), `LoanEntry` +
`LoanEmiEvent` (loan ledger + a per-month paid/skipped audit trail),
`KharchaEntry` (mid-month advances), and `MonthlySettlement` (the locked-in
digital salary slip).

## Testing

```bash
npm test        # salary engine unit tests (vitest)
npm run lint     # eslint
npx tsc --noEmit # typecheck
npm run build    # production build
```

## What's not implemented (out of scope for this pass)

- Real SMS delivery for OTP (see [Auth / OTP](#auth--otp)).
- Push notifications for the employer approval step (`Present` marked by
  a helper shows a pending ⏳ badge on the calendar instead).
- Offline caching/sync of attendance entries.
