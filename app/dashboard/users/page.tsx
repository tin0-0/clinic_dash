import { auth } from '@/auth';
import { updateUserRole } from '@/app/lib/actions';
import type { UserRole } from '@/app/lib/definitions';
import postgres from 'postgres';
import { redirect } from 'next/navigation';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

const roles: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Patient' },
  { value: 'pharmacy_reception', label: 'Pharmacy reception' },
  { value: 'pharmacy_stocker', label: 'Pharmacy stocker' },
  { value: 'pharmacist', label: 'Pharmacist' },
];

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/unauthorized');

  const users = await sql<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }[]>`
    SELECT id, name, email, role FROM users ORDER BY name
  `;

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-medium text-blue-700">Administration</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-950">Users and roles</h1>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Update access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-3 py-4 font-medium text-gray-900">{user.name}</td>
                <td className="px-3 py-4 text-gray-700">{user.email}</td>
                <td className="px-3 py-4 text-gray-700">
                  {roles.find((role) => role.value === user.role)?.label ?? user.role}
                </td>
                <td className="px-3 py-4">
                  {user.id === session.user.id ? (
                    <span className="text-xs text-gray-500">Your account</span>
                  ) : (
                    <form action={updateUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="role" defaultValue={user.role} aria-label={`Role for ${user.name}`} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm">
                        {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                      <button className="font-medium text-blue-700 hover:underline">Save</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-500">Role changes apply after the affected user signs in again.</p>
    </main>
  );
}