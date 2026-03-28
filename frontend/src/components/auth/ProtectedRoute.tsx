import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ReactNode, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, userRole, isLoading } = useAuth();
  const location = useLocation();
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    // Safety timeout: if auth doesn't resolve in 6s, show the page anyway
    const timer = setTimeout(() => {
      setForceReady(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading && !forceReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    console.warn(`Access denied: User role "${userRole}" not allowed for this route.`);
    // Redirect to home if unauthorized
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
