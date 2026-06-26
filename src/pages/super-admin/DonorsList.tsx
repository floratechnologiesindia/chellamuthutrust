import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { BulkUploadDialog } from '@/components/donors/BulkUploadDialog';
import SuperAdminNav from '@/components/layout/SuperAdminNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  Eye, 
  Calendar,
  Phone,
  Mail,
  Users,
  IndianRupee,
  Heart,
  Pencil,
  Upload,
  Trash2
} from 'lucide-react';
import { useDonors, useUpdateDonorStatus, useDeleteDonor, DonorWithStats } from '@/hooks/useDonors';
import { format } from 'date-fns';

const DonorsList = () => {
  const navigate = useNavigate();
  const { data: donors, isLoading, error } = useDonors();
  const updateStatus = useUpdateDonorStatus();
  const deleteDonor = useDeleteDonor();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const getCategoryBadge = (category: string | null) => {
    switch (category) {
      case 'monthly':
        return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Monthly</Badge>;
      case 'yearly':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">Yearly</Badge>;
      case 'public':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">Public</Badge>;
      case 'csr':
        return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">CSR</Badge>;
      default:
        return <Badge variant="secondary">Uncategorized</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">● Active</Badge>;
    }
    return <Badge variant="secondary">● {status || 'Unknown'}</Badge>;
  };

  const filteredDonors = donors?.filter((donor: DonorWithStats) => {
    const matchesSearch = 
      donor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donor.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donor.organization?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || donor.donor_category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || donor.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  const handleStatusToggle = (donor: DonorWithStats) => {
    const newStatus = donor.status === 'active' ? 'inactive' : 'active';
    updateStatus.mutate({ id: donor.id, status: newStatus });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Stats
  const totalDonors = donors?.length || 0;
  const activeDonors = donors?.filter(d => d.status === 'active').length || 0;
  const totalDonationsAmount = donors?.reduce((sum, d) => sum + d.total_donations_amount, 0) || 0;
  const monthlyDonors = donors?.filter(d => d.donor_category === 'monthly').length || 0;

  if (error) {
    return (
      <MainLayout>
        <SuperAdminNav />
        <div className="text-center py-8 text-destructive">
          Error loading donors: {error.message}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
      <SuperAdminNav />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              Donor Management
            </h1>
            <p className="text-muted-foreground">Manage and track all donors</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkUploadOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button onClick={() => navigate('/super-admin/donors/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Donor
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Donors</p>
                  <p className="text-2xl font-bold">{totalDonors}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <Heart className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Donors</p>
                  <p className="text-2xl font-bold">{activeDonors}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-100">
                  <IndianRupee className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Donations</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalDonationsAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Donors</p>
                  <p className="text-2xl font-bold">{monthlyDonors}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="csr">CSR</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
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

        {/* Donors Table */}
        <Card>
          <CardHeader>
            <CardTitle>Donors ({filteredDonors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredDonors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No donors found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Total Donations</TableHead>
                    <TableHead>Last Interaction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonors.map((donor) => (
                    <TableRow key={donor.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{donor.name}</p>
                          {donor.organization && (
                            <p className="text-sm text-muted-foreground">{donor.organization}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(donor.donor_category)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {donor.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {donor.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {donor.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatCurrency(donor.total_donations_amount)}</p>
                          <p className="text-sm text-muted-foreground">
                            {donor.total_donations_count} donation{donor.total_donations_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {donor.last_interaction 
                          ? format(new Date(donor.last_interaction), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleStatusToggle(donor)}>
                          {getStatusBadge(donor.status)}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="View Details"
                            onClick={() => navigate(`/super-admin/donors/${donor.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Edit Donor"
                            onClick={() => navigate(`/super-admin/donors/${donor.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="View Calendar"
                            onClick={() => navigate(`/super-admin/booking?donorId=${donor.id}`)}
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Delete Donor"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Donor</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{donor.name}</strong>? This will permanently remove their account, donations, and all related records. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDonor.mutate(donor.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <BulkUploadDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />
      </div>
    </MainLayout>
  );
};

export default DonorsList;
