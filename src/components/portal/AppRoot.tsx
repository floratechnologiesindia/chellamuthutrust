import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalBodyClass } from '@/hooks/usePortalBodyClass';
import AppLogin from '@/pages/app/AppLogin';

const staffDashboard = (role: string) => {
  switch (role) {
    case 'super_admin': return '/super-admin';
    case 'admin': return '/admin';
    case 'warden': return '/warden';
    case 'finance': return '/finance';
    case 'employee': return '/tasks';
    default: return '/admin';
  }
};

/** App portal landing — staff login or redirect to role dashboard */
export const AppRoot = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  usePortalBodyClass();
  if (isLoading) {
    return (
      <div className="portal-app min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffca0f]" />
      </div>
    );
  }
  if (isAuthenticated && user && user.role !== 'donor') {
    return <Navigate to={staffDashboard(user.role)} replace />;
  }
  return <AppLogin />;
};
