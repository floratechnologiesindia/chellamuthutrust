import {
  LayoutDashboard,
  FolderKanban,
  Heart,
  ClipboardList,
  FileHeart,
  BarChart3,
  UtensilsCrossed,
  Settings,
  CalendarPlus,
  Users,
  Landmark,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/super-admin', icon: LayoutDashboard },
  { label: 'Projects', path: '/super-admin/projects', icon: FolderKanban },
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
    <nav className="app-staff-nav" aria-label="Super admin sections">
      {navItems.map((item) => (
        <button
          key={item.path}
          type="button"
          onClick={() => navigate(item.path)}
          className={cn(
            'donor-btn inline-flex items-center gap-2',
            isActive(item.path) ? 'donor-btn-primary app-nav-active' : 'donor-btn-outline',
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </button>
      ))}
    </nav>
  );
};

export default SuperAdminNav;
