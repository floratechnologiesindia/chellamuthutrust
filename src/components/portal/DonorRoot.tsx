import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DonorPortal from '@/pages/donor/DonorPortal';

/** Donor portal landing — single-page giving hub */
export const DonorRoot = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffca0f]" />
      </div>
    );
  }
  if (isAuthenticated && user?.role && user.role !== 'donor') {
    return <Navigate to="/unauthorized" replace />;
  }
  return <DonorPortal />;
};
