'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';
import { appointmentStatuses, visitTypes } from '@/app/lib/appointments';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

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
    session?.user.role !== 'patient' ||
    session.user.email !== 'user@nextmail.com'
  ) {
    return { message: 'Only the authorized patient account can book appointments.' };
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
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const messages: Record<string, string> = {
      DOCTOR_NOT_FOUND: 'That doctor is no longer available.',
      APPOINTMENT_NOT_FUTURE: 'Choose a future date and time.',
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

  const { role, id, email } = session.user;
  if (role === 'patient') {
    if (email !== 'user@nextmail.com' || status.data !== 'cancelled') return;
    await sql`
      UPDATE appointments
      SET status = 'cancelled'
      WHERE id = ${appointmentId.data}
        AND patient_id = ${id}
        AND status IN ('scheduled', 'confirmed')
        AND (appointment_date > CURRENT_DATE OR
          (appointment_date = CURRENT_DATE AND start_time > LOCALTIME))
    `;
  } else if (role === 'admin' || role === 'pharmacy_reception') {
    await sql`
      UPDATE appointments SET status = ${status.data}
      WHERE id = ${appointmentId.data}
    `;
  } else if (role === 'doctor') {
    await sql`
      UPDATE appointments SET status = ${status.data}
      WHERE id = ${appointmentId.data} AND doctor_id = ${id}
    `;
  } else {
    return;
  }

  revalidatePath('/dashboard/appointments');
}
