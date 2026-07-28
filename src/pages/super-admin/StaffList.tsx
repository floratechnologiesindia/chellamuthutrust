import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Shield,
  UserCog,
  User as UserIcon,
  Briefcase,
  Loader2,
  Key,
  Home,
  Building2,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUsers, useUpdateUserStatus, useResetPassword, UserWithRole } from '@/hooks/useUsers';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';
import { CredentialsModal } from '@/components/users/CredentialsModal';
import { useAuth } from '@/contexts/AuthContext';

type StaffRole = 'super_admin' | 'admin' | 'employee' | 'warden' | 'finance';

const StaffList = () => {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<UserWithRole | null>(null);
  
  // Reset password state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [resetCredentials, setResetCredentials] = useState({
    email: '',
    password: '',
    name: '',
  });

  const { data: users = [], isLoading, error, refetch } = useUsers();
  const updateStatus = useUpdateUserStatus();
  const resetPassword = useResetPassword();

  // Filter out donors - Staff only includes super_admin, admin, employee, warden
  const staffUsers = users.filter(user => user.role !== 'donor');

  // Apply search and filters
  const filteredStaff = staffUsers.filter(staff => {
    const matchesSearch = 
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || staff.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || staff.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: StaffRole) => {
    const config: Record<StaffRole, { label: string; className: string }> = {
      super_admin: { label: 'Super Admin', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      admin: { label: 'Admin', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      employee: { label: 'Employee', className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
      warden: { label: 'Social Worker', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      finance: { label: 'Finance', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    };
    const { label, className } = config[role];
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  const getRoleIcon = (role: StaffRole) => {
    const icons: Record<StaffRole, JSX.Element> = {
      super_admin: <Shield className="h-4 w-4" />,
      admin: <UserCog className="h-4 w-4" />,
      employee: <Briefcase className="h-4 w-4" />,
      warden: <UserIcon className="h-4 w-4" />,
      finance: <Briefcase className="h-4 w-4" />,
    };
    return icons[role];
  };

  const getAssignment = (staff: UserWithRole) => {
    if (staff.role === 'warden') {
      const names =
        staff.assigned_project_names?.filter(Boolean) ||
        (staff.home_name ? [staff.home_name] : []);
      if (names.length === 0) {
        return <span className="text-sm text-muted-foreground">Not assigned</span>;
      }
      return (
        <div className="flex items-start gap-1.5 text-amber-600">
          <Home className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="text-sm">
            {names.length === 1 ? names[0] : `${names.length} projects`}
            {names.length > 1 && (
              <span className="block text-xs text-muted-foreground font-normal">
                {names.slice(0, 2).join(', ')}
                {names.length > 2 ? ` +${names.length - 2} more` : ''}
              </span>
            )}
          </span>
        </div>
      );
    }
    if ((staff.role === 'admin' || staff.role === 'employee' || staff.role === 'finance') && staff.trust_name) {
      return (
        <div className="flex items-center gap-1.5 text-blue-600">
          <Building2 className="h-3.5 w-3.5" />
          <span className="text-sm">{staff.trust_name}</span>
        </div>
      );
    }
    if (staff.role === 'super_admin') {
      return <span className="text-sm text-muted-foreground">Platform-wide</span>;
    }
    return <span className="text-sm text-muted-foreground">Not assigned</span>;
  };

  const handleDelete = (staff: UserWithRole) => {
    setStaffToDelete(staff);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (staffToDelete) {
      // TODO: Implement actual deletion
      toast.success(`${staffToDelete.name} has been removed`);
    }
    setDeleteDialogOpen(false);
    setStaffToDelete(null);
  };

  const toggleStatus = async (staff: UserWithRole) => {
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStatus.mutateAsync({ userId: staff.id, status: newStatus });
      toast.success(`${staff.name} is now ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleResetPassword = async (staff: UserWithRole) => {
    try {
      const result = await resetPassword.mutateAsync(staff.id);
      setResetCredentials({
        email: staff.email,
        password: result.password,
        name: staff.name,
      });
      setShowCredentialsModal(true);
      toast.success(`Password reset for ${staff.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    }
  };

  // Stats - only for staff (excluding donors)
  const totalStaff = staffUsers.length;
  const activeStaff = staffUsers.filter(u => u.status === 'active').length;
  const adminCount = staffUsers.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
  const employeeCount = staffUsers.filter(u => u.role === 'employee').length;
  const wardenCount = staffUsers.filter(u => u.role === 'warden').length;

  // Auth loading state
  if (authLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Auth check - must be logged in as super_admin
  if (!isAuthenticated || authUser?.role !== 'super_admin') {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center space-y-4">
            <p className="text-destructive text-lg">You must be logged in as a Super Admin to access this page.</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4">
          <SuperAdminNav />
          <div className="text-center space-y-4 py-8">
            <p className="text-destructive text-lg">Failed to load staff</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Navigation */}
        <SuperAdminNav />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground mt-1">Manage admins, employees, and social workers</p>
          </div>
          <Button onClick={() => navigate('/super-admin/staff/new')} className="mt-4 md:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                  <p className="text-2xl font-bold text-foreground">{totalStaff}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{activeStaff}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold text-foreground">{adminCount}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Employees</p>
                  <p className="text-2xl font-bold text-foreground">{employeeCount}</p>
                </div>
                <Briefcase className="h-8 w-8 text-cyan-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Social Workers</p>
                  <p className="text-2xl font-bold text-foreground">{wardenCount}</p>
                </div>
                <UserIcon className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="warden">Social Worker</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Staff ({filteredStaff.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {staff.avatar_url ? (
                              <img src={staff.avatar_url} alt={staff.name} className="h-full w-full object-cover rounded-full" />
                            ) : (
                              getRoleIcon(staff.role as StaffRole)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{staff.name}</p>
                            <p className="text-sm text-muted-foreground">{staff.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(staff.role as StaffRole)}</TableCell>
                      <TableCell>{getAssignment(staff)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            staff.status === 'active' 
                              ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {staff.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {staff.phone || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleStatus(staff)}
                            disabled={updateStatus.isPending}
                            title={staff.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {staff.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleResetPassword(staff)}
                            disabled={resetPassword.isPending}
                            title="Reset Password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/super-admin/staff/${staff.id}/edit`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredStaff.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No staff found matching your filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove "{staffToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Credentials Modal */}
        <CredentialsModal
          open={showCredentialsModal}
          onClose={() => setShowCredentialsModal(false)}
          email={resetCredentials.email}
          password={resetCredentials.password}
          userName={resetCredentials.name}
        />
      </div>
    </MainLayout>
  );
};

export default StaffList;
