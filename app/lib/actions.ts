'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';
import { appointmentStatuses, visitTypes, weekdays } from '@/app/lib/appointments';
import { Resend } from 'resend';
import { getAppUrl, getStripe } from '@/app/lib/stripe';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true, id: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Insert data into the database
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}

export async function registerUser(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  }).refine((fields) => fields.password === fields.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  }).safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Check the registration details.';

  const { name, email, password } = parsed.data;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const created = await sql.begin(async (transaction) => {
      const inserted = await transaction<{ id: string }[]>`
        INSERT INTO users (name, email, password, role)
        VALUES (${name}, ${email}, ${hashedPassword}, 'patient')
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `;
      if (inserted.length === 0) return false;
      await transaction`
        INSERT INTO wallet_accounts (user_id) VALUES (${inserted[0].id})
      `;
      return true;
    });
    if (!created) return 'An account with that email already exists.';
  } catch (error) {
    console.error('Failed to register patient:', error);
    return 'Could not create your account. Please try again.';
  }

  redirect('/login?registered=1');
}

export async function updateUserRole(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== 'admin') return;

  const parsed = z.object({
    userId: z.string().uuid(),
    role: z.enum([
      'admin',
      'doctor',
      'patient',
      'pharmacy_reception',
      'pharmacy_stocker',
      'pharmacist',
    ]),
  }).safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  });
  if (!parsed.success || parsed.data.userId === session.user.id) return;

  await sql`
    UPDATE users SET role = ${parsed.data.role}
    WHERE id = ${parsed.data.userId}
  `;
  revalidatePath('/dashboard/users');
}

export async function markNotificationRead(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const notificationId = z.string().uuid().safeParse(formData.get('notificationId'));
  if (!notificationId.success) return;

  await sql`
    UPDATE notifications SET read_at = COALESCE(read_at, NOW())
    WHERE id = ${notificationId.data} AND recipient_id = ${session.user.id}
  `;
  revalidatePath('/dashboard/notifications');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);
}

export async function sendInvoiceEmail(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (session?.user.role !== 'admin') return 'Only administrators can email invoices.';

  const invoiceId = z.string().uuid().safeParse(formData.get('invoiceId'));
  if (!invoiceId.success) return 'Invalid invoice.';
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return 'Configure RESEND_API_KEY and RESEND_FROM_EMAIL to send invoices.';

  let stripe: ReturnType<typeof getStripe>;
  let appUrl: string;
  try {
    stripe = getStripe();
    appUrl = getAppUrl();
  } catch (error) {
    return error instanceof Error ? error.message : 'Stripe is not configured.';
  }

  const [invoice] = await sql<{
    id: string;
    amount: number;
    status: string;
    customer_name: string;
    customer_email: string;
  }[]>`
    SELECT invoices.id, invoices.amount, invoices.status,
      customers.name AS customer_name, customers.email AS customer_email
    FROM invoices
    JOIN customers ON customers.id = invoices.customer_id
    WHERE invoices.id = ${invoiceId.data}
  `;
  if (!invoice) return 'Invoice not found.';
  if (invoice.status !== 'pending') return 'Only pending invoices can be emailed for payment.';
  if (!Number.isInteger(invoice.amount) || invoice.amount <= 0) return 'Invoice amount must be greater than zero.';

  let checkout: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: invoice.customer_email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: invoice.amount,
          product_data: { name: `Clinic invoice for ${invoice.customer_name}` },
        },
      }],
      metadata: { kind: 'invoice', invoiceId: invoice.id },
      success_url: `${appUrl}/dashboard/invoices?payment=success`,
      cancel_url: `${appUrl}/dashboard/invoices?payment=cancelled`,
    });
  } catch (error) {
    console.error('Failed to create invoice checkout:', error);
    return 'Could not create Stripe checkout. Check the Stripe configuration.';
  }
  if (!checkout.url) return 'Stripe did not return a checkout URL.';

  try {
    await sql`
      INSERT INTO invoice_payments (invoice_id, stripe_session_id, amount_cents)
      VALUES (${invoice.id}, ${checkout.id}, ${invoice.amount})
    `;
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: invoice.customer_email,
      subject: `Clinic invoice payment request`,
      html: `<p>Hello ${escapeHtml(invoice.customer_name)},</p><p>Your clinic invoice for $${(invoice.amount / 100).toFixed(2)} is ready.</p><p><a href="${checkout.url}">Review and pay invoice</a></p><p>This secure payment link expires in 24 hours.</p>`,
    });
    if (result.error) throw new Error(result.error.message);
  } catch (error) {
    console.error('Failed to email invoice:', error);
    await stripe.checkout.sessions.expire(checkout.id).catch(() => undefined);
    await sql`DELETE FROM invoice_payments WHERE stripe_session_id = ${checkout.id}`;
    return 'Could not send the invoice email. Check the Resend sender configuration.';
  }

  revalidatePath('/dashboard/invoices');
  return `Payment link sent to ${invoice.customer_email}.`;
}

export async function createWalletTopUp(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (session?.user.role !== 'patient') return 'Only patient accounts can use a wallet.';
  const parsedAmount = z.coerce.number().min(10).max(500).multipleOf(0.01).safeParse(formData.get('amount'));
  if (!parsedAmount.success) return 'Choose a top-up amount between $10 and $500.';

  let stripe: ReturnType<typeof getStripe>;
  let appUrl: string;
  try {
    stripe = getStripe();
    appUrl = getAppUrl();
  } catch (error) {
    return error instanceof Error ? error.message : 'Stripe is not configured.';
  }

  const amountCents = Math.round(parsedAmount.data * 100);
  let checkoutUrl: string;
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: session.user.email ?? undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: 'Clinic wallet top-up' },
        },
      }],
      metadata: {
        kind: 'wallet_top_up',
        userId: session.user.id,
        amountCents: String(amountCents),
      },
      success_url: `${appUrl}/dashboard/wallet?topup=success`,
      cancel_url: `${appUrl}/dashboard/wallet?topup=cancelled`,
    });
    if (!checkout.url) return 'Stripe did not return a checkout URL.';
    checkoutUrl = checkout.url;
  } catch (error) {
    console.error('Failed to create wallet checkout:', error);
    return 'Could not start wallet top-up. Check the Stripe configuration.';
  }
  redirect(checkoutUrl);
}

export async function payInvoiceWithWallet(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (session?.user.role !== 'patient') return 'Only patient accounts can pay with a wallet.';
  const invoiceId = z.string().uuid().safeParse(formData.get('invoiceId'));
  if (!invoiceId.success) return 'Invalid invoice.';

  try {
    await sql.begin(async (transaction) => {
      const invoices = await transaction`
        SELECT invoices.amount
        FROM invoices
        JOIN customers ON customers.id = invoices.customer_id
        WHERE invoices.id = ${invoiceId.data}
          AND customers.email = ${session.user.email}
          AND invoices.status = 'pending'
        FOR UPDATE OF invoices
      `;
      if (!invoices[0]) throw new Error('INVOICE_UNAVAILABLE');

      const openCheckouts = await transaction`
        SELECT id FROM invoice_payments
        WHERE invoice_id = ${invoiceId.data} AND status = 'pending'
      `;
      if (openCheckouts.length > 0) throw new Error('STRIPE_CHECKOUT_PENDING');

      const wallets = await transaction`
        SELECT balance_cents FROM wallet_accounts
        WHERE user_id = ${session.user.id}
        FOR UPDATE
      `;
      if (!wallets[0] || wallets[0].balance_cents < invoices[0].amount) {
        throw new Error('INSUFFICIENT_WALLET_BALANCE');
      }

      await transaction`
        UPDATE wallet_accounts
        SET balance_cents = balance_cents - ${invoices[0].amount}, updated_at = NOW()
        WHERE user_id = ${session.user.id}
      `;
      const paid = await transaction`
        UPDATE invoices SET status = 'paid'
        WHERE id = ${invoiceId.data} AND status = 'pending'
        RETURNING id
      `;
      if (paid.length === 0) throw new Error('INVOICE_UNAVAILABLE');

      await transaction`
        INSERT INTO wallet_transactions (user_id, amount_cents, transaction_type, invoice_id)
        VALUES (${session.user.id}, ${invoices[0].amount}, 'invoice_payment', ${invoiceId.data})
      `;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_WALLET_BALANCE') {
      return 'Your wallet balance is too low to pay this invoice.';
    }
    if (error instanceof Error && error.message === 'INVOICE_UNAVAILABLE') {
      return 'This invoice is unavailable or has already been paid.';
    }
    if (error instanceof Error && error.message === 'STRIPE_CHECKOUT_PENDING') {
      return 'An emailed card-payment link is still active for this invoice. Wait for it to expire before using wallet credit.';
    }
    console.error('Failed to pay invoice from wallet:', error);
    return 'Could not pay this invoice. Please try again.';
  }

  revalidatePath('/dashboard/wallet');
  revalidatePath('/dashboard/invoices');
  return 'Invoice paid from your wallet.';
}

export async function addMedication(formData: FormData) {
  const session = await auth();
  if (!session?.user || !['admin', 'pharmacy_stocker'].includes(session.user.role)) return;

  const parsed = z.object({
    name: z.string().trim().min(1).max(160),
    sku: z.string().trim().min(1).max(60),
    quantity: z.coerce.number().int().min(0),
    reorderLevel: z.coerce.number().int().min(0),
    expirationDate: z.string().optional(),
  }).safeParse({
    name: formData.get('name'),
    sku: formData.get('sku'),
    quantity: formData.get('quantity'),
    reorderLevel: formData.get('reorderLevel'),
    expirationDate: formData.get('expirationDate') || null,
  });
  if (!parsed.success) return;

  const { name, sku, quantity, reorderLevel, expirationDate } = parsed.data;
  await sql`
    INSERT INTO medications (name, sku, quantity, reorder_level, expiration_date)
    VALUES (${name}, ${sku}, ${quantity}, ${reorderLevel}, ${expirationDate || null})
    ON CONFLICT (sku) DO NOTHING
  `;
  revalidatePath('/dashboard/pharmacy/stock');
}

export async function receiveMedicationStock(formData: FormData) {
  const session = await auth();
  if (!session?.user || !['admin', 'pharmacy_stocker'].includes(session.user.role)) return;

  const parsed = z.object({
    medicationId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(100000),
  }).safeParse({
    medicationId: formData.get('medicationId'),
    quantity: formData.get('quantity'),
  });
  if (!parsed.success) return;

  await sql`
    UPDATE medications
    SET quantity = quantity + ${parsed.data.quantity}, updated_at = NOW()
    WHERE id = ${parsed.data.medicationId}
  `;
  revalidatePath('/dashboard/pharmacy/stock');
  revalidatePath('/dashboard/pharmacy/pharmacist');
}

export async function createPrescription(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== 'doctor') return;

  const parsed = z.object({
    appointmentId: z.string().uuid(),
    medicationId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(1000),
    dosage: z.string().trim().min(1).max(240),
  }).safeParse({
    appointmentId: formData.get('appointmentId'),
    medicationId: formData.get('medicationId'),
    quantity: formData.get('quantity'),
    dosage: formData.get('dosage'),
  });
  if (!parsed.success) return;

  const { appointmentId, medicationId, quantity, dosage } = parsed.data;
  const appointment = await sql<{ patient_id: string }[]>`
    SELECT patient_id FROM appointments
    WHERE id = ${appointmentId}
      AND doctor_id = ${session.user.id}
      AND status <> 'cancelled'
  `;
  if (!appointment[0]) return;

  await sql`
    INSERT INTO prescriptions (
      appointment_id, patient_id, doctor_id, medication_id, quantity, dosage
    ) VALUES (
      ${appointmentId}, ${appointment[0].patient_id}, ${session.user.id},
      ${medicationId}, ${quantity}, ${dosage}
    )
  `;
  await sql`
    INSERT INTO notifications (recipient_id, title, message, href)
    SELECT id, 'Prescription ready for review', 'A doctor submitted a prescription to the pharmacy queue.', '/dashboard/pharmacy/pharmacist'
    FROM users WHERE role = 'pharmacist'
  `;
  await sql`
    INSERT INTO notifications (recipient_id, title, message, href)
    VALUES (${appointment[0].patient_id}, 'Prescription created', 'Your doctor added a prescription to the pharmacy queue.', '/dashboard/appointments')
  `;
  revalidatePath('/dashboard/appointments');
  revalidatePath('/dashboard/pharmacy/pharmacist');
}

export async function dispensePrescription(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user || !['admin', 'pharmacist'].includes(session.user.role)) {
    return 'Only pharmacy staff can dispense prescriptions.';
  }

  const prescriptionId = z.string().uuid().safeParse(formData.get('prescriptionId'));
  if (!prescriptionId.success) return 'Invalid prescription.';

  try {
    await sql.begin(async (transaction) => {
      const prescriptions = await transaction`
        SELECT medication_id, quantity
        FROM prescriptions
        WHERE id = ${prescriptionId.data} AND status = 'pending'
        FOR UPDATE
      `;
      if (!prescriptions[0]) throw new Error('PRESCRIPTION_NOT_PENDING');

      const medications = await transaction`
        SELECT quantity FROM medications
        WHERE id = ${prescriptions[0].medication_id}
        FOR UPDATE
      `;
      if (!medications[0] || medications[0].quantity < prescriptions[0].quantity) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      await transaction`
        UPDATE medications
        SET quantity = quantity - ${prescriptions[0].quantity}, updated_at = NOW()
        WHERE id = ${prescriptions[0].medication_id}
      `;
      await transaction`
        UPDATE prescriptions
        SET status = 'dispensed', dispensed_by = ${session.user.id}, dispensed_at = NOW()
        WHERE id = ${prescriptionId.data}
      `;
      await transaction`
        INSERT INTO notifications (recipient_id, title, message, href)
        SELECT patient_id, 'Prescription dispensed', 'Your prescription has been dispensed.', '/dashboard/appointments'
        FROM prescriptions WHERE id = ${prescriptionId.data}
      `;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
      return 'Not enough stock to dispense this prescription.';
    }
    if (error instanceof Error && error.message === 'PRESCRIPTION_NOT_PENDING') {
      return 'This prescription has already been handled.';
    }
    console.error('Failed to dispense prescription:', error);
    return 'Could not dispense this prescription. Please try again.';
  }

  revalidatePath('/dashboard/pharmacy/pharmacist');
  revalidatePath('/dashboard/pharmacy/stock');
  return undefined;
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export type AppointmentActionState = {
  message?: string | null;
};

export type AvailabilityActionState = {
  message?: string | null;
};

export async function saveDoctorAvailability(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const session = await auth();
  if (session?.user.role !== 'doctor') {
    return { message: 'Only doctor accounts can update working hours.' };
  }

  const schedule = weekdays.map(({ value, label }) => {
    const startValue = formData.get(`start_${value}`);
    const endValue = formData.get(`end_${value}`);
    return {
      dayOfWeek: value,
      label,
      isAvailable: formData.get(`available_${value}`) === 'on',
      startTime: typeof startValue === 'string' ? startValue : '',
      endTime: typeof endValue === 'string' ? endValue : '',
    };
  });
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  for (const day of schedule) {
    if (
      !timePattern.test(day.startTime) ||
      !timePattern.test(day.endTime) ||
      (day.isAvailable && day.startTime >= day.endTime)
    ) {
      return { message: `Check the working hours entered for ${day.label}.` };
    }
  }

  try {
    await sql.begin(async (transaction) => {
      for (const day of schedule) {
        await transaction`
          INSERT INTO doctor_availability (
            doctor_id, day_of_week, start_time, end_time, is_available
          ) VALUES (
            ${session.user.id}, ${day.dayOfWeek}, ${day.startTime}, ${day.endTime}, ${day.isAvailable}
          )
          ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            is_available = EXCLUDED.is_available
        `;
      }
    });
  } catch (error) {
    console.error('Failed to update doctor availability:', error);
    return { message: 'Could not save working hours. Please try again.' };
  }

  revalidatePath('/dashboard/doctor');
  revalidatePath('/dashboard/appointments');
  return { message: 'Working hours saved.' };
}

const AppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  visitType: z.enum(visitTypes.map(({ value }) => value) as [string, ...string[]]),
});

export async function createAppointment(
  _prevState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const session = await auth();
  if (
    session?.user.role !== 'patient'
  ) {
    return { message: 'Only patient accounts can book appointments.' };
  }

  const parsed = AppointmentSchema.safeParse({
    doctorId: formData.get('doctorId'),
    appointmentDate: formData.get('appointmentDate'),
    startTime: formData.get('startTime'),
    visitType: formData.get('visitType'),
  });
  if (!parsed.success) return { message: 'Check the appointment details and try again.' };

  const { doctorId, appointmentDate, startTime, visitType } = parsed.data;
  const visit = visitTypes.find((item) => item.value === visitType);
  if (!visit) return { message: 'Select a valid visit type.' };

  try {
    await sql.begin(async (transaction) => {
      await transaction`
        SELECT pg_advisory_xact_lock(hashtext(${doctorId}), hashtext(${appointmentDate}))
      `;

      const doctors = await transaction`
        SELECT id FROM users WHERE id = ${doctorId} AND role = 'doctor'
      `;
      if (doctors.length === 0) throw new Error('DOCTOR_NOT_FOUND');

      const dates = await transaction`
        SELECT (
          ${appointmentDate}::date > CURRENT_DATE OR
          (${appointmentDate}::date = CURRENT_DATE AND ${startTime}::time > LOCALTIME)
        ) AS is_future
      `;
      if (!dates[0].is_future) throw new Error('APPOINTMENT_NOT_FUTURE');

      const withinWorkingHours = await transaction`
        SELECT EXISTS (
          SELECT 1
          FROM doctor_availability
          WHERE doctor_id = ${doctorId}
            AND day_of_week = EXTRACT(DOW FROM ${appointmentDate}::date)::int
            AND is_available
            AND start_time <= ${startTime}::time
            AND end_time >= ${startTime}::time + ${visit.duration} * INTERVAL '1 minute'
        ) AS allowed
      `;
      if (!withinWorkingHours[0].allowed) throw new Error('OUTSIDE_WORKING_HOURS');

      const dailyBookings = await transaction`
        SELECT COUNT(*)::int AS count
        FROM appointments
        WHERE doctor_id = ${doctorId}
          AND appointment_date = ${appointmentDate}
          AND status <> 'cancelled'
      `;
      if (dailyBookings[0].count >= 20) throw new Error('DAILY_LIMIT_REACHED');

      const conflicts = await transaction`
        SELECT id
        FROM appointments
        WHERE doctor_id = ${doctorId}
          AND appointment_date = ${appointmentDate}
          AND status <> 'cancelled'
          AND start_time < ${startTime}::time + ${visit.duration} * INTERVAL '1 minute'
          AND start_time + duration_minutes * INTERVAL '1 minute' > ${startTime}::time
        LIMIT 1
      `;
      if (conflicts.length > 0) throw new Error('TIME_SLOT_UNAVAILABLE');

      await transaction`
        INSERT INTO appointments (
          patient_id, doctor_id, appointment_date, start_time,
          duration_minutes, visit_type
        ) VALUES (
          ${session.user.id}, ${doctorId}, ${appointmentDate}, ${startTime},
          ${visit.duration}, ${visitType}
        )
      `;
      await transaction`
        INSERT INTO notifications (recipient_id, title, message, href)
        VALUES
          (${session.user.id}, 'Appointment requested', 'Your appointment request was added to the clinic queue.', '/dashboard/appointments'),
          (${doctorId}, 'New appointment request', 'A patient requested an appointment during your working hours.', '/dashboard/appointments')
      `;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const messages: Record<string, string> = {
      DOCTOR_NOT_FOUND: 'That doctor is no longer available.',
      APPOINTMENT_NOT_FUTURE: 'Choose a future date and time.',
      OUTSIDE_WORKING_HOURS: 'That doctor is not available for the selected time.',
      DAILY_LIMIT_REACHED: 'This doctor has reached the daily booking limit.',
      TIME_SLOT_UNAVAILABLE: 'That time overlaps another appointment. Choose another time.',
    };
    return { message: messages[code] ?? 'Could not save the appointment. Please try again.' };
  }

  revalidatePath('/dashboard/appointments');
  return { message: 'Appointment saved and added to the clinic queue.' };
}

export async function updateAppointmentStatus(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const appointmentId = z.string().uuid().safeParse(formData.get('appointmentId'));
  const status = z.enum(appointmentStatuses).safeParse(formData.get('status'));
  if (!appointmentId.success || !status.success) return;

  const { role, id } = session.user;
  if (role === 'patient') {
    if (status.data !== 'cancelled') return;
    const changed = await sql<{ doctor_id: string }[]>`
      UPDATE appointments
      SET status = 'cancelled'
      WHERE id = ${appointmentId.data}
        AND patient_id = ${id}
        AND status IN ('scheduled', 'confirmed')
        AND (appointment_date > CURRENT_DATE OR
          (appointment_date = CURRENT_DATE AND start_time > LOCALTIME))
      RETURNING doctor_id
    `;
    if (changed[0]) {
      await sql`
        INSERT INTO notifications (recipient_id, title, message, href)
        VALUES (${changed[0].doctor_id}, 'Appointment cancelled', 'A patient cancelled an upcoming appointment.', '/dashboard/appointments')
      `;
    }
  } else if (role === 'admin' || role === 'pharmacy_reception') {
    const changed = await sql<{ patient_id: string }[]>`
      UPDATE appointments SET status = ${status.data}
      WHERE id = ${appointmentId.data}
      RETURNING patient_id
    `;
    if (changed[0]) {
      await sql`
        INSERT INTO notifications (recipient_id, title, message, href)
        VALUES (${changed[0].patient_id}, 'Appointment updated', ${`Your appointment status is now ${status.data.replace('_', ' ')}.`}, '/dashboard/appointments')
      `;
    }
  } else if (role === 'doctor') {
    const changed = await sql<{ patient_id: string }[]>`
      UPDATE appointments SET status = ${status.data}
      WHERE id = ${appointmentId.data} AND doctor_id = ${id}
      RETURNING patient_id
    `;
    if (changed[0]) {
      await sql`
        INSERT INTO notifications (recipient_id, title, message, href)
        VALUES (${changed[0].patient_id}, 'Appointment updated', ${`Your appointment status is now ${status.data.replace('_', ' ')}.`}, '/dashboard/appointments')
      `;
    }
  } else {
    return;
  }

  revalidatePath('/dashboard/appointments');
}
