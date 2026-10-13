import { auth } from '@/auth';
import { markNotificationRead } from '@/app/lib/actions';
import postgres from 'postgres';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  href: string;
  created_at: string;
  read_at: string | null;
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const notifications = await sql<NotificationRow[]>`
    SELECT id, title, message, href,
      created_at::timestamp(0)::text AS created_at,
      read_at::timestamp(0)::text AS read_at
    FROM notifications
    WHERE recipient_id = ${session.user.id}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <main className="max-w-4xl space-y-6">
      <header className="flex items-end justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <p className="text-sm font-medium text-blue-700">Clinic updates</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">Notifications</h1>
        </div>
        <p className="text-sm text-gray-500">{unreadCount} unread</p>
      </header>
      <ul className="divide-y divide-gray-200">
        {notifications.map((notification) => (
          <li key={notification.id} className={`flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between ${notification.read_at ? '' : 'bg-blue-50/50'}`}>
            <div>
              <p className="font-semibold text-gray-950">{notification.title}</p>
              <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
              <p className="mt-2 text-xs text-gray-500">{notification.created_at}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <Link href={notification.href} className="text-sm font-medium text-blue-700 hover:underline">Open</Link>
              {!notification.read_at && (
                <form action={markNotificationRead}>
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <button className="text-sm font-medium text-gray-700 hover:underline">Mark read</button>
                </form>
              )}
            </div>
          </li>
        ))}
        {notifications.length === 0 && (
          <li className="py-12 text-center text-sm text-gray-500">You’re all caught up.</li>
        )}
      </ul>
    </main>
  );
}