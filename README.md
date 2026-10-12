# Medi-Clinic Dashboard

A Next.js clinic dashboard starter with Auth.js credentials login, role-protected
workspaces, and an initial appointment booking and queue workflow.

## Run locally

1. Install dependencies with `pnpm install`.
2. Set `POSTGRES_URL` in `.env.local` to a PostgreSQL connection string.
3. Start the app with `pnpm dev`.
4. Open `/seed` once to initialize the database tables and sample data.
5. Sign in at `/login` with the seeded patient account:
	- Email: `user@nextmail.com`
	- Password: `123456`

The seeded credentials are for local development only. Do not use them in a
deployed environment. Existing users receive the `patient` role when the seed
route adds the `users.role` column. Staff roles must currently be assigned by an
administrator directly in the database.

## Roles and routes

| Role | Workspace | Access |
| --- | --- | --- |
| `admin` | `/dashboard` | Dashboard, invoices, customers, and appointment queue |
| `doctor` | `/dashboard/doctor` | Redirects to the doctor's appointment queue |
| `patient` | `/dashboard/user` | Restricted to `user@nextmail.com`; redirects to personal appointments |
| `pharmacy_reception` | `/dashboard/pharmacy/reception` | Redirects to the appointment queue |
| `pharmacy_stocker` | `/dashboard/pharmacy/stock` | Inventory placeholder |
| `pharmacist` | `/dashboard/pharmacy/pharmacist` | Prescription-queue placeholder |

Unauthenticated dashboard requests go to `/login`. Authenticated users without
the required role go to `/unauthorized`. The role is stored in the database and
copied into the Auth.js JWT/session; changing a role takes effect after signing
in again.

## Appointment workflow

The authorized patient can request an appointment by selecting a doctor, visit
type, date, and start time. Visit types assign durations of 15, 20, 30, 40, or
45 minutes. The server rejects past appointments, overlapping bookings, and
bookings beyond the configured 20 appointments per doctor per day. Patients can
cancel future scheduled appointments. Doctors see their own queue; admins and
reception staff can see the clinic queue and update appointment status.

Doctor availability calendars, working-hour rules, notifications, payments,
wallets, invoices by email, registration, and full pharmacy workflows are not
implemented yet. Appointment creation currently allows any future time that
does not conflict with another booking.

## Database setup

The `/seed` route initializes `users`, `customers`, `invoices`, `revenue`, and
`appointments`. It is intended only for local setup; do not expose the seed
route in a production deployment. The app uses PostgreSQL through the
`POSTGRES_URL` environment variable.
