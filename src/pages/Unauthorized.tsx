import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'super_admin':
      case 'admin':
        return '/admin';
      case 'warden':
        return '/warden';
      case 'donor':
        return '/dashboard';
      default:
        return '/';
    }
  };

  return (
    <MainLayout>
      <div className="container py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          You don't have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button onClick={() => navigate(getDashboardLink())}>
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Unauthorized;
