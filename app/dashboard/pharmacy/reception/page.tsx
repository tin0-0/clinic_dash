import { redirect } from 'next/navigation';

export default function PharmacyReceptionPage() {
  redirect('/dashboard/appointments');
}