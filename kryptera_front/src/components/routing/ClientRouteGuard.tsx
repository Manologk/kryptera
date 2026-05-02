import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { postAuthRedirectPath, userRole } from '@/lib/userRole';

function isPublicClientPath(pathname: string): boolean {
  return pathname === ROUTES.home || pathname === ROUTES.login || pathname === ROUTES.register;
}

/**
 * Client app routes (non-/admin): enforce login for protected pages;
 * send admins to /admin when they hit user-only or public auth pages.
 */
export default function ClientRouteGuard() {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  if (loading) {
    return <div className="min-h-screen" aria-busy="true" />;
  }

  const admin = userRole(user) === 'admin';

  if (isPublicClientPath(path)) {
    if (isAuthenticated && user) {
      if (path === ROUTES.login || path === ROUTES.register) {
        return <Navigate to={postAuthRedirectPath(user)} replace />;
      }
      if (path === ROUTES.home && admin) {
        return <Navigate to={ROUTES.admin} replace />;
      }
    }
    return <Outlet />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (admin) {
    return <Navigate to={ROUTES.admin} replace />;
  }

  return <Outlet />;
}
