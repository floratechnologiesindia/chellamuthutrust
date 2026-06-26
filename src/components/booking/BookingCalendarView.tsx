import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, UtensilsCrossed, FileHeart, Check } from 'lucide-react';
import { type DonorWithStats } from '@/hooks/useDonors';
import { useNeeds } from '@/hooks/useNeeds';
import { useFoodSlots, useSponsorFoodSlot, FoodSlot, FoodTimeSlot } from '@/hooks/useFoodSlots';
import { useCreateDonation } from '@/hooks/useDonations';
import { FoodCalendarGrid } from '@/components/food-calendar/FoodCalendarGrid';
import { FoodSlotLegend } from '@/components/food-calendar/FoodSlotLegend';
import { format, isSameDay, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sendBookingPaymentEmail } from '@/lib/sendBookingEmail';

interface BookingCalendarViewProps {
  donor: DonorWithStats;
  category: string;
  categoryId: string;
  homeId: string;
  trustId: string;
  selectedDate: Date;
  onBack: () => void;
  onComplete: () => void;
}

export const BookingCalendarView = ({ 
  donor, 
  category, 
  categoryId,
  homeId, 
  trustId,
  selectedDate, 
  onBack,
  onComplete 
}: BookingCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<any>(null);
  const [selectedFoodSlot, setSelectedFoodSlot] = useState<FoodSlot | null>(null);
  const [amount, setAmount] = useState('');
  const [occasionType, setOccasionType] = useState<string>('');
  const [occasionNote, setOccasionNote] = useState('');

  const isFoodDistribution = category === 'food_distribution';

  // Food slots for food distribution
  const { data: foodSlots = [] } = useFoodSlots(
    isFoodDistribution ? homeId : null,
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1
  );
  const sponsorFoodSlot = useSponsorFoodSlot();

  // Needs for other categories
  const { data: needs = [] } = useNeeds(
    !isFoodDistribution ? { homeId, categoryId, status: 'OPEN' } : undefined
  );

  // Filter needs by selected date
  const needsForDate = needs.filter(need => 
    isSameDay(new Date(need.date), selectedDate)
  );

  const handleBookNeed = (need: any) => {
    setSelectedNeed(need);
    setSelectedFoodSlot(null);
    setAmount(need.required_amount?.toString() || '');
    setBookingDialogOpen(true);
  };

  const handleBookFoodSlot = (slot: FoodSlot) => {
    setSelectedFoodSlot(slot);
    setSelectedNeed(null);
    setAmount('');
    setBookingDialogOpen(true);
  };

  const handleConfirmBooking = async () => {
    try {
      if (selectedFoodSlot) {
        // Book food slot - directly update with specific donor_id
        const { error } = await supabase
          .from('food_slots')
          .update({
            donor_id: donor.id,
            status: 'BOOKED',
            current_sponsors_count: (selectedFoodSlot.current_sponsors_count || 0) + 1
          })
          .eq('id', selectedFoodSlot.id);
        
        if (error) throw error;

        // Create donation record + send payment email for food slot
        const slotAmount = selectedFoodSlot.amount || 0;
        if (slotAmount > 0) {
          try {
            const { data: insertedDonation } = await supabase
              .from('donations')
              .insert({
                donor_id: donor.id,
                home_id: homeId,
                trust_id: trustId,
                amount_pledged: slotAmount,
                sponsorship_type: 'ONE_TIME' as const,
                payment_mode: 'offline' as const,
                start_date: selectedFoodSlot.date,
                status: 'PLEDGED' as const,
              })
              .select('id')
              .single();

            if (insertedDonation && donor.email) {
              await sendBookingPaymentEmail({
                donorEmail: donor.email,
                donorName: donor.name,
                donationId: insertedDonation.id,
                amount: slotAmount,
                homeName: 'Care Home',
                eventDescription: `Food Sponsorship - ${selectedFoodSlot.time_slot}`,
                date: format(new Date(selectedFoodSlot.date), 'dd MMM yyyy'),
              });
            }
          } catch (emailErr) {
            console.error('Failed to send food booking payment email:', emailErr);
          }
        }

        toast.success(`Food slot booked for ${donor.name}`);
      } else if (selectedNeed) {
        // Create donation for need - directly insert with specific donor_id
        const donationData = {
          donor_id: donor.id,
          need_id: selectedNeed.id,
          home_id: homeId,
          trust_id: trustId,
          amount_pledged: parseFloat(amount) || 0,
          sponsorship_type: 'ONE_TIME' as const,
          payment_mode: 'offline' as const,
          start_date: format(selectedDate, 'yyyy-MM-dd'),
          occasion_type: (occasionType || null) as 'birthday' | 'ancestor_remembrance' | 'festival' | 'other' | null,
          occasion_note: occasionNote || null,
          status: 'PLEDGED' as const
        };
        
        const { data: insertedDonation, error } = await supabase
          .from('donations')
          .insert(donationData)
          .select('id')
          .single();
        
        if (error) throw error;

        // Send payment email if amount > 0
        const amt = parseFloat(amount) || 0;
        if (amt > 0 && donor.email) {
          await sendBookingPaymentEmail({
            donorEmail: donor.email,
            donorName: donor.name,
            donationId: insertedDonation.id,
            amount: amt,
            homeName: selectedNeed.homes?.name || 'Care Home',
            eventDescription: selectedNeed.description || selectedNeed.categories?.label || undefined,
            date: format(selectedDate, 'dd MMM yyyy'),
          });
        }

        toast.success(`Booking created for ${donor.name}`);
      }
      setBookingDialogOpen(false);
      onComplete();
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to create booking');
    }
  };

  const handleSlotClick = (date: Date, timeSlot: FoodTimeSlot, existingSlot?: FoodSlot) => {
    if (isBefore(date, startOfDay(new Date()))) {
      toast.error('Cannot book slots for past dates');
      return;
    }
    if (existingSlot && existingSlot.status === 'NEED') {
      handleBookFoodSlot(existingSlot);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Event Selection
        </Button>
        <div className="text-sm text-muted-foreground">
          Booking for: <span className="font-semibold text-foreground">{donor.name}</span>
        </div>
      </div>

      {isFoodDistribution ? (
        // Food Distribution Calendar
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Food Distribution Calendar
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  Previous
                </Button>
                <span className="font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FoodSlotLegend />
            <FoodCalendarGrid 
              currentDate={currentMonth}
              slots={foodSlots}
              onSlotClick={handleSlotClick}
            />
            <p className="text-sm text-muted-foreground text-center">
              Click on a yellow (REQUIREMENT) slot to book it for {donor.name}
            </p>
          </CardContent>
        </Card>
      ) : (
        // Requirements List/Calendar for other categories
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileHeart className="h-5 w-5" />
              Available Requirements for {format(selectedDate, 'dd MMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {needsForDate.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No open requirements available for this date and category
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Required Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsForDate.map((need) => (
                    <TableRow key={need.id}>
                      <TableCell className="font-medium">
                        {need.description || need.categories?.label || 'Requirement'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {need.categories?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {need.required_amount ? `₹${need.required_amount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          {need.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleBookNeed(need)}>
                          Book for Donor
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Confirmation Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking for {donor.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFoodSlot && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium">Food Slot</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedFoodSlot.date), 'dd MMM yyyy')} - {selectedFoodSlot.time_slot}
                </p>
              </div>
            )}
            {selectedNeed && (
              <>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-medium">{selectedNeed.description || 'Need'}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedNeed.categories?.label} - {format(selectedDate, 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Amount (₹)</label>
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter donation amount"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Occasion Type</label>
                  <Select value={occasionType} onValueChange={setOccasionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select occasion (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="ancestor_remembrance">Ancestor Remembrance</SelectItem>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Note (optional)</label>
                  <Textarea 
                    value={occasionNote}
                    onChange={(e) => setOccasionNote(e.target.value)}
                    placeholder="Add any special notes..."
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking} className="gap-2">
              <Check className="h-4 w-4" />
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingCalendarView;
