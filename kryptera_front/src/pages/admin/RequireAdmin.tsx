import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/constants/routes';
import { Skeleton } from '@/components/ui/skeleton';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  if (!user?.isAdmin) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <>{children}</>;
}
