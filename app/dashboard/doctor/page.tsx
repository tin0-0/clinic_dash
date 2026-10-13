import { auth } from '@/auth';
import postgres from 'postgres';
import { redirect } from 'next/navigation';
import AvailabilityForm from '@/app/ui/appointments/availability-form';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

export default async function DoctorDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'admin') redirect('/dashboard/appointments');
  if (session.user.role !== 'doctor') redirect('/unauthorized');

  const availability = await sql<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }[]>`
    SELECT day_of_week, start_time::text, end_time::text, is_available
    FROM doctor_availability
    WHERE doctor_id = ${session.user.id}
    ORDER BY day_of_week
  `;

  return (
    <main className="max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-medium text-blue-700">Doctor workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-950">Weekly availability</h1>
        <p className="mt-2 text-sm text-gray-600">
          Patients can book only when a visit fits inside your working hours.
        </p>
      </header>
      <AvailabilityForm availability={availability} />
    </main>
  );
}