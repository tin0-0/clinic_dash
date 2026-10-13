'use client';

import { useActionState } from 'react';
import {
  saveDoctorAvailability,
  type AvailabilityActionState,
} from '@/app/lib/actions';
import { weekdays } from '@/app/lib/appointments';

type AvailabilityRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

export default function AvailabilityForm({
  availability,
}: {
  availability: AvailabilityRow[];
}) {
  const initialState: AvailabilityActionState = { message: null };
  const [state, formAction, pending] = useActionState(
    saveDoctorAvailability,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-[minmax(8rem,1fr)_1fr_1fr] gap-3 border-b border-gray-200 pb-2 text-xs font-semibold uppercase text-gray-500">
        <span>Day</span>
        <span>Opens</span>
        <span>Closes</span>
      </div>
      {weekdays.map((day) => {
        const row = availability.find((item) => item.day_of_week === day.value);
        return (
          <div
            key={day.value}
            className="grid grid-cols-[minmax(8rem,1fr)_1fr_1fr] items-center gap-3"
          >
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                name={`available_${day.value}`}
                defaultChecked={row?.is_available ?? false}
                disabled={pending}
                className="rounded border-gray-300 text-blue-700 focus:ring-blue-700"
              />
              {day.label}
            </label>
            <input
              type="time"
              name={`start_${day.value}`}
              defaultValue={row?.start_time.slice(0, 5) ?? '09:00'}
              disabled={pending}
              required
              aria-label={`${day.label} start time`}
              className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            />
            <input
              type="time"
              name={`end_${day.value}`}
              defaultValue={row?.end_time.slice(0, 5) ?? '17:00'}
              disabled={pending}
              required
              aria-label={`${day.label} end time`}
              className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            />
          </div>
        );
      })}
      {state.message && (
        <p aria-live="polite" className="text-sm text-gray-700">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? 'Saving hours' : 'Save working hours'}
      </button>
    </form>
  );
}