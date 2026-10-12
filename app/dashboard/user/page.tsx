import { redirect } from 'next/navigation';

export default function PatientDashboardPage() {
  redirect('/dashboard/appointments');
}