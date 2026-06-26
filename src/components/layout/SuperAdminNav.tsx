import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Home, 
  Heart, 
  ClipboardList, 
  FileHeart,
  BarChart3,
  UtensilsCrossed,
  Settings,
  CalendarPlus,
  Users,
  Landmark
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/super-admin', icon: LayoutDashboard },
  { label: 'Homes', path: '/super-admin/homes', icon: Home },
  { label: 'Donors', path: '/super-admin/donors', icon: Heart },
  { label: 'Staff', path: '/super-admin/staff', icon: Users },
  { label: 'Booking', path: '/super-admin/booking', icon: CalendarPlus },
  { label: 'Requirements', path: '/admin/needs', icon: FileHeart },
  { label: 'Tasks', path: '/super-admin/task-dashboard', icon: ClipboardList },
  { label: 'Food Calendar', path: '/food-calendar', icon: UtensilsCrossed },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Finance', path: '/finance', icon: Landmark },
  { label: 'Settings', path: '/super-admin/settings', icon: Settings },
];

export const SuperAdminNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/super-admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6 p-4 bg-muted/30 rounded-lg border">
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant={isActive(item.path) ? 'default' : 'outline'}
          size="sm"
          onClick={() => navigate(item.path)}
          className={cn(
            'gap-2',
            isActive(item.path) && 'shadow-md'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </div>
  );
};

export default SuperAdminNav;
