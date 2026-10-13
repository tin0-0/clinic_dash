'use client';

import { useActionState } from 'react';
import { sendInvoiceEmail } from '@/app/lib/actions';

export default function EmailInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [message, formAction, pending] = useActionState(sendInvoiceEmail, undefined);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <button disabled={pending} className="text-sm font-medium text-blue-700 hover:underline disabled:opacity-60">
          {pending ? 'Sending' : 'Email payment link'}
        </button>
      </form>
      {message && <p role="status" className="mt-1 max-w-48 text-xs text-gray-600">{message}</p>}
    </div>
  );
}