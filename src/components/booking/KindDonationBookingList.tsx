import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Calendar, Home, Package, Loader2, Truck, PackageOpen, Building } from 'lucide-react';
import { type DonorWithStats } from '@/hooks/useDonors';
import { useNeeds, type NeedWithRelations } from '@/hooks/useNeeds';
import { useHomes } from '@/hooks/useHomes';
import { useCreateKindDonation } from '@/hooks/useKindDonations';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface KindDonationBookingListProps {
  donor: DonorWithStats;
  onBookingComplete?: () => void;
}

type DeliveryMode = 'SELF_DELIVERY' | 'COURIER' | 'TRUST_PICKUP';

const DELIVERY_OPTIONS = [
  { value: 'SELF_DELIVERY', label: 'Self Delivery', icon: Truck, description: 'Donor will deliver personally' },
  { value: 'COURIER', label: 'Courier', icon: Package, description: 'Ship via courier service' },
  { value: 'TRUST_PICKUP', label: 'Trust Pickup', icon: Building, description: 'Trust will arrange pickup' },
] as const;

export const KindDonationBookingList = ({ donor, onBookingComplete }: KindDonationBookingListProps) => {
  const queryClient = useQueryClient();
  const createKindDonation = useCreateKindDonation();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [homeFilter, setHomeFilter] = useState<string>('all');
  
  // Booking dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<NeedWithRelations | null>(null);
  const [quantity, setQuantity] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('SELF_DELIVERY');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all needs - filter to product-based donations
  const { data: allNeeds = [], isLoading: needsLoading } = useNeeds({});
  const { data: homes = [] } = useHomes();

  // Filter to only open/partial needs that accept product donations
  const productNeeds = useMemo(() => {
    return allNeeds.filter(need => 
      (need.status === 'OPEN' || need.status === 'PARTIAL') &&
      (need.donation_mode === 'PRODUCT_ONLY' || need.donation_mode === 'BOTH')
    );
  }, [allNeeds]);

  // Apply filters
  const filteredNeeds = useMemo(() => {
    return productNeeds.filter(need => {
      // Home filter
      if (homeFilter !== 'all' && need.home_id !== homeFilter) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = need.description?.toLowerCase().includes(query);
        const matchesHome = need.homes?.name.toLowerCase().includes(query);
        const matchesProduct = need.product_name?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesHome && !matchesProduct) return false;
      }
      
      return true;
    });
  }, [productNeeds, homeFilter, searchQuery]);

  const handleBookClick = (need: NeedWithRelations) => {
    setSelectedNeed(need);
    const remaining = (need.required_product_qty || 0) - (need.fulfilled_product_qty || 0);
    setQuantity(remaining.toString());
    setDeliveryMode('SELF_DELIVERY');
    setNotes('');
    setBookingDialogOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedNeed || !quantity) return;

    setIsSubmitting(true);
    try {
      await createKindDonation.mutateAsync({
        trust_id: selectedNeed.trust_id,
        home_id: selectedNeed.home_id,
        need_id: selectedNeed.id,
        donor_id: donor.id,
        donor_name: donor.name,
        item_type: selectedNeed.product_name || 'General Item',
        item_description: selectedNeed.description || null,
        quantity: parseInt(quantity),
        received_date: format(new Date(), 'yyyy-MM-dd'),
        delivery_mode: deliveryMode,
        status: 'PLEDGED',
        notes: notes || null,
      });

      toast.success(`In-kind donation of ${quantity} ${selectedNeed.product_unit || 'items'} pledged for ${donor.name}`);
      setBookingDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['needs'] });
      queryClient.invalidateQueries({ queryKey: ['kind-donations'] });
      onBookingComplete?.();
    } catch (error) {
      console.error('Kind donation error:', error);
      toast.error('Failed to record donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRemainingQty = (need: NeedWithRelations) => {
    return (need.required_product_qty || 0) - (need.fulfilled_product_qty || 0);
  };

  const getProgressPercent = (need: NeedWithRelations) => {
    if (!need.required_product_qty) return 0;
    return Math.round(((need.fulfilled_product_qty || 0) / need.required_product_qty) * 100);
  };

  if (needsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageOpen className="h-5 w-5" />
          Kind Donation Requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item, home, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={homeFilter} onValueChange={setHomeFilter}>
            <SelectTrigger className="w-[180px]">
              <Home className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {homes.map((home) => (
                <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Requirements Table */}
        {filteredNeeds.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <PackageOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No in-kind donation requirements found</p>
            <p className="text-sm">Try adjusting your filters or check other categories</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Needed</TableHead>
                  <TableHead className="text-center">Fulfilled</TableHead>
                  <TableHead className="text-center">Remaining</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNeeds.map((need) => (
                  <TableRow key={need.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(need.date), 'dd MMM')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{need.homes?.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        {need.product_name || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm text-muted-foreground" title={need.description || ''}>
                        {need.description || 'No description'}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      {need.required_product_qty} {need.product_unit}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600">{need.fulfilled_product_qty || 0}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium text-orange-600">
                        {getRemainingQty(need)} {need.product_unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleBookClick(need)}>
                        Pledge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredNeeds.length} of {productNeeds.length} in-kind requirements
        </div>
      </CardContent>

      {/* Booking Confirmation Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pledge In-Kind Donation for {donor.name}</DialogTitle>
          </DialogHeader>
          
          {selectedNeed && (
            <div className="space-y-4">
              {/* Requirement Summary */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(selectedNeed.date), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedNeed.homes?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">{selectedNeed.product_name || 'General Item'}</Badge>
                </div>
                {selectedNeed.description && (
                  <p className="text-sm mt-2">{selectedNeed.description}</p>
                )}
              </div>

              {/* Progress Info */}
              <div className="flex justify-between text-sm border rounded-lg p-3">
                <div>
                  <span className="text-muted-foreground">Required:</span>{' '}
                  <span className="font-medium">{selectedNeed.required_product_qty} {selectedNeed.product_unit}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fulfilled:</span>{' '}
                  <span className="font-medium text-green-600">{selectedNeed.fulfilled_product_qty || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining:</span>{' '}
                  <span className="font-medium text-orange-600">{getRemainingQty(selectedNeed)}</span>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to Pledge *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    max={getRemainingQty(selectedNeed)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground text-sm">
                    {selectedNeed.product_unit || 'items'}
                  </span>
                </div>
              </div>

              {/* Delivery Mode */}
              <div className="space-y-2">
                <Label>Delivery Method</Label>
                <RadioGroup 
                  value={deliveryMode} 
                  onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}
                  className="grid grid-cols-1 gap-2"
                >
                  {DELIVERY_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <div 
                        key={option.value}
                        className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                          deliveryMode === option.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setDeliveryMode(option.value as DeliveryMode)}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <Label htmlFor={option.value} className="cursor-pointer font-medium">
                            {option.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or notes..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking} disabled={isSubmitting || !quantity}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Pledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default KindDonationBookingList;
