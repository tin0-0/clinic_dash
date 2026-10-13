import LoginForm from '@/app/ui/login-form';
import { HeartIcon } from '@heroicons/react/24/outline';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf9] p-5">
      <div className="relative mx-auto flex w-full max-w-[420px] flex-col space-y-3">
        <div className="flex h-24 items-center gap-3 rounded-md bg-[#a82d5a] px-6 text-white">
          <HeartIcon className="h-7 w-7" />
          <span className="text-xl font-semibold">Medi-Clinic</span>
        </div>
        <div className="rounded-md border border-[#ead5de] bg-white shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
