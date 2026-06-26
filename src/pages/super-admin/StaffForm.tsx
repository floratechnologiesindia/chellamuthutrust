import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, User, Save, Shield, Building2, Home, Key, RefreshCw, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useCreateUser, useTrusts, useUsers, useUpdateUser } from '@/hooks/useUsers';
import { useHomes } from '@/hooks/useHomes';
import { CredentialsModal } from '@/components/users/CredentialsModal';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type StaffRole = 'super_admin' | 'admin' | 'employee' | 'warden' | 'finance';

// Schema for creating new user (password required)
const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Valid phone number is required').optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'employee', 'warden', 'finance']),
  assigned_trust_id: z.string().optional(),
  assigned_home_id: z.string().optional(),
});

// Schema for editing user (password not required)
const editStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required').optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'employee', 'warden', 'finance']),
  assigned_trust_id: z.string().optional(),
  assigned_home_id: z.string().optional(),
});

type StaffFormData = {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: StaffRole;
  assigned_trust_id: string;
  assigned_home_id: string;
};

// Generate a random password
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const StaffForm = () => {
  const navigate = useNavigate();
  const { staffId } = useParams();
  const isEditing = Boolean(staffId);
  const { user, session } = useAuth();

  const [formData, setFormData] = useState<StaffFormData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'employee',
    assigned_trust_id: '',
    assigned_home_id: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof StaffFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState({ email: '', password: '', name: '' });
  const [isFormReady, setIsFormReady] = useState(!isEditing); // Ready immediately if creating

  const { data: trusts = [], isLoading: trustsLoading } = useTrusts();
  const { data: homes = [], isLoading: homesLoading } = useHomes();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  // Check if user is authenticated and is super_admin
  const isAuthenticated = !!session?.access_token;
  const isSuperAdmin = user?.role === 'super_admin';

  // Get existing staff data for editing
  const existingStaff = isEditing ? users.find(u => u.id === staffId) : null;

  // Filter homes based on selected trust
  const filteredHomes = formData.assigned_trust_id 
    ? homes.filter(h => h.trust_id === formData.assigned_trust_id)
    : homes;

  // Populate form when editing
  useEffect(() => {
    if (isEditing && existingStaff) {
      setFormData({
        name: existingStaff.name,
        email: existingStaff.email,
        password: '', // Don't show password
        phone: existingStaff.phone || '',
        role: existingStaff.role as StaffRole,
        assigned_trust_id: existingStaff.trust_id || '',
        assigned_home_id: existingStaff.home_id || '',
      });
      setIsFormReady(true);
    }
  }, [isEditing, existingStaff]);

  const handleChange = (field: keyof StaffFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Clear home selection if trust changes
      if (field === 'assigned_trust_id') {
        updated.assigned_home_id = '';
      }
      // Clear assignments if role doesn't need them
      if (field === 'role' && !['admin', 'employee', 'warden'].includes(value)) {
        updated.assigned_trust_id = '';
        updated.assigned_home_id = '';
      }
      return updated;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Use different schema based on mode
      if (isEditing) {
        editStaffSchema.parse(formData);
      } else {
        createStaffSchema.parse(formData);
      }
      
      // Validate assignments based on role
      if ((formData.role === 'admin' || formData.role === 'employee' || formData.role === 'finance') && !formData.assigned_trust_id) {
        setErrors({ assigned_trust_id: `${formData.role === 'admin' ? 'Admins' : 'Employees'} must be assigned to a trust` });
        toast.error(`Please assign the ${formData.role} to a trust`);
        return;
      }
      if (formData.role === 'warden' && !formData.assigned_home_id) {
        setErrors({ assigned_home_id: 'Social Workers must be assigned to a home' });
        toast.error('Please assign the social worker to a home');
        return;
      }
      
      if (isEditing && staffId) {
        // Update existing staff
        await updateUser.mutateAsync({
          userId: staffId,
          updates: {
            name: formData.name,
            phone: formData.phone || null,
            trust_id: formData.assigned_trust_id || null,
            home_id: formData.assigned_home_id || null,
          },
        });
        toast.success('Staff member updated successfully');
        navigate('/super-admin/staff');
      } else {
        // Create new staff member
        await createUser.mutateAsync({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          role: formData.role,
          trust_id: formData.assigned_trust_id || undefined,
          home_id: formData.assigned_home_id || undefined,
        });

        // Show credentials modal
        setCreatedCredentials({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        });
        setShowCredentialsModal(true);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof StaffFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof StaffFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Please fix the form errors');
      } else if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const handleCredentialsModalClose = () => {
    setShowCredentialsModal(false);
    navigate('/super-admin/staff');
  };

  const getRoleDescription = (role: StaffRole) => {
    const descriptions: Record<StaffRole, string> = {
      super_admin: 'Full platform access. Can manage all trusts, homes, staff, and settings.',
      admin: 'Trust-level access. Can manage homes, needs, and staff within assigned trust.',
      employee: 'Employee access. Can view and complete assigned tasks within their trust.',
      warden: 'Home-level access. Can manage residents, needs, and tasks for assigned home.',
      finance: 'Finance access. Can record bank transactions, upload statements, and reconcile payments within assigned trust.',
    };
    return descriptions[role];

  };

  // Show authentication error if not properly authenticated
  if (!isAuthenticated || !isSuperAdmin) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 max-w-3xl">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              {!isAuthenticated 
                ? 'You are not logged in. Please log in as a Super Admin to manage staff members.'
                : 'You do not have permission to manage staff. Only Super Admins can access this page.'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Show loading state when fetching user data for edit
  if (isEditing && (usersLoading || !isFormReady)) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 max-w-3xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show error if staff not found
  if (isEditing && !existingStaff && !usersLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 max-w-3xl">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Staff Not Found</AlertTitle>
            <AlertDescription>
              The staff member you are trying to edit could not be found.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/super-admin/staff')}>
            Back to Staff List
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/staff')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Update staff information and assignments' : 'Create a new staff account with login credentials'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Staff member's personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter full name"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="staff@example.com"
                    className={errors.email ? 'border-destructive' : ''}
                    disabled={isEditing}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">Email cannot be changed after creation</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password - Only for new users */}
          {!isEditing && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Login Credentials
                </CardTitle>
                <CardDescription>Set initial password for the staff member</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder="Minimum 8 characters"
                        className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGeneratePassword}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  <p className="text-xs text-muted-foreground">
                    Password will be shown after staff creation. Share it securely with the staff member.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role & Permissions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role & Permissions
              </CardTitle>
              <CardDescription>Define staff member's access level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Staff Role *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => handleChange('role', value)}
                  disabled={isEditing} // Role cannot be changed after creation
                >
                  <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="warden">Social Worker</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
                {isEditing && (
                  <p className="text-xs text-muted-foreground">Role cannot be changed after creation</p>
                )}
                {formData.role && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {getRoleDescription(formData.role)}
                  </p>
                )}
              </div>

              {/* Trust Assignment for Admin/Employee */}
              {(formData.role === 'admin' || formData.role === 'employee' || formData.role === 'finance') && (
                <div className="space-y-2">
                  <Label htmlFor="trust" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Assign to Trust *
                  </Label>
                  <Select 
                    value={formData.assigned_trust_id} 
                    onValueChange={(value) => handleChange('assigned_trust_id', value)}
                    disabled={trustsLoading}
                  >
                    <SelectTrigger className={errors.assigned_trust_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder={trustsLoading ? 'Loading trusts...' : 'Select a trust'} />
                    </SelectTrigger>
                    <SelectContent>
                      {trusts.map(trust => (
                        <SelectItem key={trust.id} value={trust.id}>
                          {trust.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.assigned_trust_id && (
                    <p className="text-xs text-destructive">{errors.assigned_trust_id}</p>
                  )}
                </div>
              )}

              {/* Trust & Home Assignment for Social Worker */}
              {formData.role === 'warden' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="trust" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Select Trust
                    </Label>
                    <Select 
                      value={formData.assigned_trust_id || '__all__'} 
                      onValueChange={(value) => handleChange('assigned_trust_id', value === '__all__' ? '' : value)}
                      disabled={trustsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={trustsLoading ? 'Loading...' : 'Select a trust (optional filter)'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Trusts</SelectItem>
                        {trusts.map(trust => (
                          <SelectItem key={trust.id} value={trust.id}>
                            {trust.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="home" className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Assign to Home *
                    </Label>
                    <Select 
                      value={formData.assigned_home_id} 
                      onValueChange={(value) => handleChange('assigned_home_id', value)}
                      disabled={homesLoading}
                    >
                      <SelectTrigger className={errors.assigned_home_id ? 'border-destructive' : ''}>
                        <SelectValue placeholder={homesLoading ? 'Loading...' : 'Select a home'} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredHomes.map(home => {
                          const trust = trusts.find(t => t.id === home.trust_id);
                          return (
                            <SelectItem key={home.id} value={home.id}>
                              {home.name} ({home.city}){trust ? ` - ${trust.name}` : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {errors.assigned_home_id && (
                      <p className="text-xs text-destructive">{errors.assigned_home_id}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/super-admin/staff')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createUser.isPending || updateUser.isPending}
            >
              {(createUser.isPending || updateUser.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update Staff' : 'Create Staff'}
            </Button>
          </div>
        </form>

        {/* Credentials Modal */}
        <CredentialsModal
          open={showCredentialsModal}
          onClose={handleCredentialsModalClose}
          email={createdCredentials.email}
          password={createdCredentials.password}
          userName={createdCredentials.name}
        />
      </div>
    </MainLayout>
  );
};

export default StaffForm;
