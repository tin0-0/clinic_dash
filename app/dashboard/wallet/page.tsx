import { auth } from '@/auth';
import postgres from 'postgres';
import { redirect } from 'next/navigation';
import TopUpForm from '@/app/ui/wallet/top-up-form';
import PayInvoiceForm from '@/app/ui/wallet/pay-invoice-form';
import { formatCurrency } from '@/app/lib/utils';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

export default async function WalletPage(props: {
  searchParams?: Promise<{ topup?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'patient') redirect('/unauthorized');

  const [wallet, invoices, transactions] = await Promise.all([
    sql<{ balance_cents: number }[]>`
      SELECT balance_cents FROM wallet_accounts WHERE user_id = ${session.user.id}
    `,
    sql<{ id: string; amount: number; date: string }[]>`
      SELECT invoices.id, invoices.amount, invoices.date::text
      FROM invoices
      JOIN customers ON customers.id = invoices.customer_id
      WHERE customers.email = ${session.user.email} AND invoices.status = 'pending'
      ORDER BY invoices.date DESC
    `,
    sql<{ amount_cents: number; transaction_type: string; created_at: string }[]>`
      SELECT amount_cents, transaction_type, created_at::date::text AS created_at
      FROM wallet_transactions
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
      LIMIT 20
    `,
  ]);
  const searchParams = await props.searchParams;
  const balance = wallet[0]?.balance_cents ?? 0;

  return (
    <main className="max-w-4xl space-y-8">
      <header>
        <p className="text-sm font-medium text-blue-700">Patient account</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-950">Wallet</h1>
      </header>
      {searchParams?.topup === 'success' && (
        <p role="status" className="border-l-4 border-emerald-600 bg-emerald-50 p-3 text-sm text-emerald-900">
          Payment submitted. Your balance updates after Stripe confirms it.
        </p>
      )}
      {searchParams?.topup === 'cancelled' && (
        <p role="status" className="border-l-4 border-gray-400 bg-gray-50 p-3 text-sm text-gray-700">
          Top-up cancelled. No funds were added.
        </p>
      )}
      <section className="grid gap-8 border-b border-gray-200 pb-8 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-600">Available balance</p>
          <p className="mt-2 text-3xl font-semibold text-gray-950">{formatCurrency(balance)}</p>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Add funds</h2>
          <TopUpForm />
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Pending invoices</h2>
        {invoices.length ? (
          <div className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium text-gray-900">{formatCurrency(invoice.amount)}</p>
                  <p className="text-sm text-gray-500">Invoice date {invoice.date}</p>
                </div>
                <PayInvoiceForm invoiceId={invoice.id} />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-5 text-sm text-gray-500">No pending invoices are linked to this email.</p>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent activity</h2>
        <div className="divide-y divide-gray-200">
          {transactions.map((transaction, index) => (
            <div key={`${transaction.created_at}-${index}`} className="flex justify-between py-3 text-sm">
              <span className="capitalize text-gray-700">{transaction.transaction_type.replace('_', ' ')}</span>
              <span className="text-gray-600">{transaction.created_at} · {formatCurrency(transaction.amount_cents)}</span>
            </div>
          ))}
          {!transactions.length && <p className="py-4 text-sm text-gray-500">No wallet activity yet.</p>}
        </div>
      </section>
    </main>
  );
}