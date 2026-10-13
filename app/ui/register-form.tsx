'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { registerUser } from '@/app/lib/actions';

export default function RegisterForm() {
  const [message, formAction, pending] = useActionState(registerUser, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-gray-800">
        Full name
        <input name="name" autoComplete="name" required minLength={2} maxLength={120} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm" />
      </label>
      <label className="block text-sm font-medium text-gray-800">
        Email
        <input name="email" type="email" autoComplete="email" required className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm" />
      </label>
      <label className="block text-sm font-medium text-gray-800">
        Password
        <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm" />
      </label>
      <label className="block text-sm font-medium text-gray-800">
        Confirm password
        <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm" />
      </label>
      {message && <p role="alert" className="text-sm text-rose-700">{message}</p>}
      <button disabled={pending} className="flex h-10 w-full items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? 'Creating account' : 'Create patient account'}
      </button>
      <p className="text-center text-sm text-gray-600">
        Already registered? <Link href="/login" className="font-medium text-blue-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}