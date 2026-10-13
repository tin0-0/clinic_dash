import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';
import { weekdays } from '../lib/appointments';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

async function seedUsers() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'patient'
    );
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'patient';
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (id, name, email, password, role)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword}, ${user.role})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );

  return insertedUsers;
}

async function seedInvoices() {
  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        SELECT ${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date}
        WHERE NOT EXISTS (
          SELECT 1 FROM invoices
          WHERE customer_id = ${invoice.customer_id}
            AND amount = ${invoice.amount}
            AND status = ${invoice.status}
            AND date = ${invoice.date}
        );
      `,
    ),
  );

  return insertedInvoices;
}

async function seedCustomers() {
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedCustomers;
}

async function seedRevenue() {
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `,
    ),
  );

  return insertedRevenue;
}

async function seedAppointments() {
  await sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      patient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      appointment_date DATE NOT NULL,
      start_time TIME NOT NULL,
      duration_minutes INT NOT NULL,
      visit_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS appointments_doctor_date_idx
    ON appointments (doctor_id, appointment_date, status);`;
  await sql`CREATE INDEX IF NOT EXISTS appointments_patient_date_idx
    ON appointments (patient_id, appointment_date, status);`;
}

async function seedDoctorAvailability() {
  await sql`
    CREATE TABLE IF NOT EXISTS doctor_availability (
      doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      PRIMARY KEY (doctor_id, day_of_week),
      CHECK (start_time < end_time)
    );
  `;

  await Promise.all(
    weekdays
      .filter(({ value }) => value >= 1 && value <= 5)
      .map((weekday) => sql`
        INSERT INTO doctor_availability (
          doctor_id, day_of_week, start_time, end_time, is_available
        )
        SELECT id, ${weekday.value}, '09:00'::time, '17:00'::time, TRUE
        FROM users
        WHERE email = 'doctor@nextmail.com' AND role = 'doctor'
        ON CONFLICT (doctor_id, day_of_week) DO NOTHING;
      `),
  );
}

async function seedPharmacy() {
  await sql`
    CREATE TABLE IF NOT EXISTS medications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(160) NOT NULL,
      sku VARCHAR(60) NOT NULL UNIQUE,
      quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      reorder_level INT NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
      expiration_date DATE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      patient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
      quantity INT NOT NULL CHECK (quantity > 0),
      dosage VARCHAR(240) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'dispensed', 'cancelled')),
      dispensed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      dispensed_at TIMESTAMPTZ
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS prescriptions_status_created_idx
    ON prescriptions (status, created_at);`;

  await Promise.all([
    sql`INSERT INTO medications (name, sku, quantity, reorder_level)
      VALUES ('Acetaminophen 500 mg', 'ACET-500', 100, 20)
      ON CONFLICT (sku) DO NOTHING`,
    sql`INSERT INTO medications (name, sku, quantity, reorder_level)
      VALUES ('Amoxicillin 500 mg', 'AMOX-500', 60, 12)
      ON CONFLICT (sku) DO NOTHING`,
    sql`INSERT INTO medications (name, sku, quantity, reorder_level)
      VALUES ('Ibuprofen 200 mg', 'IBU-200', 80, 16)
      ON CONFLICT (sku) DO NOTHING`,
  ]);
}

async function seedNotifications() {
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(120) NOT NULL,
      message VARCHAR(320) NOT NULL,
      href TEXT NOT NULL DEFAULT '/dashboard/notifications',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
    ON notifications (recipient_id, created_at DESC);`;
}

async function seedPayments() {
  await sql`
    CREATE TABLE IF NOT EXISTS wallet_accounts (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance_cents INT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents INT NOT NULL CHECK (amount_cents > 0),
      transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('top_up', 'invoice_payment')),
      invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
      stripe_session_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      stripe_session_id TEXT NOT NULL UNIQUE,
      amount_cents INT NOT NULL CHECK (amount_cents > 0),
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'expired')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      event_id TEXT PRIMARY KEY,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    INSERT INTO wallet_accounts (user_id)
    SELECT id FROM users ON CONFLICT (user_id) DO NOTHING
  `;
}

export async function GET() {
  try {
    await seedUsers();
    await seedDoctorAvailability();
    await Promise.all([seedCustomers(), seedInvoices(), seedRevenue()]);
    await seedAppointments();
    await seedPharmacy();
    await seedNotifications();
    await seedPayments();

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Failed to seed database:', error);
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Failed to seed database.';
    return Response.json({ error: message }, { status: 500 });
  }
}
