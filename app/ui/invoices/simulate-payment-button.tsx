'use client';

import { useActionState } from 'react';
import { simulateInvoicePayment } from '@/app/lib/actions';

export default function SimulatePaymentButton({ invoiceId }: { invoiceId: string }) {
  const [message, formAction, pending] = useActionState(simulateInvoicePayment, undefined);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <button disabled={pending} className="text-sm font-semibold text-emerald-700 hover:underline disabled:opacity-60">
          {pending ? 'Simulating' : 'Simulate payment'}
        </button>
      </form>
      {message && <p role="status" className="mt-1 max-w-48 text-xs text-gray-600">{message}</p>}
    </div>
  );
}