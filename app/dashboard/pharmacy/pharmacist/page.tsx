import postgres from 'postgres';
import DispensePrescriptionForm from '@/app/ui/appointments/dispense-prescription-form';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

type PrescriptionRow = {
  id: string;
  patient_name: string;
  doctor_name: string;
  medication_name: string;
  quantity: number;
  available_quantity: number;
  dosage: string;
  status: 'pending' | 'dispensed' | 'cancelled';
  created_at: string;
};

export default async function PharmacistDashboardPage() {
  const prescriptions = await sql<PrescriptionRow[]>`
    SELECT p.id, patient.name AS patient_name, doctor.name AS doctor_name,
      medication.name AS medication_name, p.quantity,
      medication.quantity AS available_quantity, p.dosage, p.status,
      p.created_at::date::text AS created_at
    FROM prescriptions p
    JOIN users patient ON patient.id = p.patient_id
    JOIN users doctor ON doctor.id = p.doctor_id
    JOIN medications medication ON medication.id = p.medication_id
    ORDER BY CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END, p.created_at
  `;

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-medium text-blue-700">Pharmacy operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-950">Prescription queue</h1>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-3 font-medium">Patient</th>
              <th className="px-3 py-3 font-medium">Prescribed by</th>
              <th className="px-3 py-3 font-medium">Medicine</th>
              <th className="px-3 py-3 font-medium">Directions</th>
              <th className="px-3 py-3 font-medium">Qty</th>
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Status / action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {prescriptions.map((prescription) => (
              <tr key={prescription.id}>
                <td className="px-3 py-4 font-medium text-gray-900">{prescription.patient_name}</td>
                <td className="px-3 py-4 text-gray-700">{prescription.doctor_name}</td>
                <td className="px-3 py-4 text-gray-700">{prescription.medication_name}</td>
                <td className="px-3 py-4 text-gray-700">{prescription.dosage}</td>
                <td className="px-3 py-4 text-gray-700">{prescription.quantity}</td>
                <td className="px-3 py-4 text-gray-700">{prescription.created_at}</td>
                <td className="px-3 py-4">
                  {prescription.status === 'pending' ? (
                    prescription.available_quantity >= prescription.quantity ? (
                      <DispensePrescriptionForm prescriptionId={prescription.id} />
                    ) : (
                      <span className="text-xs font-medium text-rose-700">Insufficient stock ({prescription.available_quantity} available)</span>
                    )
                  ) : (
                    <span className="capitalize text-gray-600">{prescription.status}</span>
                  )}
                </td>
              </tr>
            ))}
            {prescriptions.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-500">No prescriptions in the queue.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}