import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Package, Calendar, Home, IndianRupee } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveProject } from '@/hooks/useActiveProject';
import { useTrusts, useReportHomes } from '@/hooks/useReportData';
import { useKindDonations, useCreateKindDonation, useDeleteKindDonation, useKindDonationStats } from '@/hooks/useKindDonations';
import {
  DonorClassificationFields,
  emptyDonorClassification,
  type DonorClassificationValues,
} from '@/components/donor/DonorClassificationFields';

const ITEM_TYPES = [
  'Food Items',
  'Clothing',
  'Books & Stationery',
  'Medical Supplies',
  'Furniture',
  'Electronics',
  'Toys & Games',
  'Household Items',
  'Other',
];

export default function KindDonations() {
  const { user } = useAuth();
  const isWarden = user?.role === 'warden';
  const { homeId: activeHomeId, assignedProjectIds } = useActiveProject();
  const [selectedTrust, setSelectedTrust] = useState<string>('all');
  const [selectedHome, setSelectedHome] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const trustId = selectedTrust === 'all' ? null : selectedTrust;
  const homeId = selectedHome === 'all' ? null : selectedHome;
  const { data: trusts } = useTrusts();
  const { data: homes } = useReportHomes(trustId);
  const { data: donations, isLoading } = useKindDonations(trustId, homeId);
  const { data: stats } = useKindDonationStats(trustId);
  const createMutation = useCreateKindDonation();
  const deleteMutation = useDeleteKindDonation();

  const [donorInfo, setDonorInfo] = useState<DonorClassificationValues>(emptyDonorClassification());

  const [formData, setFormData] = useState({
    trust_id: '',
    home_id: '',
    donor_name: '',
    item_type: '',
    item_description: '',
    quantity: '1',
    estimated_value: '',
    received_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const wardenHomes = isWarden
    ? (homes || []).filter((h) => assignedProjectIds.includes(h.id))
    : homes;

  useEffect(() => {
    if (isWarden && activeHomeId) {
      setSelectedHome(activeHomeId);
      const activeHome = wardenHomes?.find((h) => h.id === activeHomeId);
      if (activeHome?.trust_id) {
        setSelectedTrust(activeHome.trust_id);
      }
    }
  }, [isWarden, activeHomeId, wardenHomes]);

  const filteredHomes = formData.trust_id 
    ? (isWarden ? wardenHomes : homes)?.filter(h => h.trust_id === formData.trust_id) 
    : (isWarden ? wardenHomes : homes);

  useEffect(() => {
    if (isWarden && isDialogOpen && activeHomeId) {
      const activeHome = wardenHomes?.find((h) => h.id === activeHomeId);
      setFormData((prev) => ({
        ...prev,
        trust_id: activeHome?.trust_id || user?.trust_id || prev.trust_id,
        home_id: activeHomeId,
      }));
    }
  }, [isWarden, isDialogOpen, activeHomeId, wardenHomes, user?.trust_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trust_id || !formData.home_id || !formData.item_type || !formData.received_date) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await createMutation.mutateAsync({
        trust_id: formData.trust_id,
        home_id: formData.home_id,
        donor_name: donorInfo.donor_name || formData.donor_name || null,
        donor_address: donorInfo.donor_address || null,
        donor_pan: donorInfo.donor_pan || null,
        donor_phone: donorInfo.donor_phone || null,
        donor_email: donorInfo.donor_email || null,
        donor_frequency: donorInfo.donor_frequency,
        item_type: formData.item_type,
        item_description: formData.item_description || null,
        quantity: formData.quantity ? parseInt(formData.quantity) : 1,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        received_date: formData.received_date,
        notes: formData.notes || null,
      });
      toast.success('Kind donation recorded successfully');
      setIsDialogOpen(false);
      setDonorInfo(emptyDonorClassification());
      setFormData({
        trust_id: '',
        home_id: '',
        donor_name: '',
        item_type: '',
        item_description: '',
        quantity: '1',
        estimated_value: '',
        received_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    } catch (error) {
      toast.error('Failed to record donation');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Donation record deleted');
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kind Donations</h1>
            <p className="text-muted-foreground">Track in-kind donations received</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!isWarden && (
              <Select value={selectedTrust} onValueChange={(v) => { setSelectedTrust(v); setSelectedHome('all'); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by Trust" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trusts</SelectItem>
                  {trusts?.map((trust) => (
                    <SelectItem key={trust.id} value={trust.id}>{trust.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedHome} onValueChange={setSelectedHome}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by Project" />
              </SelectTrigger>
              <SelectContent>
                {!isWarden && <SelectItem value="all">All Projects</SelectItem>}
                {(isWarden ? wardenHomes : homes)?.map((home) => (
                  <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Donation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record Kind Donation</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Trust *</Label>
                      <Select value={formData.trust_id} onValueChange={(v) => setFormData({ ...formData, trust_id: v, home_id: '' })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {trusts?.map((trust) => (
                            <SelectItem key={trust.id} value={trust.id}>{trust.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Project *</Label>
                      <Select value={formData.home_id} onValueChange={(v) => setFormData({ ...formData, home_id: v })} disabled={!formData.trust_id}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredHomes?.map((home) => (
                            <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DonorClassificationFields
                    values={{
                      ...donorInfo,
                      donor_name: donorInfo.donor_name || formData.donor_name,
                    }}
                    onChange={(patch) => {
                      setDonorInfo((prev) => ({ ...prev, ...patch }));
                      if (patch.donor_name !== undefined) {
                        setFormData((prev) => ({ ...prev, donor_name: patch.donor_name || '' }));
                      }
                    }}
                    className="border rounded-lg p-4 bg-muted/20"
                  />
                  <div className="space-y-2">
                    <Label>Item Type *</Label>
                    <Select value={formData.item_type} onValueChange={(v) => setFormData({ ...formData, item_type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Item Description</Label>
                    <Input
                      value={formData.item_description}
                      onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
                      placeholder="e.g., 50 kg rice, 20 blankets"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Est. Value (₹)</Label>
                      <Input
                        type="number"
                        value={formData.estimated_value}
                        onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Received Date *</Label>
                    <Input
                      type="date"
                      value={formData.received_date}
                      onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes"
                      rows={2}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Recording...' : 'Record Donation'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.count || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.thisMonth || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Item Categories</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.itemTypes || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Est. Total Value</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats?.totalValue?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Donations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Donation Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : donations?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No kind donations found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Donor</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Est. Value</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations?.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell>{format(new Date(donation.received_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{donation.donor_name || donation.profiles?.name || 'Anonymous'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Badge variant="outline" className="w-fit mb-1">{donation.item_type}</Badge>
                            {donation.item_description && (
                              <span className="text-xs text-muted-foreground">{donation.item_description}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{donation.quantity || 1}</TableCell>
                        <TableCell>{donation.homes?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            donation.status === 'RECEIVED' ? 'default' :
                            donation.status === 'DELIVERED' ? 'secondary' :
                            donation.status === 'VERIFIED' ? 'default' : 'outline'
                          }>
                            {donation.status || 'PLEDGED'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {donation.estimated_value ? `₹${Number(donation.estimated_value).toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(donation.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
