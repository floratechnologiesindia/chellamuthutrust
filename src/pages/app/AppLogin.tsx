import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePortalBodyClass } from '@/hooks/usePortalBodyClass';
import { Loader2, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DONOR_PORTAL_URL } from '@/lib/portal';
import { WEBSITE_LOGO } from '@/config/website';
import { isDevLoginVisible } from '@/lib/manualPayments';
import { DEMO_PASSWORD, getDemoAccountLabel, STAFF_DEMO_ACCOUNTS } from '@/lib/devDemoAccounts';

const AppLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(isDevLoginVisible());
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  usePortalBodyClass();

  const redirectByRole = (role: string) => {
    switch (role) {
      case 'super_admin': navigate('/super-admin'); break;
      case 'admin': navigate('/admin'); break;
      case 'warden': navigate('/warden'); break;
      case 'finance': navigate('/finance'); break;
      case 'employee': navigate('/tasks'); break;
      case 'donor':
        toast({
          title: 'Donor account',
          description: `Please use the donor portal at ${DONOR_PORTAL_URL}`,
          variant: 'destructive',
        });
        break;
      default: navigate('/admin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: 'Missing fields', description: 'Enter email and password.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        const role = result.role || 'donor';
        if (role === 'donor') {
          toast({ title: 'Use donor portal', description: `Donors sign in at ${DONOR_PORTAL_URL}`, variant: 'destructive' });
          return;
        }
        toast({ title: 'Welcome back', description: 'Signed in successfully.' });
        redirectByRole(role);
      } else {
        toast({ title: 'Login failed', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setTimeout(() => document.querySelector('form')?.requestSubmit(), 100);
  };

  return (
    <div className="portal-app app-login-shell">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="app-login-card w-full max-w-md bg-white p-8">
          <div className="text-center mb-6">
            <img src={WEBSITE_LOGO} alt="MSC Trust" className="h-14 mx-auto mb-4" />
            <p className="app-login-eyebrow mb-2 inline-flex items-center gap-2 justify-center">
              <Shield className="h-3.5 w-3.5" /> Staff & Operations Portal
            </p>
            <h1 className="app-page-title text-2xl mt-2">Sign In</h1>
            <p className="app-page-subtitle text-sm mt-2">For trust staff, social workers, and administrators</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="donor-input h-11" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" className="donor-input h-11" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button
              type="submit"
              className="donor-btn donor-btn-primary w-full py-3.5 mt-2 inline-flex items-center justify-center gap-2 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>

            <p className="text-xs text-center" style={{ color: '#888' }}>
              Donors: <a href={DONOR_PORTAL_URL} className="text-[#ff6633] hover:underline">donor portal</a>
            </p>

            {isDevLoginVisible() && (
              <Collapsible open={isDemoOpen} onOpenChange={setIsDemoOpen} className="w-full pt-2">
                <CollapsibleTrigger asChild>
                  <button type="button" className="donor-btn donor-btn-outline w-full py-2 text-xs gap-1">
                    Quick login (dev) {isDemoOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 pt-2">
                  <p className="text-[10px] text-center" style={{ color: '#888' }}>
                    Password for all accounts: <strong style={{ color: '#333' }}>{DEMO_PASSWORD}</strong>
                  </p>
                  {STAFF_DEMO_ACCOUNTS.map((a) => (
                    <div key={a.email} className="donor-card flex items-center justify-between gap-2 px-3 py-2">
                      <Badge variant="outline" className="text-[10px] shrink-0 border-[#ff6633]/30 text-[#ff6633]">
                        {getDemoAccountLabel(a.role)}
                      </Badge>
                      <button type="button" className="donor-btn donor-btn-outline py-1 px-2 text-[10px] min-h-0 shrink-0" onClick={() => handleDemoLogin(a.email)}>
                        Login
                      </button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppLogin;
