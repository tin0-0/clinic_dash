# Medi-Clinic Dashboard

A Next.js clinic dashboard with Auth.js credentials login, role-protected
workspaces, appointment scheduling, and pharmacy inventory and dispensing flows.

## Run locally

1. Install dependencies with `pnpm install`.
2. Set `POSTGRES_URL` in `.env.local` to a PostgreSQL connection string.
3. Start the app with `pnpm dev`.
4. Open `/seed` once to initialize the database tables and sample data.
4. Open `/seed` to initialize or update the database tables and sample data. It
	can be run again after app schema changes.
5. Sign in at `/login` with the seeded local admin account to access the dashboard,
   invoices, and customers:
	- Email: `admin@nextmail.com`
	- Password: `123456`
   The seeded patient account for appointment testing is `user@nextmail.com` with
   password `123456`. The seeded doctor account is `doctor@nextmail.com` with
   password `123456`. Pharmacy demo accounts use password `123456`:
	- Stocker: `stocker@nextmail.com`
	- Pharmacist: `pharmacist@nextmail.com`

The seeded credentials are for local development only. Do not use them in a
deployed environment. Existing users receive the `patient` role when the seed
route adds the `users.role` column. Patients can register at `/register`. Admins
can assign staff roles from the Users page; users need to sign in again for role
changes to take effect.

## Roles and routes

| Role | Workspace | Access |
| --- | --- | --- |
| `admin` | `/dashboard` | Dashboard, revenue chart, invoices, customers, users, and appointment queue |
| `doctor` | `/dashboard/doctor` | Manage weekly hours; `/dashboard/appointments` for the clinical queue |
| `patient` | `/dashboard/user` | Personal appointment workflow |
| `pharmacy_reception` | `/dashboard/pharmacy/reception` | Redirects to the appointment queue |
| `pharmacy_stocker` | `/dashboard/pharmacy/stock` | Add medicines and receive stock |
| `pharmacist` | `/dashboard/pharmacy/pharmacist` | Dispense prescriptions from available stock |

All signed-in roles have a personal notifications inbox at `/dashboard/notifications`.

Unauthenticated dashboard requests go to `/login`. Authenticated users without
the required role go to `/unauthorized`. The role is stored in the database and
copied into the Auth.js JWT/session; changing a role takes effect after signing
in again.

## Appointment workflow

Patients can request an appointment by selecting a doctor, visit
type, date, and start time. Visit types assign durations of 15, 20, 30, 40, or
45 minutes. The server rejects past appointments, overlapping bookings, and
bookings beyond the configured 20 appointments per doctor per day. Patients can
cancel future scheduled appointments. Doctors see their own queue; admins and
reception staff can see the clinic queue and update appointment status.

Availability: doctors can set recurring weekly working hours. Patients can only
book times that fit within those hours. The demo doctor is seeded Monday to
Friday, 09:00 to 17:00.

Pharmacy: stockers can add medicines and receive stock. Doctors can prescribe
medication from an appointment, and pharmacists can dispense prescriptions when
inventory is sufficient. Dispensing updates stock transactionally.

The dashboard currently has a revenue bar chart; the brief does not specify a
pie chart. Local development defaults to simulated payments: admins can mark
invoices paid in the simulator, and patients can simulate wallet top-ups without
charging a card. For real USD payments, Stripe Checkout handles invoice payments
and wallet top-ups. Resend sends invoice payment links.

## Database setup

doctor availability, pharmacy inventory, prescriptions, and notifications. It
deployment. The app uses PostgreSQL through the `POSTGRES_URL` environment
The `/seed` route initializes users, customers, invoices, revenue, appointments,
doctor availability, pharmacy inventory, prescriptions, notifications, and
payment records. It is intended only for local setup; do not expose the seed
route in a production deployment. The app uses PostgreSQL through the
`POSTGRES_URL` environment variable.

## Payment and email setup

1. For local demos, set `PAYMENTS_MODE=simulated` in `.env.local`. No Stripe
	account, Stripe CLI, Resend account, or payment credentials are needed. The
	simulator is disabled outside development and clearly labels fake payments.
2. To test real payments, set `PAYMENTS_MODE=stripe` and use a Stripe test-mode
	secret key for `STRIPE_SECRET_KEY`.
3. Install Stripe CLI and run
	`stripe listen --forward-to localhost:3000/api/stripe/webhook`. Set its
	printed signing secret as `STRIPE_WEBHOOK_SECRET`.
4. To send real invoice emails, create a Resend API key and verify a sending
	domain. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to the key and a sender
	on that verified domain.
5. Set `APP_URL` to the app's origin. Use `http://localhost:3000` locally.

Invoice emails contain a Stripe Checkout link. Wallet top-ups are credited only
after a valid Stripe webhook; patients can spend wallet credit on pending
invoices associated with their registered email. The webhook must be reachable
by Stripe for payments to be fulfilled.
