import type { NextAuthConfig } from 'next-auth';
import type { UserRole } from '@/app/lib/definitions';

const roleHome: Record<UserRole, string> = {
  admin: '/dashboard',
  doctor: '/dashboard/doctor',
  patient: '/dashboard/user',
  pharmacy_reception: '/dashboard/pharmacy/reception',
  pharmacy_stocker: '/dashboard/pharmacy/stock',
  pharmacist: '/dashboard/pharmacy/pharmacist',
};

function isUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && Object.hasOwn(roleHome, role);
}

function hasDashboardAccess(pathname: string, role: UserRole) {
  if (pathname.startsWith('/dashboard/notifications')) return true;
  if (pathname.startsWith('/dashboard/wallet')) return role === 'patient';
  if (pathname === '/dashboard/user' || pathname.startsWith('/dashboard/user/')) {
    return role === 'patient';
  }
  if (pathname.startsWith('/dashboard/doctor')) {
    return role === 'admin' || role === 'doctor';
  }
  if (pathname.startsWith('/dashboard/pharmacy/reception')) {
    return role === 'admin' || role === 'pharmacy_reception';
  }
  if (pathname.startsWith('/dashboard/pharmacy/stock')) {
    return role === 'admin' || role === 'pharmacy_stocker';
  }
  if (pathname.startsWith('/dashboard/pharmacy/pharmacist')) {
    return role === 'admin' || role === 'pharmacist';
  }
  if (pathname.startsWith('/dashboard/pharmacy')) {
    return false;
  }
  if (pathname.startsWith('/dashboard/appointments')) {
    return (
      ['admin', 'doctor', 'pharmacy_reception'].includes(role) ||
      role === 'patient'
    );
  }
  return role === 'admin';
}

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (isUserRole(token.role)) session.user.role = token.role;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const user = auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

      if (isOnDashboard) {
        if (!user) return false;
        if (!user.role || !hasDashboardAccess(nextUrl.pathname, user.role)) {
          return Response.redirect(new URL('/unauthorized', nextUrl));
        }
        return true;
      }

      if (
        user &&
        ['/login', '/register', '/'].includes(nextUrl.pathname)
      ) {
        return Response.redirect(new URL(roleHome[user.role] ?? '/unauthorized', nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
