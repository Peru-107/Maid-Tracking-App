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
4. Deploy. The `build` script runs
   `prisma generate && prisma migrate deploy && next build`, so both the
   generated client and the schema stay current on every deploy — nothing
   extra to run by hand. (`prisma generate` is explicit here rather than
   left to the `postinstall` hook: Vercel can restore a cached
   `node_modules` without re-running installs when `package.json` hasn't
   changed, which left a stale Prisma Client — one still expecting a
   column the migration had already dropped — silently deployed once.)
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
    i18n/            Dictionaries for 13 languages
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
code is returned to the client and shown in a "Dev Mode OTP" banner in
every environment (`SMS_GATEWAY_CONFIGURED` in `otp.ts`; it's not gated on
`NODE_ENV`, since there's nowhere real SMS is actually being sent yet).
Swap `sendSms()` for a real gateway call and flip that flag to go live;
nothing else about the flow needs to change.

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
             − Loan Repayment (whatever amount the employer enters this month)
             − Kharcha (unsettled mid-month advances, deducted in full)
             + Overtime / Guest Bonus
             + Festival Bonus
```

`src/lib/settlement.ts` wires this engine to the database: it tallies the
month's attendance, sums the scheduled EMI and outstanding principal across
any open loans (as a suggested default, not a fixed requirement), sums
unsettled Kharcha, and can persist a **draft** settlement (recomputed on
demand as the employer edits the loan amount or bonus fields) or
**finalize** it — at which point the chosen loan repayment is distributed
across open loans (oldest first, see `applyLoanPaymentWaterfall`), Kharcha
entries are marked settled, and the row is locked as paid.

### Indian-context edge cases

- **Badli (substitute)**: marking a day present has a "Substitute came
  today" checkbox, so approved attendance is preserved for payroll while
  the record still shows a substitute worked, for dispute resolution.
- **Loan vs. Kharcha**: a `LoanEntry` (e.g. ₹10,000 for a medical bill) is
  repaid via an editable monthly amount over time. A `KharchaEntry` (e.g.
  ₹500 for ration) is a smaller advance deducted in full the next time a
  slip is generated — the two ledgers are independent, matching how these
  advances actually get repaid.
- **Flexible loan repayment**: real repayments vary month to month — the
  "Loan Repayment This Month" field on the settlement screen defaults to
  the loan's scheduled EMI but is fully editable. Pay less some months, pay
  extra to clear it faster, or set it to 0 to skip entirely; the amount is
  clamped to what's actually still outstanding and distributed across
  multiple open loans oldest-first (`applyLoanPaymentWaterfall` in
  `src/lib/salary.ts`) when marked paid.
- **Kharcha isn't tied to a calendar month**: every *unsettled* advance —
  regardless of which day it was logged — gets swept into whichever
  settlement is generated next. There's no date-matching to get confused
  by; a Kharcha entered today lands in this cycle's payout as soon as you
  settle, not "next month." Entries can also be deleted (only before
  they're settled) if added by mistake.
- **WhatsApp Hisaab**: "Share Hisaab on WhatsApp" on a generated slip opens
  `wa.me` with an itemized, pre-filled message (attendance, loss of pay,
  loan/kharcha deductions, bonuses, final payout) addressed to the
  helper's registered number.
- **Undo Mark as Paid**: a paid settlement shows an "Undo" link that
  reverses exactly what marking it paid did — restores each loan's
  principal by whatever was actually applied that month (from its
  `LoanEmiEvent` row, then deletes it), reopens a loan that payment had
  closed, and un-settles the Kharcha entries it swept up. For fixing an
  accidental tap, not a general edit tool -- it's still scoped to one
  month's settlement.
- **Delete a helper**: removes their profile and cascades to their entire
  attendance/loan/Kharcha/settlement history (`onDelete: Cascade` in the
  schema). Irreversible, so the employer UI requires an explicit
  confirmation step before it fires.

### Vernacular + accessibility

Both the helper dashboard and the employer dashboard support 13 languages —
English, Hindi, Marathi, Telugu, Tamil, Kannada, Bengali, Gujarati, Punjabi,
Malayalam, Odia, Urdu, and Assamese (`src/lib/i18n`) — switchable from a
dropdown in the header that persists to that user's own profile (`languagePref`
on `User`), independent of the other party's choice. Urdu renders
right-to-left (`dir="rtl"` on the root layout when that locale is active) on
both dashboards; everything else is left-to-right.
The helper view favors large tap targets (a full-width "Mark Present"
button), emoji/icon-first labels (₹ for salary, 🤝 for loans), and a
simple color-coded calendar (green/red/yellow/blue) that needs no reading
to interpret. Both the salary slip (employer) and salary card (helper)
put attendance and deduction line items behind expandable "breakdown"
sections, so the headline number stays uncluttered but the detail is one
tap away.

## Database schema

See `prisma/schema.prisma`. Core models: `User` (role + phone + language),
`HelperProfile` (employer-owned, one optional linked login), `AttendanceLog`
(day + status + badli), `LoanEntry` + `LoanEmiEvent` (loan ledger + a
per-month paid/skipped audit trail), `KharchaEntry` (mid-month advances),
and `MonthlySettlement` (the locked-in digital salary slip).

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
