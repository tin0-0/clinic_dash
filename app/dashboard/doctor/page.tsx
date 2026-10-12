import { redirect } from 'next/navigation';

export default function DoctorDashboardPage() {
  redirect('/dashboard/appointments');
}