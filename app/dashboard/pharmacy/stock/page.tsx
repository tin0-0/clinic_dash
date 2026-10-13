import postgres from 'postgres';
import { addMedication } from '@/app/lib/actions';
import ReceiveStockForm from '@/app/ui/pharmacy/receive-stock-form';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

type MedicationRow = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorder_level: number;
  expiration_date: string | null;
};

export default async function PharmacyStockPage() {
  const medications = await sql<MedicationRow[]>`
    SELECT id, name, sku, quantity, reorder_level, expiration_date::text
    FROM medications
    ORDER BY name
  `;

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-medium text-blue-700">Pharmacy operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-950">Inventory</h1>
      </header>

      <section className="max-w-4xl border-b border-gray-200 pb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Add medicine</h2>
        <form action={addMedication} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium text-gray-700">
            Medicine
            <input name="name" required maxLength={160} className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            SKU
            <input name="sku" required maxLength={60} className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Starting stock
            <input name="quantity" type="number" min="0" required className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Reorder at
            <input name="reorderLevel" type="number" min="0" required className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Expiration
            <input name="expirationDate" type="date" className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
          </label>
          <button className="h-10 self-end rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 sm:col-span-2 lg:col-span-5 lg:justify-self-start">
            Add to inventory
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Stock on hand</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-3 font-medium">Medicine</th>
                <th className="px-3 py-3 font-medium">SKU</th>
                <th className="px-3 py-3 font-medium">Quantity</th>
                <th className="px-3 py-3 font-medium">Reorder level</th>
                <th className="px-3 py-3 font-medium">Expires</th>
                <th className="px-3 py-3 font-medium">Receive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medications.map((medication) => (
                <tr key={medication.id}>
                  <td className="px-3 py-4 font-medium text-gray-900">{medication.name}</td>
                  <td className="px-3 py-4 text-gray-700">{medication.sku}</td>
                  <td className="px-3 py-4">
                    <span className={medication.quantity <= medication.reorder_level ? 'font-semibold text-rose-700' : 'text-gray-700'}>
                      {medication.quantity}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-gray-700">{medication.reorder_level}</td>
                  <td className="px-3 py-4 text-gray-700">{medication.expiration_date ?? '—'}</td>
                  <td className="px-3 py-4">
                    <ReceiveStockForm medicationId={medication.id} medicationName={medication.name} />
                  </td>
                </tr>
              ))}
              {medications.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No medicines in inventory.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}