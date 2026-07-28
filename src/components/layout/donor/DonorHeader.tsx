import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useNotifications,
  useMarkNotificationRead,
  type Notification,
} from '@/hooks/useNotifications';
import {
  WEBSITE_NAV, WEBSITE_LOGO, WEBSITE_LOGO_WIDE, DONOR_PANEL_NAV,
} from '@/config/website';
import { cn } from '@/lib/utils';
import { receiptPathFromDedupeKey } from '@/lib/donorReceipt';

const getDonorInitial = (name?: string) => (name?.trim()?.[0] || 'D').toUpperCase();

const DonorNotificationMenu = ({
  userId,
  onNavigate,
}: {
  userId: string;
  onNavigate: (path: string) => void;
}) => {
  const { data } = useNotifications(userId, { poll: true });
  const notifications = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const markAsRead = useMarkNotificationRead();

  const handleOpenNotification = (notification: Notification) => {
    if (!notification.is_read) {
      void markAsRead.mutateAsync(notification.id);
    }
    if (notification.type === 'receipt_ready') {
      const receiptPath = receiptPathFromDedupeKey(notification.dedupe_key);
      if (receiptPath) {
        onNavigate(receiptPath);
        return;
      }
    }
    onNavigate('/notifications');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="msc-header-account-btn relative" aria-label="Notifications">
          <Bell className="h-6 w-6" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-h-5 min-w-5 px-1 rounded-full bg-[#ff6633] text-white text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="donor-dropdown-menu portal-donor w-80 p-0">
        {notifications.slice(0, 3).map((n) => (
          <DropdownMenuItem
            key={n.id}
            className="donor-dropdown-item flex flex-col items-start gap-1 p-3 cursor-pointer"
            onClick={() => handleOpenNotification(n)}
          >
            <span className="donor-dropdown-item-title">{n.title}</span>
            <span className="donor-dropdown-item-message line-clamp-2">{n.message}</span>
          </DropdownMenuItem>
        ))}
        {notifications.length === 0 && (
          <div className="donor-dropdown-empty">No notifications</div>
        )}
        <DropdownMenuSeparator className="donor-dropdown-separator" />
        <DropdownMenuItem
          className="donor-dropdown-item donor-dropdown-view-all cursor-pointer"
          onClick={() => onNavigate('/notifications')}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const DonorProfileMenu = ({
  user,
  onNavigate,
  onLogout,
}: {
  user: { name?: string };
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className="msc-header-profile-btn" aria-label="Account menu">
        <span className="msc-header-profile-initial" aria-hidden>
          {getDonorInitial(user.name)}
        </span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="donor-dropdown-menu portal-donor w-56 p-0">
      <div className="donor-dropdown-header">
        <p className="donor-dropdown-header-name">{user.name}</p>
        <p className="donor-dropdown-header-role">Donor</p>
      </div>
      <DropdownMenuSeparator className="donor-dropdown-separator" />
      {DONOR_PANEL_NAV.map((item) => (
        <DropdownMenuItem
          key={item.path}
          className="donor-dropdown-item cursor-pointer"
          onClick={() => onNavigate(item.path)}
        >
          {item.label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator className="donor-dropdown-separator" />
      <DropdownMenuItem
        onClick={onLogout}
        className="donor-dropdown-item donor-dropdown-logout cursor-pointer"
      >
        <LogOut className="mr-2 h-4 w-4" /> Logout
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const DonorHeader = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const searchTab = new URLSearchParams(location.search).get('tab') || 'food';

  const isPanelPath = (path: string) => {
    if (path.startsWith('/?tab=')) {
      const tab = path.replace('/?tab=', '');
      return location.pathname === '/' && searchTab === tab;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const accountMenu = isAuthenticated ? (
    <div className="msc-header-account">
      <DonorNotificationMenu userId={user!.id} onNavigate={navigate} />
      <DonorProfileMenu
        user={user!}
        onNavigate={(path) => navigate(path)}
        onLogout={handleLogout}
      />
    </div>
  ) : null;

  return (
    <header className="msc-header">
      <div className="msc-header-main">
        {/* Desktop — matches msctrust.org et_pb_row_3_tb_header */}
        <div className="msc-header-row">
          <div className="msc-header-logo">
            <Link to="/">
              <img
                src={WEBSITE_LOGO}
                alt="M.S. Chellamuthu Trust & Research Foundation"
                width={202}
                height={88}
              />
            </Link>
          </div>

          <div className="msc-header-nav-wrap">
            <nav className="msc-header-nav" aria-label="Main">
              <ul className="msc-header-nav-list">
                {WEBSITE_NAV.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            {accountMenu}
          </div>
        </div>

        {/* Mobile */}
        <div className="msc-header-mobile-bar">
          <Link to="/">
            <img src={WEBSITE_LOGO_WIDE} alt="MS Chellamuthu Trust" className="msc-header-mobile-logo" />
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated && user && (
              <>
                <DonorNotificationMenu
                  userId={user.id}
                  onNavigate={(path) => {
                    navigate(path);
                    setMobileOpen(false);
                  }}
                />
                <DonorProfileMenu
                  user={user}
                  onNavigate={(path) => {
                    navigate(path);
                    setMobileOpen(false);
                  }}
                  onLogout={handleLogout}
                />
              </>
            )}
            <button
              type="button"
              className="msc-mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <div className={cn('msc-mobile-drawer', mobileOpen && 'is-open')}>
          <nav>
            {WEBSITE_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            {!isAuthenticated ? (
              <>
                <Link to="/" onClick={() => setMobileOpen(false)}>Sign In</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>Create Account</Link>
              </>
            ) : (
              <>
                {DONOR_PANEL_NAV.map((item) => {
                  if (item.auth && !isAuthenticated) return null;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={isPanelPath(item.path) ? 'font-semibold' : undefined}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <button type="button" className="msc-mobile-logout" onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
