import { ROUTES } from '@/constants/routes';
import type { User } from '@/types';

export type UserRole = 'admin' | 'user';

export function userRole(user: User | null): UserRole | null {
  if (!user) return null;
  return user.isAdmin ? 'admin' : 'user';
}

/** After login / session restore: where this user should land by default. */
export function postAuthRedirectPath(user: User): string {
  return userRole(user) === 'admin' ? ROUTES.admin : ROUTES.home;
}
