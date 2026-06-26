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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Home,
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users,
  MapPin,
  Baby,
  PersonStanding,
  Eye,
  LogIn,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHomes, useTrusts } from '@/hooks/useHomes';
import { toast } from 'sonner';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const homeTypeLabels: Record<string, string> = {
  children_home: 'Children Home',
  old_age_home: 'Old Age Home',
  mixed: 'Mixed',
  others: 'Others',
};

const homeTypeColors: Record<string, string> = {
  children_home: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  old_age_home: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  mixed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  others: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const HomesList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTrust, setSelectedTrust] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [homeToDelete, setHomeToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [impersonatingHomeId, setImpersonatingHomeId] = useState<string | null>(null);
  const { data: homes, isLoading: loadingHomes } = useHomes();
  const { data: trusts, isLoading: loadingTrusts } = useTrusts();

  // Filter homes
  const filteredHomes = homes?.filter(home => {
    const matchesSearch = 
      home.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      home.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      home.trusts?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || home.type === selectedType;
    const matchesTrust = selectedTrust === 'all' || home.trust_id === selectedTrust;
    return matchesSearch && matchesType && matchesTrust;
  }) || [];

  const handleDelete = (home: any) => {
    setHomeToDelete(home);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!homeToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('homes')
        .delete()
        .eq('id', homeToDelete.id);

      if (error) throw error;

      toast.success(`${homeToDelete.name} has been deleted`);
      queryClient.invalidateQueries({ queryKey: ['homes'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete home');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setHomeToDelete(null);
    }
  };

  const getTotalCapacity = (home: any) => {
    return (home.capacity_children_male || 0) + (home.capacity_children_female || 0) + 
           (home.capacity_elderly_male || 0) + (home.capacity_elderly_female || 0);
  };

  const handleLoginAsHome = async (home: any) => {
    if (!home.primary_warden_id) {
      toast.error('This home has no login credentials set up. Please edit the home to create credentials first.');
      return;
    }
    
    setImpersonatingHomeId(home.id);
    try {
      const { data, error } = await supabase.functions.invoke('impersonate-home', {
        body: { home_id: home.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.link) {
        window.open(data.link, '_blank');
        toast.success(`Opened login for ${data.home_name || home.name} in a new tab`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate login link');
    } finally {
      setImpersonatingHomeId(null);
    }
  };
  // Get unique cities for stats
  const uniqueCities = new Set(homes?.map(h => h.city) || []);

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Navigation */}
        <SuperAdminNav />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Home Management</h1>
            <p className="text-muted-foreground mt-1">Manage all care homes on the platform</p>
          </div>
          <Button onClick={() => navigate('/super-admin/homes/new')} className="mt-4 md:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Home
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Homes</p>
                  {loadingHomes ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{homes?.length || 0}</p>
                  )}
                </div>
                <Home className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Children Capacity</p>
                  {loadingHomes ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {homes?.reduce((sum, h) => sum + (h.capacity_children_male || 0) + (h.capacity_children_female || 0), 0) || 0}
                    </p>
                  )}
                </div>
                <Baby className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Elderly Capacity</p>
                  {loadingHomes ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {homes?.reduce((sum, h) => sum + (h.capacity_elderly_male || 0) + (h.capacity_elderly_female || 0), 0) || 0}
                    </p>
                  )}
                </div>
                <PersonStanding className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cities</p>
                  {loadingHomes ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{uniqueCities.size}</p>
                  )}
                </div>
                <MapPin className="h-8 w-8 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search homes by name, city, or trust..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="children_home">Children Home</SelectItem>
                  <SelectItem value="old_age_home">Old Age Home</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedTrust} onValueChange={setSelectedTrust}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by trust" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trusts</SelectItem>
                  {trusts?.map(trust => (
                    <SelectItem key={trust.id} value={trust.id}>{trust.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Homes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Homes ({filteredHomes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHomes ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Home</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trust</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHomes.map((home) => (
                    <TableRow key={home.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden bg-primary/10 flex-shrink-0">
                            {home.image_url ? (
                              <img src={home.image_url} alt={home.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Home className="h-5 w-5 text-primary" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{home.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {home.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={homeTypeColors[home.type] || homeTypeColors.others}>
                          {homeTypeLabels[home.type] || home.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {home.trusts?.name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {home.city}, {home.state}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{getTotalCapacity(home)}</span>
                            <span className="text-muted-foreground">total</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(home.capacity_children_male || 0) + (home.capacity_children_female || 0)} children, {(home.capacity_elderly_male || 0) + (home.capacity_elderly_female || 0)} elderly
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleLoginAsHome(home)}
                            disabled={impersonatingHomeId === home.id}
                            title="Login as Home"
                            className="text-primary hover:text-primary"
                          >
                            {impersonatingHomeId === home.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <LogIn className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/homes/${home.id}`)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/super-admin/homes/${home.id}/edit`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(home)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredHomes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No homes found matching your search
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
              <AlertDialogTitle>Delete Home</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{homeToDelete?.name}"? This action cannot be undone and will remove all associated data including residents, needs, and donations.
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

export default HomesList;
