'use client';

import { useActionState } from 'react';
import { payInvoiceWithWallet } from '@/app/lib/actions';

export default function PayInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const [message, formAction, pending] = useActionState(payInvoiceWithWallet, undefined);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <button disabled={pending} className="text-sm font-semibold text-blue-700 hover:underline disabled:opacity-60">
          {pending ? 'Paying' : 'Pay from wallet'}
        </button>
      </form>
      {message && <p role="status" className="mt-1 text-xs text-gray-600">{message}</p>}
    </div>
  );
}