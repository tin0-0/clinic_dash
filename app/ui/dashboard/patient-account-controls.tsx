'use client';

import { useActionState } from 'react';
import {
  createPatientAccount,
  deletePatientAccount,
  updatePatientAccount,
} from '@/app/lib/actions';

export function CreatePatientAccountForm() {
  const [message, formAction, pending] = useActionState(createPatientAccount, undefined);

  return (
    <section className="border-b border-gray-200 pb-6">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Add patient</h2>
      <form action={formAction} className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">
          Name
          <input name="name" required minLength={2} maxLength={120} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Email
          <input name="email" type="email" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Temporary password
          <input name="password" type="password" required minLength={8} maxLength={128} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <button disabled={pending} className="h-10 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 sm:col-span-3 sm:justify-self-start">
          {pending ? 'Creating patient' : 'Create patient'}
        </button>
      </form>
      {message && <p role="status" className="mt-2 text-sm text-gray-700">{message}</p>}
    </section>
  );
}

export function PatientAccountControls({
  user,
}: {
  user: { id: string; name: string; email: string };
}) {
  const [updateMessage, updateAction, updating] = useActionState(updatePatientAccount, undefined);
  const [deleteMessage, deleteAction, deleting] = useActionState(deletePatientAccount, undefined);

  return (
    <div className="min-w-64 space-y-2">
      <form action={updateAction} className="space-y-2">
        <input type="hidden" name="userId" value={user.id} />
        <input name="name" defaultValue={user.name} required minLength={2} maxLength={120} aria-label={`Name for ${user.email}`} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        <input name="email" type="email" defaultValue={user.email} required aria-label={`Email for ${user.name}`} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        <button disabled={updating} className="text-sm font-medium text-blue-700 hover:underline disabled:opacity-60">
          {updating ? 'Saving' : 'Save patient'}
        </button>
      </form>
      {updateMessage && <p role="status" className="text-xs text-gray-600">{updateMessage}</p>}
      <form action={deleteAction} onSubmit={(event) => {
        if (!window.confirm(`Delete ${user.name}'s patient account? Accounts with clinical history cannot be deleted.`)) {
          event.preventDefault();
        }
      }}>
        <input type="hidden" name="userId" value={user.id} />
        <button disabled={deleting} className="text-sm font-medium text-rose-700 hover:underline disabled:opacity-60">
          {deleting ? 'Deleting' : 'Delete patient'}
        </button>
      </form>
      {deleteMessage && <p role="status" className="text-xs text-gray-600">{deleteMessage}</p>}
    </div>
  );
}