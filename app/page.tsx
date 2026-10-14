import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRightIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ClipboardDocumentCheckIcon,
  HeartIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medi-Clinic | Care coordination',
  description:
    'A connected clinic workspace for appointments, pharmacy handoffs, inventory, and administration.',
};

const features = [
  {
    number: '01',
    title: 'Appointments that fit the day',
    description:
      'Patients request a visit inside a doctor’s working hours. The clinic team keeps the queue and appointment status in one place.',
    icon: CalendarDaysIcon,
  },
  {
    number: '02',
    title: 'A clearer handoff to pharmacy',
    description:
      'Doctors write prescriptions from the visit. Pharmacy staff track stock and dispense only what is available.',
    icon: ClipboardDocumentCheckIcon,
  },
  {
    number: '03',
    title: 'The work behind the care',
    description:
      'Admins follow invoices, customers, revenue, user access, and clinic updates from one dashboard.',
    icon: ChartBarSquareIcon,
  },
];

const roles = [
  {
    role: 'Patients',
    detail: 'Book visits, check updates, manage wallet activity, and see notifications.',
    icon: HeartIcon,
  },
  {
    role: 'Doctors',
    detail: 'Set weekly availability, follow a clinical queue, and create prescriptions.',
    icon: UserGroupIcon,
  },
  {
    role: 'Clinic team',
    detail: 'Coordinate appointments, inventory, invoices, and day-to-day operations.',
    icon: BellAlertIcon,
  },
];

export default function Page() {
  return (
    <main className="overflow-hidden bg-[#fffaf9] text-[#281a22]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Medi-Clinic home">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a82d5a] text-white">
            <HeartIcon className="h-5 w-5" />
          </span>
          <span className={`${lusitana.className} text-2xl font-bold`}>Medi-Clinic</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6" aria-label="Main navigation">
          <a href="#care-tools" className="hidden text-sm font-medium text-[#56444d] transition-colors hover:text-[#a82d5a] sm:inline">
            What it does
          </a>
          <a href="#for-the-team" className="hidden text-sm font-medium text-[#56444d] transition-colors hover:text-[#a82d5a] sm:inline">
            For the team
          </a>
          <Link href="/login" className="rounded-md px-3 py-2 text-sm font-semibold text-[#72203f] hover:bg-[#f8e8ed]">
            Log in
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[620px] w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 md:grid-cols-[1.02fr_0.98fr] md:pb-24 md:pt-10 lg:px-12">
        <div className="relative z-10 py-5 md:py-12">
          <p className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase text-[#8d3355]">
            <span className="h-px w-8 bg-[#ad3d65]" />
            One connected clinic
          </p>
          <h1 className={`${lusitana.className} max-w-2xl text-5xl leading-[1.06] text-[#2a1821] sm:text-6xl lg:text-7xl`}>
            More room for <span className="text-[#a82d5a]">good care.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#5c4a52] sm:text-lg sm:leading-8">
            Medi-Clinic brings appointments, clinical handoffs, pharmacy stock, and clinic administration into one practical workspace. So the team can spend less time chasing updates and more time looking after people.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex h-12 items-center justify-center gap-3 rounded-md bg-[#a82d5a] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#872348]">
              Log in to your workspace
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/register" className="inline-flex h-12 items-center justify-center rounded-md border border-[#d9bac6] bg-transparent px-6 text-sm font-semibold text-[#72203f] transition-colors hover:bg-[#f8e8ed]">
              Create a patient account
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#eadde1] pt-5 text-sm text-[#604b55]">
            <span className="inline-flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-[#a82d5a]" /> Appointment coordination</span>
            <span className="inline-flex items-center gap-2"><ClipboardDocumentCheckIcon className="h-4 w-4 text-[#a82d5a]" /> Pharmacy workflow</span>
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-[560px] md:justify-self-end">
          <div className="absolute -left-5 top-8 h-28 w-28 border-l border-t border-[#cf8da5]" aria-hidden="true" />
          <div className="relative h-[430px] overflow-hidden rounded-t-[48%] rounded-b-md bg-[#efd6df] sm:h-[520px]">
            <Image
              src="/doctor-portrait.jpeg"
              alt="Medi-Clinic doctor"
              fill
              loading="eager"
              sizes="(max-width: 768px) 100vw, 48vw"
              className="object-cover object-center"
            />
          </div>
          <figcaption className="mt-3 flex items-center justify-between gap-3 text-xs font-medium text-[#725c65]">
            <span>Care coordination, from first request to follow-up</span>
            <span className="h-px w-12 shrink-0 bg-[#c17b94]" aria-hidden="true" />
          </figcaption>
        </figure>
      </section>

      <section id="care-tools" className="border-y border-[#ecdde2] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20 lg:px-12">
          <div className="grid gap-5 pb-10 md:grid-cols-[0.8fr_1.2fr] md:items-end md:pb-12">
            <div>
              <p className="text-xs font-bold uppercase text-[#8d3355]">The everyday, connected</p>
              <h2 className={`${lusitana.className} mt-3 max-w-lg text-3xl leading-tight text-[#2a1821] sm:text-4xl`}>
                One workspace for the moving parts of care.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#66535c] md:justify-self-end md:text-base">
              Each person sees the tools for their role, while the clinic keeps shared work moving across the day.
            </p>
          </div>
          <div className="grid border-t border-[#eadde1] md:grid-cols-3 md:divide-x md:divide-[#eadde1]">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.number} className="border-b border-[#eadde1] py-7 md:border-b-0 md:px-7 md:py-8 first:md:pl-0 last:md:pr-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#a82d5a]">{feature.number}</span>
                    <Icon className="h-5 w-5 text-[#a82d5a]" />
                  </div>
                  <h3 className={`${lusitana.className} mt-7 text-2xl text-[#2a1821]`}>{feature.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-[#66535c]">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="for-the-team" className="bg-[#f5e6eb]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:py-20 lg:px-12">
          <div>
            <p className="text-xs font-bold uppercase text-[#8d3355]">A place for every role</p>
            <h2 className={`${lusitana.className} mt-3 max-w-md text-3xl leading-tight text-[#2a1821] sm:text-4xl`}>
              Less handoff friction. More shared context.
            </h2>
          </div>
          <div className="divide-y divide-[#d9bdc7] border-y border-[#d9bdc7]">
            {roles.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.role} className="grid gap-3 py-5 sm:grid-cols-[150px_1fr] sm:items-center">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[#502b3a]">
                    <Icon className="h-4 w-4 text-[#a82d5a]" /> {item.role}
                  </h3>
                  <p className="text-sm leading-6 text-[#604b55]">{item.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="bg-[#2b1b23] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex items-center gap-2.5">
            <HeartIcon className="h-5 w-5 text-[#f1b3c7]" />
            <span className={`${lusitana.className} text-xl font-bold`}>Medi-Clinic</span>
          </div>
          <p className="text-sm text-[#e3cfd6]">A calmer view of the work that keeps a clinic moving.</p>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#f1b3c7]">
            Log in <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </footer>
    </main>
  );
}
