import { fetchCurrentMonthAppointmentOutcomes } from '@/app/lib/data';

export default async function AppointmentOutcomesChart() {
  const outcomes = await fetchCurrentMonthAppointmentOutcomes();
  const total = outcomes.completed + outcomes.no_show;
  const completedPercent = total ? (outcomes.completed / total) * 100 : 0;
  const chartBackground = total
    ? `conic-gradient(#047857 0% ${completedPercent}%, #e11d48 ${completedPercent}% 100%)`
    : '#e5e7eb';

  return (
    <section className="min-w-0 border-y border-gray-200 py-6 md:col-span-4">
      <h2 className="text-lg font-semibold text-gray-950">What share of this month’s appointments are no-shows?</h2>
      <p className="mt-1 text-sm text-gray-600">Completed visits compared with recorded no-shows this month.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:justify-start sm:gap-12">
        <div className="grid h-44 w-44 shrink-0 place-items-center rounded-full" style={{ background: chartBackground }} role="img" aria-label={`${outcomes.completed} completed, ${outcomes.no_show} no-shows`}>
          <div className="grid h-28 w-28 place-content-center rounded-full bg-white text-center">
            <span className="text-2xl font-semibold text-gray-950">{total}</span>
            <span className="text-xs text-gray-500">visits</span>
          </div>
        </div>
        <dl className="space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-sm bg-emerald-700" aria-hidden="true" />
            <dt className="text-gray-700">Completed</dt>
            <dd className="font-semibold text-gray-950">{outcomes.completed}</dd>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-sm bg-rose-600" aria-hidden="true" />
            <dt className="text-gray-700">No-shows</dt>
            <dd className="font-semibold text-gray-950">{outcomes.no_show}</dd>
          </div>
          <div className="border-t border-gray-200 pt-3 text-xs text-gray-600">
            No-show share: {total ? `${Math.round((outcomes.no_show / total) * 100)}%` : 'No outcome data yet'}
          </div>
        </dl>
      </div>
      <p className="mt-4 text-xs text-gray-500">Decision cue: if the no-show share rises, the clinic tests appointment reminders.</p>
    </section>
  );
}