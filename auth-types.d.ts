import type { UserRole } from '@/app/lib/definitions';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole;
  }
}