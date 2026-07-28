import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { getLoginPath, isDonorPortal, DONOR_PORTAL_URL, APP_PORTAL_URL } from '@/lib/portal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles,
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={getLoginPath()} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role)) {
      if (user.role === 'donor' && !isDonorPortal()) {
        window.location.href = `${DONOR_PORTAL_URL}/?tab=account`;
        return null;
      }
      if (user.role !== 'donor' && isDonorPortal()) {
        window.location.href = APP_PORTAL_URL + getRedirectPath(user.role);
        return null;
      }
      return <Navigate to={getRedirectPath(user.role)} replace />;
    }
  }

  return <>{children}</>;
};

// Helper function to get redirect path based on role
const getRedirectPath = (role: UserRole): string => {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin';
    case 'employee':
      return '/tasks';
    case 'warden':
      return '/warden';
    case 'finance':
      return '/finance';
    case 'donor':
      return '/?tab=account';
    default:
      return '/';
  }
};

export default ProtectedRoute;
