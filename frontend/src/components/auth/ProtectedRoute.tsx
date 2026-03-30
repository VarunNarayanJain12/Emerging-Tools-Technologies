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
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-xl max-w-md text-center space-y-6">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-red-500">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-outfit">Access Restricted</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              You are logged in as a <strong>{userRole || 'Unknown Role'}</strong>. 
              This page requires a higher or different permission level.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={() => window.location.href = '/login'}
              className="px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:hover:shadow-orange-900/40"
            >
              Back to Role Selection
            </button>
            <button 
              onClick={() => {
                supabase.auth.signOut().then(() => window.location.href = '/login');
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium"
            >
              Logout & Try Different Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
