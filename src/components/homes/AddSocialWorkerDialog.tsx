import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useCreateUser } from '@/hooks/useUsers';
import { CredentialsModal } from '@/components/users/CredentialsModal';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
});

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 12 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

interface AddSocialWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trustId: string;
  trustName?: string;
  onCreated: (userId: string) => void;
}

export function AddSocialWorkerDialog({
  open,
  onOpenChange,
  trustId,
  trustName,
  onCreated,
}: AddSocialWorkerDialogProps) {
  const createUser = useCreateUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null);

  useEffect(() => {
    if (open && !password) {
      setPassword(generatePassword());
    }
  }, [open, password]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword(generatePassword());
    setErrors({});
    setShowPassword(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = schema.parse({ name, email, password, phone: phone || undefined });
      const result = await createUser.mutateAsync({
        name: validated.name,
        email: validated.email,
        password: validated.password,
        phone: validated.phone,
        role: 'warden',
        trust_id: trustId,
      });
      const userId = result.user_id as string;
      setCredentials({
        name: validated.name,
        email: validated.email,
        password: validated.password,
      });
      onCreated(userId);
      onOpenChange(false);
      resetForm();
      toast.success('Social worker created — save the project to assign them to this home.');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add Social Worker</DialogTitle>
              <DialogDescription>
                Create a new social worker{trustName ? ` for ${trustName}` : ''}. They will be assigned to this project when you save.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sw-name">Full Name *</Label>
                <Input
                  id="sw-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Lakshmi"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sw-email">Email *</Label>
                <Input
                  id="sw-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sw-phone">Phone</Label>
                <Input
                  id="sw-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sw-password">Password *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="sw-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pr-10 font-mono ${errors.password ? 'border-destructive' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => setPassword(generatePassword())}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Social Worker'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {credentials && (
        <CredentialsModal
          open={Boolean(credentials)}
          onClose={() => setCredentials(null)}
          email={credentials.email}
          password={credentials.password}
          userName={credentials.name}
        />
      )}
    </>
  );
}
