import {
  appointmentStatuses,
  visitTypes,
  type AppointmentStatus,
} from '@/app/lib/appointments';
import { updateAppointmentStatus } from '@/app/lib/actions';
import type { UserRole } from '@/app/lib/definitions';

export type AppointmentRow = {
  id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  visit_type: string;
  status: AppointmentStatus;
};

const statusStyles: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  checked_in: 'bg-amber-50 text-amber-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-rose-50 text-rose-700',
};

export default function AppointmentList({
  appointments,
  role,
}: {
  appointments: AppointmentRow[];
  role: UserRole;
}) {
  if (appointments.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">No appointments yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-3 font-medium">Date and time</th>
            {role !== 'patient' && <th className="px-3 py-3 font-medium">Patient</th>}
            {role !== 'doctor' && <th className="px-3 py-3 font-medium">Doctor</th>}
            <th className="px-3 py-3 font-medium">Visit</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Update</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {appointments.map((appointment) => {
            const visit = visitTypes.find((item) => item.value === appointment.visit_type);
            return (
              <tr key={appointment.id}>
                <td className="whitespace-nowrap px-3 py-4 text-gray-700">
                  {appointment.appointment_date} · {appointment.start_time.slice(0, 5)}
                  <span className="block text-xs text-gray-500">
                    {appointment.duration_minutes} minutes
                  </span>
                </td>
                {role !== 'patient' && (
                  <td className="px-3 py-4 font-medium text-gray-900">
                    {appointment.patient_name}
                  </td>
                )}
                {role !== 'doctor' && (
                  <td className="px-3 py-4 text-gray-700">{appointment.doctor_name}</td>
                )}
                <td className="px-3 py-4 text-gray-700">
                  {visit?.label ?? appointment.visit_type}
                </td>
                <td className="px-3 py-4">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}>
                    {appointment.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-4">
                  {role === 'patient' ? (
                    ['scheduled', 'confirmed'].includes(appointment.status) ? (
                      <form action={updateAppointmentStatus}>
                        <input type="hidden" name="appointmentId" value={appointment.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button className="text-sm font-medium text-rose-700 hover:underline">
                          Cancel
                        </button>
                      </form>
                    ) : null
                  ) : (
                    <form action={updateAppointmentStatus} className="flex items-center gap-2">
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <select
                        name="status"
                        defaultValue={appointment.status}
                        aria-label={`Update status for ${appointment.patient_name}`}
                        className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs"
                      >
                        {appointmentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                      <button className="font-medium text-blue-700 hover:underline">Save</button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}