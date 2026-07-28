import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LogOut, LayoutDashboard, Settings, Wallet, Package, FileText, Landmark, Bell, Home,
  UtensilsCrossed, ListChecks, CheckSquare,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalBodyClass } from '@/hooks/usePortalBodyClass';
import { WEBSITE_LOGO } from '@/config/website';
import { formatUserRole } from '@/lib/roleLabels';
import { ProjectSwitcher } from '@/components/warden/ProjectSwitcher';
import { WardenNav } from '@/components/warden/WardenNav';

interface AppLayoutProps {
  children: ReactNode;
}

const getInitial = (name?: string) => (name?.trim()?.[0] || 'U').toUpperCase();

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  usePortalBodyClass();

  const dashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'super_admin': return '/super-admin';
      case 'admin': return '/admin';
      case 'warden': return '/warden';
      case 'finance': return '/finance';
      case 'employee': return '/tasks';
      default: return '/';
    }
  };

  return (
    <div className="portal-app min-h-screen flex flex-col bg-white">
      <header className="msc-header msc-header-crm">
        <div className="msc-header-main">
          <div className="msc-header-row">
            <div className="msc-header-logo">
              <Link to={dashboardLink()} aria-label="MSC Trust Operations">
                <img src={WEBSITE_LOGO} alt="MS Chellamuthu Trust" />
              </Link>
            </div>

            <div className={`msc-header-nav-wrap${user?.role === 'warden' ? ' msc-header-nav-wrap--warden' : ''}`}>
              {user?.role === 'warden' ? (
                <WardenNav />
              ) : (
              <nav className="msc-header-nav" aria-label="Operations">
                <ul className="msc-header-nav-list">
                  <li>
                    <Link to={dashboardLink()}>Dashboard</Link>
                  </li>
                  {(user?.role === 'super_admin' || user?.role === 'admin') && (
                    <>
                      <li><Link to="/admin/needs">Requirements</Link></li>
                      <li><Link to="/reports">Reports</Link></li>
                    </>
                  )}
                  {user?.role === 'finance' && (
                    <li><Link to="/finance">Finance</Link></li>
                  )}
                  {user?.role === 'employee' && (
                    <li><Link to="/tasks">My Tasks</Link></li>
                  )}
                </ul>
              </nav>
              )}

              {isAuthenticated && user && (
                <div className="msc-header-account">
                  {user.role === 'warden' && (
                    <div className="msc-header-project-switcher hidden sm:block">
                      <ProjectSwitcher />
                    </div>
                  )}
                  <button
                    type="button"
                    className="msc-header-account-btn relative"
                    aria-label="Notifications"
                    onClick={() => navigate('/notifications')}
                  >
                    <Bell className="h-6 w-6" strokeWidth={2} />
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="msc-header-profile-btn" aria-label="Account menu">
                        <span className="msc-header-profile-initial">{getInitial(user.name)}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="donor-dropdown-menu portal-app w-64 p-0">
                      <div className="donor-dropdown-header p-3 border-b border-[#e6e6e6]">
                        <p className="donor-dropdown-header-name">{user.name}</p>
                        <p className="donor-dropdown-header-role">{formatUserRole(user.role)}</p>
                      </div>
                      <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate(dashboardLink())}>
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                      </DropdownMenuItem>
                      {(user.role === 'super_admin' || user.role === 'admin') && (
                        <>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/reports')}>
                            <FileText className="mr-2 h-4 w-4" /> Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/kind-donations')}>
                            <Package className="mr-2 h-4 w-4" /> Kind Donations
                          </DropdownMenuItem>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/corpus-fund')}>
                            <Landmark className="mr-2 h-4 w-4" /> Corpus Fund
                          </DropdownMenuItem>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/super-admin/settings')}>
                            <Settings className="mr-2 h-4 w-4" /> Settings
                          </DropdownMenuItem>
                        </>
                      )}
                      {user.role === 'finance' && (
                        <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/finance')}>
                          <Wallet className="mr-2 h-4 w-4" /> Finance
                        </DropdownMenuItem>
                      )}
                      {user.role === 'warden' && (
                        <>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/warden/food')}>
                            <UtensilsCrossed className="mr-2 h-4 w-4" /> Food Sponsorships
                          </DropdownMenuItem>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/warden/needs')}>
                            <ListChecks className="mr-2 h-4 w-4" /> Project Requirements
                          </DropdownMenuItem>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/warden/updates')}>
                            <Home className="mr-2 h-4 w-4" /> Project Updates
                          </DropdownMenuItem>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/warden/tasks')}>
                            <CheckSquare className="mr-2 h-4 w-4" /> Task Bar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/warden/donations')}>
                            <Wallet className="mr-2 h-4 w-4" /> Active Donations
                          </DropdownMenuItem>
                          <DropdownMenuItem className="donor-dropdown-item cursor-pointer" onClick={() => navigate('/warden/project')}>
                            <Home className="mr-2 h-4 w-4" /> Project Profile
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator className="donor-dropdown-separator" />
                      <DropdownMenuItem
                        className="donor-dropdown-item donor-dropdown-logout cursor-pointer"
                        onClick={() => { logout(); navigate('/'); }}
                      >
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
};
