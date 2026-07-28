import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEMO_PASSWORD, getDemoAccountLabel, LEGACY_DEMO_ACCOUNTS } from '@/lib/devDemoAccounts';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setTimeout(() => {
      const form = document.querySelector('form');
      form?.requestSubmit();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both email and password.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        
        // Wait a moment to ensure user profile is loaded, then redirect
        setTimeout(async () => {
          // Re-fetch to get latest user data for redirect
          const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
          if (session) {
            const { data: roleData } = await (await import('@/integrations/supabase/client')).supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            const role = roleData?.role || 'donor';
            switch (role) {
              case 'super_admin':
                navigate('/super-admin');
                break;
              case 'admin':
                navigate('/admin');
                break;
              case 'warden':
                navigate('/warden');
                break;
              case 'employee':
                navigate('/tasks');
                break;
              default:
                navigate('/dashboard');
            }
          } else {
            navigate('/dashboard');
          }
        }, 100);
      } else {
        toast({
          title: 'Login failed',
          description: result.error || 'Please check your credentials and try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-display font-bold text-2xl">C</span>
            </div>
            <CardTitle className="font-display text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to continue making a difference
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Register here
                </Link>
              </p>
              
              <Collapsible open={isDemoOpen} onOpenChange={setIsDemoOpen} className="w-full">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1">
                    Demo Accounts
                    {isDemoOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 pt-2">
                  {LEGACY_DEMO_ACCOUNTS.map((account) => (
                    <div key={account.email} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5">
                      <Badge className={`${account.color} text-[10px] px-1.5 py-0 shrink-0`}>
                        {getDemoAccountLabel(account.role)}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 shrink-0"
                        disabled={isSubmitting}
                        onClick={() => handleDemoLogin(account.email)}
                      >
                        Login
                      </Button>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    Password: {DEMO_PASSWORD}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </CardFooter>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Login;
