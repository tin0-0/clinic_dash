'use client';

import { useActionState } from 'react';
import {
  receiveMedicationStock,
  type StockActionState,
} from '@/app/lib/actions';

const initialState: StockActionState = { message: '', success: false };

export default function ReceiveStockForm({
  medicationId,
  medicationName,
}: {
  medicationId: string;
  medicationName: string;
}) {
  const [state, formAction, pending] = useActionState(
    receiveMedicationStock,
    initialState,
  );

  return (
    <div>
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="medicationId" value={medicationId} />
        <input
          name="quantity"
          type="number"
          min="1"
          defaultValue="10"
          required
          disabled={pending}
          aria-label={`Quantity received for ${medicationName}`}
          className="w-20 rounded-md border border-gray-300 p-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="text-sm font-semibold text-blue-700 hover:underline disabled:opacity-60"
        >
          {pending ? 'Receiving' : 'Receive'}
        </button>
      </form>
      {state.message && (
        <p role={state.success ? 'status' : 'alert'} className={`mt-1 text-xs ${state.success ? 'text-emerald-700' : 'text-rose-700'}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}