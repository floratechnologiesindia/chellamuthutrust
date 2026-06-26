import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, Menu, X, User, LogOut, Settings, LayoutDashboard, Heart, Landmark, Package, FileText, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useUnreadNotificationCount } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.jpg';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.id);
  const { data: notifications = [] } = useNotifications(user?.id);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'super_admin':
        return '/super-admin';
      case 'admin':
        return '/admin';
      case 'warden':
        return '/warden';
      case 'finance':
        return '/finance';
      case 'donor':
        return '/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img 
            src={logo} 
            alt="MS Chellamuthu Trust Logo" 
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/homes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Homes
          </Link>
          <Link to="/sponsor" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sponsor
          </Link>
          <Link to="/food-calendar" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Food Calendar
          </Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-accent text-accent-foreground">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-2 flex items-center justify-between">
                    <span className="font-medium">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  {notifications.slice(0, 3).map(notification => (
                    <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                      <span className="font-medium text-sm">{notification.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2">{notification.message}</span>
                    </DropdownMenuItem>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="p-2 justify-center text-primary cursor-pointer"
                    onClick={() => navigate('/notifications')}
                  >
                    View all notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2">
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role.replace('_', ' ')}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  {user?.role === 'donor' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/donations')}>
                        <Heart className="mr-2 h-4 w-4" />
                        My Donations
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/profile')}>
                        <User className="mr-2 h-4 w-4" />
                        My Profile
                      </DropdownMenuItem>
                    </>
                  )}
                  {(user?.role === 'super_admin' || user?.role === 'admin') && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/kind-donations')}>
                        <Package className="mr-2 h-4 w-4" />
                        Kind Donations
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/reports')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Reports
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/corpus-fund')}>
                        <Landmark className="mr-2 h-4 w-4" />
                        Corpus Fund
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/kind-donations')}>
                        <Package className="mr-2 h-4 w-4" />
                        Kind Donations
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/super-admin/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                    </>
                  )}
                  {user?.role === 'warden' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/kind-donations')}>
                        <Package className="mr-2 h-4 w-4" />
                        Kind Donations
                      </DropdownMenuItem>
                    </>
                  )}
                  {user?.role === 'finance' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/finance')}>
                        <Wallet className="mr-2 h-4 w-4" />
                        Payment Reconciliation
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={cn(
        "md:hidden border-t border-border bg-card overflow-hidden transition-all duration-300",
        mobileMenuOpen ? "max-h-64" : "max-h-0"
      )}>
        <nav className="container py-4 flex flex-col gap-2">
          <Link 
            to="/homes" 
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
            onClick={() => setMobileMenuOpen(false)}
          >
            Homes
          </Link>
          <Link 
            to="/sponsor" 
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
            onClick={() => setMobileMenuOpen(false)}
          >
            Sponsor
          </Link>
          <Link 
            to="/food-calendar" 
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
            onClick={() => setMobileMenuOpen(false)}
          >
            Food Calendar
          </Link>
          <Link 
            to="/about" 
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
            onClick={() => setMobileMenuOpen(false)}
          >
            About
          </Link>
          {!isAuthenticated && (
            <Link 
              to="/login" 
              className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md sm:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
