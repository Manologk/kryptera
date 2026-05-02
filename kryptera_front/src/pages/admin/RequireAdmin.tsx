import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { userRole } from '@/lib/userRole';
import { Skeleton } from '@/components/ui/skeleton';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="w-48 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.login} replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }

  if (userRole(user) !== 'admin') {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <>{children}</>;
}
