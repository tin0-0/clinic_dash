import Link from 'next/link';
import { signOut } from '@/auth';

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md border-l-4 border-rose-600 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase text-rose-700">Access denied</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950">
          This area is not available to your account.
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Sign in with an account assigned to this clinic role, or contact an administrator.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Return to sign in
        </Link>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
        >
          <button className="mt-3 inline-flex h-10 items-center rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Sign out and return home
          </button>
        </form>
      </section>
    </main>
  );
}