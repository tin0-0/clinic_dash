'use client';

import { useActionState } from 'react';
import { createWalletTopUp } from '@/app/lib/actions';

export default function TopUpForm({ simulated }: { simulated: boolean }) {
  const [message, formAction, pending] = useActionState(createWalletTopUp, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium text-gray-800">
        Amount (USD)
        <input name="amount" type="number" min="10" max="500" step="0.01" defaultValue="25" required className="mt-1 block w-36 rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <button disabled={pending} className="h-10 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? (simulated ? 'Recording' : 'Opening checkout') : (simulated ? 'Simulate top-up' : 'Add funds')}
      </button>
      {message && <p role="alert" className="w-full text-sm text-rose-700">{message}</p>}
    </form>
  );
}