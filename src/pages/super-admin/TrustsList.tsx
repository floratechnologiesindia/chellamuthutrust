import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Home,
  Users,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTrusts, useHomes } from '@/hooks/useHomes';
import { useUsers } from '@/hooks/useUsers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';
import { useQueryClient } from '@tanstack/react-query';

const TrustsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trustToDelete, setTrustToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: trusts = [], isLoading: trustsLoading } = useTrusts();
  const { data: homes = [], isLoading: homesLoading } = useHomes();
  const { data: users = [], isLoading: usersLoading } = useUsers();

  const isLoading = trustsLoading || homesLoading;

  // Filter trusts
  const filteredTrusts = trusts.filter(trust => 
    trust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (trust as any).city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTrustStats = (trustId: string) => {
    const trustHomes = homes.filter(h => h.trust_id === trustId);
    const staffCount = users.filter(u => 
      ['admin', 'warden', 'employee'].includes(u.role) && u.trust_id === trustId
    ).length;
    return { homesCount: trustHomes.length, staffCount };
  };

  const handleDelete = (trust: { id: string; name: string }) => {
    setTrustToDelete(trust);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!trustToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('trusts')
        .delete()
        .eq('id', trustToDelete.id);
      
      if (error) throw error;
      toast.success(`${trustToDelete.name} has been deleted`);
      queryClient.invalidateQueries({ queryKey: ['trusts'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete trust');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTrustToDelete(null);
    }
  };

  const totalStaff = users.filter(u => ['admin', 'warden', 'employee'].includes(u.role)).length;
  const uniqueCities = new Set(trusts.map((t: any) => t.city).filter(Boolean)).size;

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Navigation */}
        <SuperAdminNav />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Trust Management</h1>
            <p className="text-muted-foreground mt-1">Manage all trusts on the platform</p>
          </div>
          <Button onClick={() => navigate('/super-admin/trusts/new')} className="mt-4 md:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Trust
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trusts</p>
                  {isLoading ? <Skeleton className="h-8 w-8" /> : (
                    <p className="text-2xl font-bold text-foreground">{trusts.length}</p>
                  )}
                </div>
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                  {isLoading ? <Skeleton className="h-8 w-8" /> : (
                    <p className="text-2xl font-bold text-foreground">{homes.length}</p>
                  )}
                </div>
                <Home className="h-8 w-8 text-secondary-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cities</p>
                  {isLoading ? <Skeleton className="h-8 w-8" /> : (
                    <p className="text-2xl font-bold text-foreground">{uniqueCities}</p>
                  )}
                </div>
                <MapPin className="h-8 w-8 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Staff Assigned</p>
                  {usersLoading ? <Skeleton className="h-8 w-8" /> : (
                    <p className="text-2xl font-bold text-foreground">{totalStaff}</p>
                  )}
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trusts by name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Trusts Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Trusts ({filteredTrusts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trust</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrusts.map((trust: any) => {
                    const stats = getTrustStats(trust.id);
                    return (
                      <TableRow key={trust.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-primary/10 flex-shrink-0">
                              {trust.image_url ? (
                                <img src={trust.image_url} alt={trust.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Building2 className="h-5 w-5 text-primary" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{trust.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {trust.description}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {trust.city}, {trust.state}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {trust.registration_number || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{stats.homesCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-muted-foreground">{trust.contact_email}</p>
                            <p className="text-xs text-muted-foreground">{trust.contact_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/super-admin/trusts/${trust.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete({ id: trust.id, name: trust.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredTrusts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No trusts found matching your search
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
              <AlertDialogTitle>Delete Trust</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{trustToDelete?.name}"? This action cannot be undone and will remove all associated homes and data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default TrustsList;
