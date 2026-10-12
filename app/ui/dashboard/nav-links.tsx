'use client';

import {
  UserGroupIcon,
  HomeIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import type { UserRole } from '@/app/lib/definitions';

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon, roles: ['admin'] },
  {
    name: 'Invoices',
    href: '/dashboard/invoices',
    icon: DocumentDuplicateIcon,
    roles: ['admin'],
  },
  { name: 'Customers', href: '/dashboard/customers', icon: UserGroupIcon, roles: ['admin'] },
  {
    name: 'Appointments',
    href: '/dashboard/appointments',
    icon: UserGroupIcon,
    roles: ['admin', 'doctor', 'patient', 'pharmacy_reception'],
  },
  {
    name: 'Inventory',
    href: '/dashboard/pharmacy/stock',
    icon: DocumentDuplicateIcon,
    roles: ['pharmacy_stocker'],
  },
  {
    name: 'Prescription queue',
    href: '/dashboard/pharmacy/pharmacist',
    icon: DocumentDuplicateIcon,
    roles: ['pharmacist'],
  },
];

export default function NavLinks({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visibleLinks = links.filter((link) => link.roles.includes(role));

  return (
    <>
      {visibleLinks.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3',
              {
                'bg-sky-100 text-blue-600': pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
