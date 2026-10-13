'use client';

import { useActionState } from 'react';
import { createAppointment, type AppointmentActionState } from '@/app/lib/actions';
import { visitTypes } from '@/app/lib/appointments';

type DoctorOption = {
  id: string;
  name: string;
};

type PatientOption = {
  id: string;
  name: string;
  email: string;
};

export default function BookingForm({
  doctors,
  patients,
  allowPatientSelect,
  today,
}: {
  doctors: DoctorOption[];
  patients: PatientOption[];
  allowPatientSelect: boolean;
  today: string;
}) {
  const initialState: AppointmentActionState = { message: null };
  const [state, formAction, pending] = useActionState(createAppointment, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {allowPatientSelect && (
        <label className="block text-sm font-medium text-gray-700">
          Patient
          <select
            name="patientId"
            required
            disabled={patients.length === 0 || pending}
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm"
          >
            <option value="" disabled>
              {patients.length ? 'Select a patient' : 'No patient accounts available'}
            </option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} · {patient.email}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm font-medium text-gray-700">
        Doctor
        <select
          name="doctorId"
          required
          disabled={doctors.length === 0 || pending}
          defaultValue=""
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm"
        >
          <option value="" disabled>
            {doctors.length ? 'Choose a doctor' : 'No doctor accounts available'}
          </option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Visit type
        <select
          name="visitType"
          required
          disabled={pending}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm"
        >
          {visitTypes.map((visit) => (
            <option key={visit.value} value={visit.value}>
              {visit.label} · {visit.duration} min
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Date
          <input
            name="appointmentDate"
            type="date"
            min={today}
            required
            disabled={pending}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Start time
          <input
            name="startTime"
            type="time"
            required
            disabled={pending}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm"
          />
        </label>
      </div>

      {state.message && (
        <p aria-live="polite" className="text-sm text-gray-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || doctors.length === 0}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {pending ? 'Saving appointment' : 'Save appointment'}
      </button>
    </form>
  );
}