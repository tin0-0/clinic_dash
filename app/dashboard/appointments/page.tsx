import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import BookingForm from '@/app/ui/appointments/booking-form';
import AppointmentList, { type AppointmentRow } from '@/app/ui/appointments/appointment-list';
import type { UserRole } from '@/app/lib/definitions';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role as UserRole;
  const isPatient = role === 'patient';
  const canSeeAppointments = !['pharmacy_stocker', 'pharmacist'].includes(role);
  let appointments: AppointmentRow[] = [];
  let doctors: { id: string; name: string }[] = [];
  let patients: { id: string; name: string; email: string }[] = [];
  let medications: { id: string; name: string }[] = [];

  if (canSeeAppointments) {
    if (role === 'patient') {
      appointments = await sql<AppointmentRow[]>`
        SELECT a.id, a.patient_id, patient.name AS patient_name, doctor.name AS doctor_name,
          a.appointment_date::text, to_char(a.start_time, 'HH24:MI') AS start_time,
          a.duration_minutes, a.visit_type, a.status
        FROM appointments a
        JOIN users patient ON patient.id = a.patient_id
        JOIN users doctor ON doctor.id = a.doctor_id
        WHERE a.patient_id = ${session.user.id}
        ORDER BY a.appointment_date, a.start_time
      `;
      doctors = await sql<{ id: string; name: string }[]>`
        SELECT id, name FROM users WHERE role = 'doctor' ORDER BY name
      `;
    } else if (role === 'doctor') {
      medications = await sql<{ id: string; name: string }[]>`
        SELECT id, name FROM medications ORDER BY name
      `;
      appointments = await sql<AppointmentRow[]>`
        SELECT a.id, a.patient_id, patient.name AS patient_name, doctor.name AS doctor_name,
          a.appointment_date::text, to_char(a.start_time, 'HH24:MI') AS start_time,
          a.duration_minutes, a.visit_type, a.status
        FROM appointments a
        JOIN users patient ON patient.id = a.patient_id
        JOIN users doctor ON doctor.id = a.doctor_id
        WHERE a.doctor_id = ${session.user.id}
        ORDER BY a.appointment_date, a.start_time
      `;
    } else {
      if (role === 'admin' || role === 'pharmacy_reception') {
        [doctors, patients] = await Promise.all([
          sql<{ id: string; name: string }[]>`
            SELECT id, name FROM users WHERE role = 'doctor' ORDER BY name
          `,
          sql<{ id: string; name: string; email: string }[]>`
            SELECT id, name, email FROM users WHERE role = 'patient' ORDER BY name
          `,
        ]);
      }
      appointments = await sql<AppointmentRow[]>`
        SELECT a.id, a.patient_id, patient.name AS patient_name, doctor.name AS doctor_name,
          a.appointment_date::text, to_char(a.start_time, 'HH24:MI') AS start_time,
          a.duration_minutes, a.visit_type, a.status
        FROM appointments a
        JOIN users patient ON patient.id = a.patient_id
        JOIN users doctor ON doctor.id = a.doctor_id
        ORDER BY a.appointment_date, a.start_time
      `;
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-medium text-blue-700">Clinic operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-950">Appointments</h1>
      </header>

      {(isPatient || role === 'admin' || role === 'pharmacy_reception') && (
        <section className="max-w-2xl border-b border-gray-200 pb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {isPatient ? 'Request an appointment' : 'Create appointment for patient'}
          </h2>
          <BookingForm doctors={doctors} patients={patients} allowPatientSelect={!isPatient} today={today} />
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {role === 'doctor' ? 'My clinical queue' : isPatient ? 'My appointments' : 'Appointment queue'}
          </h2>
          <span className="text-sm text-gray-500">{appointments.length} records</span>
        </div>
        {!canSeeAppointments ? (
          <p className="py-8 text-sm text-gray-600">This workspace does not include appointment access.</p>
        ) : (
          <AppointmentList appointments={appointments} role={role} medications={medications} />
        )}
      </section>
    </main>
  );
}