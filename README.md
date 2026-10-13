# Medi-Clinic Dashboard

Production: **Not deployed yet.** Add the Vercel production URL here after the
deployment is ready.

## What it does

Medi-Clinic is a role-based clinic workflow demo for managing appointments,
invoices, customers, and pharmacy inventory. Patients request appointments;
doctors manage availability and prescriptions; pharmacy staff handle stock and
dispensing.

## Demo login

Admin: `admin@nextmail.com` / `123456`  
Patient: `user@nextmail.com` / `123456`

These seeded accounts and all sample data are for demos only. Do not use real
patient information. Rotate or replace demo credentials before exposing a public
deployment.

## Run locally

1. Install dependencies: `pnpm install`.
2. Copy `.env.example` to `.env.local` and set `POSTGRES_URL` and `AUTH_SECRET`.
3. Start the app: `pnpm dev`.
4. Open `http://localhost:3000/seed` once to initialize/update demo tables.
5. Sign in at `/login` with either demo account above.

Optional configuration uses the variable names `PAYMENTS_MODE`, `APP_URL`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and
`RESEND_FROM_EMAIL`. Never put secret values in this README.

## Tech stack

Next.js App Router and TypeScript provide server-rendered pages and server
actions. Auth.js handles sign-in and role checks. Supabase PostgreSQL stores the
clinic data. Tailwind CSS styles the interface. Local payment simulation keeps
the demo runnable without payment-provider accounts.

## Known limitations

- The dashboard includes the revenue chart plus new-patient growth and
  completed-versus-no-show charts; chart interpretations use demo seed data.
- Admins can manage patient-role accounts and create appointments from a filtered
  patient selector.
- Supabase RLS policies are installed by `/seed`, but the app's PostgreSQL
  connection uses a privileged database role and bypasses RLS. RLS is not yet
  the app's data-isolation boundary; server-side authorization remains in use.
- The site is a demo, not a compliant production system for real patient data.
- Real Stripe and Resend flows require provider credentials and webhook setup.

## What I would do next

1. Make app queries enforce per-user access through Supabase-authenticated
  requests, then verify isolation end to end.
2. Complete local and production smoke tests, including RLS with two users.
3. Replace demo credentials and sample data before any real clinic deployment.

## Smoke test

- [ ] Production URL loads signed out and after sign-in; replace the URL above.
- [ ] README has run steps and demo credentials; add the live URL after deploy.
- [ ] Verify signed-out dashboard redirects on the production URL.
- [x] Patient accounts support create, edit, delete, and list in the admin Users page.
- [x] Appointments reference patient-role users and staff booking includes a patient selector.
- [ ] RLS is proven with two users and a denied cross-user insert.
- [x] Chart 1 asks whether the practice is growing, labels its axes, and starts at zero.
- [x] Chart 2 is a labeled completed/no-show donut answering a different question.
- [ ] `PROPOSAL.md` and `DEMO.md` are committed and present on GitHub.
- [ ] Record a 60–90 second backup demo.
- [ ] Production deployment and all smoke checks are verified.

## RLS verification

After running `/seed`, create a second patient in the admin Users page. In the
Supabase SQL Editor, replace the placeholders below with two different patient
IDs and the seeded doctor's ID. The insert should fail with SQLSTATE `42501`:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<PATIENT_TWO_ID>', true);
INSERT INTO appointments (
  patient_id, doctor_id, appointment_date, start_time,
  duration_minutes, visit_type
) VALUES (
  '<PATIENT_ONE_ID>', '<DOCTOR_ID>', CURRENT_DATE + 1, '10:00', 30, 'routine'
);
ROLLBACK;
```

This checks the database policy. Because the application connects with the
privileged `POSTGRES_URL`, it does not prove that application requests are
isolated by RLS.

## Deployment notes

The `/seed` route is local-only and returns 404 in production. Seed a dedicated
demo database before deploying. Set the variable names listed above in the host
environment; never commit `.env` or `.env.local`.
