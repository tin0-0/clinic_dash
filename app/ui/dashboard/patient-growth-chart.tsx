import { fetchMonthlyPatientCounts } from '@/app/lib/data';

export default async function PatientGrowthChart() {
  const months = await fetchMonthlyPatientCounts();
  const highestCount = Math.max(...months.map((month) => month.patient_count), 0);
  const axisMaximum = Math.max(4, Math.ceil(highestCount / 4) * 4);
  const axisMarks = [3, 2, 1, 0].map((step) => Math.round((axisMaximum * step) / 3));
  const chartHeight = 220;

  return (
    <section className="min-w-0 border-y border-gray-200 py-6 md:col-span-4">
      <h2 className="text-lg font-semibold text-gray-950">Is the practice growing? New patients per month</h2>
      <p className="mt-1 text-sm text-gray-600">New patient accounts created in the last 12 months.</p>
      <div className="mt-5 grid grid-cols-[3rem_minmax(0,1fr)] gap-3">
        <div className="flex flex-col justify-between pb-8 text-right text-xs text-gray-500" style={{ height: chartHeight + 32 }} aria-hidden="true">
          {axisMarks.map((mark, index) => <span key={`${mark}-${index}`}>{mark}</span>)}
        </div>
        <div className="min-w-0">
          <div className="flex items-end gap-2 border-b border-l border-gray-400 px-2 sm:gap-3" style={{ height: chartHeight }}>
            {months.map((month) => (
              <div key={month.month_key} className="flex h-full min-w-0 flex-1 items-end" title={`${month.month_label}: ${month.patient_count} new patients`}>
                <div className="w-full bg-emerald-700" style={{ height: `${(month.patient_count / axisMaximum) * chartHeight}px` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between gap-2 border-l border-gray-400 px-2 text-[10px] text-gray-500 sm:text-xs">
            {months.map((month, index) => (
              <span key={month.month_key} className="min-w-0 flex-1 text-center">
                {index % 2 === 0 || index === months.length - 1 ? month.month_label : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-between pl-12 text-xs font-medium text-gray-600">
        <span>Patient accounts</span>
        <span>Month</span>
      </div>
      <p className="mt-4 text-xs text-gray-500">Decision cue: if the last three bars fall, the owner holds off on adding another consulting day.</p>
    </section>
  );
}