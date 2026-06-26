import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Calendar, Home, Tag, Loader2 } from 'lucide-react';
import { type DonorWithStats } from '@/hooks/useDonors';
import { useNeeds, type NeedWithRelations } from '@/hooks/useNeeds';
import { useHomes } from '@/hooks/useHomes';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { NeedProgressDisplay } from '@/components/needs/NeedProgressDisplay';
import { sendBookingPaymentEmail } from '@/lib/sendBookingEmail';

interface ImpactProgramsListProps {
  donor: DonorWithStats;
  categoryId: string;
  categoryLabel?: string;
  onBookingComplete?: () => void;
}

export const ImpactProgramsList = ({ donor, categoryId, categoryLabel, onBookingComplete }: ImpactProgramsListProps) => {
  const queryClient = useQueryClient();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [homeFilter, setHomeFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Booking dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<NeedWithRelations | null>(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [occasionType, setOccasionType] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all needs for Impact Programs category
  const { data: allNeeds = [], isLoading: needsLoading } = useNeeds({ categoryId });
  const { data: homes = [] } = useHomes();

  // Filter to only open and partial needs
  const openNeeds = useMemo(() => {
    return allNeeds.filter(need => need.status === 'OPEN' || need.status === 'PARTIAL');
  }, [allNeeds]);

  // Get unique subcategories from needs
  const subcategories = useMemo(() => {
    const uniqueSubs = new Map<string, string>();
    openNeeds.forEach(need => {
      if (need.subcategory_id && need.subcategories?.label) {
        uniqueSubs.set(need.subcategory_id, need.subcategories.label);
      }
    });
    return Array.from(uniqueSubs.entries()).map(([id, label]) => ({ id, label }));
  }, [openNeeds]);

  // Apply filters
  const filteredNeeds = useMemo(() => {
    return openNeeds.filter(need => {
      // Home filter
      if (homeFilter !== 'all' && need.home_id !== homeFilter) return false;
      
      // Subcategory filter
      if (subcategoryFilter !== 'all' && need.subcategory_id !== subcategoryFilter) return false;
      
      // Status filter
      if (statusFilter !== 'all' && need.status !== statusFilter) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = need.description?.toLowerCase().includes(query);
        const matchesHome = need.homes?.name.toLowerCase().includes(query);
        const matchesSubcategory = need.subcategories?.label?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesHome && !matchesSubcategory) return false;
      }
      
      return true;
    });
  }, [openNeeds, homeFilter, subcategoryFilter, statusFilter, searchQuery]);

  const handleBookClick = (need: NeedWithRelations) => {
    setSelectedNeed(need);
    // Pre-fill amount if monetary donation
    if (need.donation_mode !== 'PRODUCT_ONLY' && need.required_amount) {
      const remaining = need.required_amount - (need.collected_amount || 0);
      setDonationAmount(remaining.toString());
    } else {
      setDonationAmount('');
    }
    setOccasionType('');
    setNotes('');
    setBookingDialogOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedNeed) return;

    setIsSubmitting(true);
    try {
      // Create donation entry
      const donationData = {
        donor_id: donor.id,
        need_id: selectedNeed.id,
        home_id: selectedNeed.home_id,
        trust_id: selectedNeed.trust_id,
        amount_pledged: donationAmount ? parseFloat(donationAmount) : 0,
        sponsorship_type: 'ONE_TIME' as const,
        payment_mode: 'offline' as const,
        start_date: format(new Date(selectedNeed.date), 'yyyy-MM-dd'),
        occasion_type: (occasionType || null) as 'birthday' | 'ancestor_remembrance' | 'festival' | 'other' | null,
        occasion_note: notes || null,
        status: 'PLEDGED' as const
      };

      const { data: insertedDonation, error } = await supabase.from('donations').insert(donationData).select('id').single();

      if (error) throw error;

      // Update need's collected amount if monetary
      if (selectedNeed.donation_mode !== 'PRODUCT_ONLY' && donationAmount) {
        const newCollected = (selectedNeed.collected_amount || 0) + parseFloat(donationAmount);
        const newStatus = newCollected >= (selectedNeed.required_amount || 0) ? 'FULLY_SPONSORED' : 'PARTIAL';
        
        await supabase
          .from('needs')
          .update({ 
            collected_amount: newCollected,
            status: newStatus,
            current_sponsors_count: (selectedNeed.current_sponsors_count || 0) + 1
          })
          .eq('id', selectedNeed.id);
      }

      // Send payment email to donor
      if (donationAmount && parseFloat(donationAmount) > 0 && donor.email) {
        await sendBookingPaymentEmail({
          donorEmail: donor.email,
          donorName: donor.name,
          donationId: insertedDonation.id,
          amount: parseFloat(donationAmount),
          homeName: selectedNeed.homes?.name || 'Care Home',
          eventDescription: selectedNeed.description || undefined,
          date: format(new Date(selectedNeed.date), 'dd MMM yyyy'),
        });
      }

      toast.success(`Successfully booked "${selectedNeed.description?.substring(0, 50)}..." for ${donor.name}`);
      setBookingDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['needs'] });
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      onBookingComplete?.();
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to complete booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Open</Badge>;
      case 'PARTIAL':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
          <Tag className="h-5 w-5" />
          {categoryLabel || 'Impact Programs'} Requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requirements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={homeFilter} onValueChange={setHomeFilter}>
            <SelectTrigger className="w-[180px]">
              <Home className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Homes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Homes</SelectItem>
              {homes.map((home) => (
                <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Tag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {subcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>{sub.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requirements Table */}
        {filteredNeeds.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No available requirements found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Home</TableHead>
                  <TableHead className="max-w-[300px]">Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell className="max-w-[300px]">
                      <p className="truncate text-sm" title={need.description || ''}>
                        {need.description || 'No description'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {need.subcategories?.label || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <NeedProgressDisplay
                        donationMode={need.donation_mode || 'MONEY_ONLY'}
                        requiredAmount={need.required_amount}
                        collectedAmount={need.collected_amount}
                        requiredProductQty={need.required_product_qty}
                        fulfilledProductQty={need.fulfilled_product_qty}
                        productName={need.product_name}
                        productUnit={need.product_unit}
                        compact
                      />
                    </TableCell>
                    <TableCell>{getStatusBadge(need.status || 'OPEN')}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleBookClick(need)}>
                        Book
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredNeeds.length} of {openNeeds.length} requirements
        </div>
      </CardContent>

      {/* Booking Confirmation Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Book Requirement for {donor.name}</DialogTitle>
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
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">{selectedNeed.subcategories?.label || 'Impact Program'}</Badge>
                </div>
                <p className="text-sm mt-2">{selectedNeed.description}</p>
              </div>

              {/* Progress Display */}
              <NeedProgressDisplay
                donationMode={selectedNeed.donation_mode || 'MONEY_ONLY'}
                requiredAmount={selectedNeed.required_amount}
                collectedAmount={selectedNeed.collected_amount}
                requiredProductQty={selectedNeed.required_product_qty}
                fulfilledProductQty={selectedNeed.fulfilled_product_qty}
                productName={selectedNeed.product_name}
                productUnit={selectedNeed.product_unit}
              />

              {/* Booking Form */}
              {selectedNeed.donation_mode !== 'PRODUCT_ONLY' && (
                <div className="space-y-2">
                  <Label htmlFor="amount">Donation Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="occasion">Occasion Type (Optional)</Label>
                <Select value={occasionType} onValueChange={setOccasionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select occasion" />
                  </SelectTrigger>
              <SelectContent>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="ancestor_remembrance">Remembrance / Memorial</SelectItem>
                    <SelectItem value="festival">Festival</SelectItem>
                    <SelectItem value="other">Other / Anniversary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ImpactProgramsList;
