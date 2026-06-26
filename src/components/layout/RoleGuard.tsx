import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * RoleGuard component for conditional rendering based on user role.
 * Use this to show/hide UI elements based on the user's role.
 */
export const RoleGuard = ({ 
  children, 
  allowedRoles, 
  fallback = null 
}: RoleGuardProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  if (!allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Convenience components for common role checks
export const AdminOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard allowedRoles={['super_admin', 'admin']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const SuperAdminOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard allowedRoles={['super_admin']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const WardenOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard allowedRoles={['warden']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const DonorOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard allowedRoles={['donor']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const StaffOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard allowedRoles={['super_admin', 'admin', 'warden']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export default RoleGuard;
