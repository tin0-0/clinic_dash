'use client';

import { useActionState } from 'react';
import { dispensePrescription } from '@/app/lib/actions';

export default function DispensePrescriptionForm({
  prescriptionId,
}: {
  prescriptionId: string;
}) {
  const [message, formAction, pending] = useActionState(dispensePrescription, undefined);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="prescriptionId" value={prescriptionId} />
        <button
          disabled={pending}
          className="text-sm font-semibold text-blue-700 hover:underline disabled:opacity-60"
        >
          {pending ? 'Dispensing' : 'Dispense'}
        </button>
      </form>
      {message && <p aria-live="polite" className="mt-1 text-xs text-rose-700">{message}</p>}
    </div>
  );
}