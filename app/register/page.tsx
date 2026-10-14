import Link from 'next/link';
import AcmeLogo from '@/app/ui/acme-logo';
import RegisterForm from '@/app/ui/register-form';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] p-5">
      <section className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex rounded-md bg-blue-700 px-4 py-3 text-white">
          <AcmeLogo />
        </Link>
        <div className="border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="mb-6 text-2xl font-semibold text-gray-950">Create patient account</h1>
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}