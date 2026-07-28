import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { sendBookingPaymentEmail } from '@/lib/sendBookingEmail';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { IndianRupee, Loader2 } from 'lucide-react';
import { useDonors, useCreateDonor, type DonorWithStats } from '@/hooks/useDonors';
import { useFoodSlotPricingMap } from '@/hooks/useFoodSlotPricing';
import { useBulkBookFoodSlots } from '@/hooks/useFoodSlots';
import type { FoodTimeSlot } from '@/hooks/useFoodSlots';
import { cn } from '@/lib/utils';
import { normalizePaymentStatus } from '@/lib/foodSlotUtils';
import type { FoodSlotPaymentStatus } from '@/lib/foodSlotUtils';

const TIME_SLOT_LABELS: Record<FoodTimeSlot, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
  OUTSIDE_FOOD: 'Outside Food',
};

const SPONSOR_FOR_OPTIONS = [
  'Birthday',
  'Anniversary',
  'Memorial/Shradh',
  'Festival',
  'Corporate CSR',
  'Regular Sponsorship',
  'Other',
];

interface SelectedSlot {
  date: string;
  homeId: string;
  homeName: string;
  timeSlot: FoodTimeSlot;
  existingSlotId: string | null;
}

interface SlotDetails {
  sponsorFor: string;
  customSponsorFor: string;
  reason: string;
  notes: string;
  donateOnBehalfOf: string;
}

interface MultiSlotBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSlots: SelectedSlot[];
  trustId: string;
  onSuccess: () => void;
  preSelectedDonor?: DonorWithStats;
}

export function MultiSlotBookingDialog({
  open,
  onOpenChange,
  selectedSlots,
  trustId,
  onSuccess,
  preSelectedDonor,
}: MultiSlotBookingDialogProps) {
  const { data: donors = [] } = useDonors();
  const createDonor = useCreateDonor();
  const { priceMap } = useFoodSlotPricingMap();
  const bulkBookMutation = useBulkBookFoodSlots();

  // Step tracking: 'ask' | 'same' | 'different'
  const [step, setStep] = useState<'ask' | 'same' | 'different'>('ask');
  const [sameForAll, setSameForAll] = useState<boolean | null>(null);

  // Common fields (used when same for all)
  const [donorId, setDonorId] = useState<string>('');
  const [showNewDonor, setShowNewDonor] = useState(false);
  const [newDonor, setNewDonor] = useState({
    name: '',
    phone: '',
    address: '',
    pan_number: '',
    aadhar_number: '',
    email: '',
  });
  const [sponsorFor, setSponsorFor] = useState<string>('');
  const [customSponsorFor, setCustomSponsorFor] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [donateOnBehalfOf, setDonateOnBehalfOf] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<FoodSlotPaymentStatus>('FULLY_PENDING');
  const [useManualAmount, setUseManualAmount] = useState(false);
  const [manualAmount, setManualAmount] = useState<string>('');

  // Per-slot details (used when different for each)
  const [perSlotDetails, setPerSlotDetails] = useState<Map<string, SlotDetails>>(new Map());

  // Initialize per-slot details when slots change
  useEffect(() => {
    if (selectedSlots.length > 0) {
      const newMap = new Map<string, SlotDetails>();
      selectedSlots.forEach((slot, idx) => {
        const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
        newMap.set(key, {
          sponsorFor: '',
          customSponsorFor: '',
          reason: '',
          notes: '',
          donateOnBehalfOf: '',
        });
      });
      setPerSlotDetails(newMap);
    }
  }, [selectedSlots]);

  // Pre-fill donor when preSelectedDonor is provided
  useEffect(() => {
    if (preSelectedDonor) {
      setDonorId(preSelectedDonor.id);
    }
  }, [preSelectedDonor]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('ask');
      setSameForAll(null);
      setSponsorFor('');
      setCustomSponsorFor('');
      setReason('');
      setNotes('');
      setDonateOnBehalfOf('');
      setPaymentStatus('FULLY_PENDING');
      setUseManualAmount(false);
      setManualAmount('');
      setShowNewDonor(false);
      setNewDonor({ name: '', phone: '', address: '', pan_number: '', aadhar_number: '', email: '' });
      if (preSelectedDonor) {
        setDonorId(preSelectedDonor.id);
      } else {
        setDonorId('');
      }
    }
  }, [open, preSelectedDonor]);

  // Calculate total based on slot pricing
  const calculatedTotal = useMemo(() => {
    return selectedSlots.reduce((sum, slot) => {
      return sum + (priceMap[slot.timeSlot] ?? 0);
    }, 0);
  }, [selectedSlots, priceMap]);

  const effectiveAmount = useManualAmount && manualAmount 
    ? parseFloat(manualAmount) || 0 
    : calculatedTotal;

  const getEffectiveSponsorFor = (sponsorFor: string, customSponsorFor: string) => {
    return sponsorFor === 'Other' ? customSponsorFor : sponsorFor;
  };

  const updateSlotDetails = (key: string, field: keyof SlotDetails, value: string) => {
    setPerSlotDetails(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(key) || {
        sponsorFor: '',
        customSponsorFor: '',
        reason: '',
        notes: '',
        donateOnBehalfOf: '',
      };
      newMap.set(key, { ...existing, [field]: value });
      return newMap;
    });
  };

  const handleContinue = () => {
    if (sameForAll === true) {
      setStep('same');
    } else if (sameForAll === false) {
      setStep('different');
    }
  };

  const handleBack = () => {
    setStep('ask');
    setSameForAll(null);
  };

  const handleSubmit = async () => {
    let effectiveDonorId = donorId || null;

    if (showNewDonor && !effectiveDonorId) {
      if (!newDonor.name.trim() || !newDonor.phone.trim()) {
        return;
      }
      const created = await createDonor.mutateAsync({
        name: newDonor.name.trim(),
        phone: newDonor.phone.trim(),
        email: newDonor.email.trim() || `${newDonor.phone.trim().replace(/\D/g, '')}@walkin.local`,
        password: `Temp${Date.now().toString(36)}!`,
        address: newDonor.address.trim() || undefined,
        pan_number: newDonor.pan_number.trim() || undefined,
        aadhar_number: newDonor.aadhar_number.trim() || undefined,
      });
      effectiveDonorId = created?.user_id || created?.id || null;
      if (!effectiveDonorId) {
        throw new Error('Failed to create donor');
      }
    }

    const normalizedPayment =
      normalizePaymentStatus(paymentStatus) || 'FULLY_PENDING';

    if (step === 'same') {
      // Same details for all slots
      await bulkBookMutation.mutateAsync({
        slots: selectedSlots.map(slot => ({
          date: slot.date,
          homeId: slot.homeId,
          timeSlot: slot.timeSlot,
          existingSlotId: slot.existingSlotId,
        })),
        bookingData: {
          donor_id: effectiveDonorId,
          reason,
          sponsor_for: getEffectiveSponsorFor(sponsorFor, customSponsorFor),
          note: notes,
          amount: effectiveAmount,
          payment_status: normalizedPayment,
          donate_on_behalf_of: donateOnBehalfOf || null,
        },
        trustId,
      });
    } else {
      // Different details for each slot
      await bulkBookMutation.mutateAsync({
        slots: selectedSlots.map(slot => {
          const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
          const details = perSlotDetails.get(key);
          return {
            date: slot.date,
            homeId: slot.homeId,
            timeSlot: slot.timeSlot,
            existingSlotId: slot.existingSlotId,
            individualDetails: details ? {
              reason: details.reason,
              sponsor_for: getEffectiveSponsorFor(details.sponsorFor, details.customSponsorFor),
              note: details.notes,
              donate_on_behalf_of: details.donateOnBehalfOf || null,
            } : undefined,
          };
        }),
        bookingData: {
          donor_id: effectiveDonorId,
          reason: '', // Will use individual
          sponsor_for: '', // Will use individual
          note: '', // Will use individual
          amount: effectiveAmount,
          payment_status: normalizedPayment,
          donate_on_behalf_of: null, // Will use individual
        },
        trustId,
        useIndividualDetails: true,
      });
    }

    // After successful booking, create donation + send payment email
    const donor = preSelectedDonor || donors.find(d => d.id === effectiveDonorId);
    if (donor && effectiveAmount > 0 && normalizedPayment !== 'FULLY_PAID') {
      try {
        const homeId = selectedSlots[0]?.homeId;
        const { data: insertedDonation } = await supabase
          .from('donations')
          .insert({
            donor_id: donor.id,
            home_id: homeId,
            trust_id: trustId,
            amount_pledged: effectiveAmount,
            sponsorship_type: 'ONE_TIME' as const,
            payment_mode: 'offline' as const,
            start_date: selectedSlots[0]?.date || format(new Date(), 'yyyy-MM-dd'),
            status: 'PLEDGED' as const,
          })
          .select('id')
          .single();

        if (insertedDonation && donor.email) {
          const slotSummary = selectedSlots
            .map(s => `${format(new Date(s.date), 'dd MMM yyyy')} - ${TIME_SLOT_LABELS[s.timeSlot]}`)
            .join(', ');

          await sendBookingPaymentEmail({
            donorEmail: donor.email,
            donorName: donor.name,
            donationId: insertedDonation.id,
            amount: effectiveAmount,
            homeName: selectedSlots[0]?.homeName || 'Project',
            eventDescription: `Food Sponsorship (${slotSummary})`,
            date: selectedSlots[0]?.date || format(new Date(), 'dd MMM yyyy'),
          });
        }
      } catch (emailErr) {
        console.error('Failed to send food booking payment email:', emailErr);
      }
    }

    onSuccess();
    onOpenChange(false);
  };

  const isValidSameForAll = getEffectiveSponsorFor(sponsorFor, customSponsorFor) && reason;
  
  const isValidDifferent = useMemo(() => {
    for (const slot of selectedSlots) {
      const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
      const details = perSlotDetails.get(key);
      if (!details) return false;
      const effectiveSponsorFor = getEffectiveSponsorFor(details.sponsorFor, details.customSponsorFor);
      if (!effectiveSponsorFor || !details.reason) return false;
    }
    return true;
  }, [selectedSlots, perSlotDetails]);

  const isValidDonor =
    !!preSelectedDonor ||
    !!donorId ||
    (showNewDonor && !!newDonor.name.trim() && !!newDonor.phone.trim());

  const isValid =
    isValidDonor &&
    (step === 'same'
      ? isValidSameForAll
      : step === 'different'
        ? isValidDifferent
        : sameForAll !== null);

  const selectedDonorName = useMemo(() => {
    if (preSelectedDonor) return preSelectedDonor.name;
    const donor = donors.find(d => d.id === donorId);
    return donor?.name || '';
  }, [donorId, donors, preSelectedDonor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Book {selectedSlots.length} Food Slot{selectedSlots.length > 1 ? 's' : ''}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-6">
            {/* Selected Slots Summary - Always visible */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Slots</Label>
              <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <div className="space-y-1 text-sm">
                  {selectedSlots.map((slot, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span>
                        {format(new Date(slot.date), 'dd MMM yyyy')} - {slot.homeName} - {TIME_SLOT_LABELS[slot.timeSlot]}
                      </span>
                      <span className="text-muted-foreground flex items-center">
                        <IndianRupee className="h-3 w-3" />
                        {(priceMap[slot.timeSlot] ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center font-medium pt-2">
                <span>Total Amount</span>
                <span className="flex items-center text-lg">
                  <IndianRupee className="h-4 w-4" />
                  {calculatedTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <Separator />

            {/* Food Sponsor - Always visible and pre-filled */}
            <div className="space-y-2">
              <Label>Food Sponsor</Label>
              {preSelectedDonor ? (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <span className="font-medium text-primary">{preSelectedDonor.name}</span>
                  <span className="text-muted-foreground ml-2">({preSelectedDonor.email})</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {!showNewDonor ? (
                    <>
                      <Select value={donorId} onValueChange={(val) => setDonorId(val === '__none__' ? '' : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a donor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No donor selected</SelectItem>
                          {donors.map(donor => (
                            <SelectItem key={donor.id} value={donor.id}>
                              {donor.name}{donor.phone ? ` · ${donor.phone}` : donor.email ? ` · ${donor.email}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowNewDonor(true);
                          setDonorId('');
                        }}
                      >
                        Create new donor
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">New donor details</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewDonor(false)}>
                          Use existing
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Name *</Label>
                          <Input
                            value={newDonor.name}
                            onChange={(e) => setNewDonor((p) => ({ ...p, name: e.target.value }))}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Phone *</Label>
                          <Input
                            value={newDonor.phone}
                            onChange={(e) => setNewDonor((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="WhatsApp number"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Address</Label>
                          <Textarea
                            value={newDonor.address}
                            onChange={(e) => setNewDonor((p) => ({ ...p, address: e.target.value }))}
                            rows={2}
                            placeholder="Full address"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>PAN</Label>
                          <Input
                            value={newDonor.pan_number}
                            onChange={(e) => setNewDonor((p) => ({ ...p, pan_number: e.target.value.toUpperCase() }))}
                            placeholder="ABCDE1234F"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Aadhaar</Label>
                          <Input
                            value={newDonor.aadhar_number}
                            onChange={(e) => setNewDonor((p) => ({ ...p, aadhar_number: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                            placeholder="12-digit Aadhaar"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Email (optional)</Label>
                          <Input
                            type="email"
                            value={newDonor.email}
                            onChange={(e) => setNewDonor((p) => ({ ...p, email: e.target.value }))}
                            placeholder="For payment link / receipt"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 1: Ask same for all? */}
            {step === 'ask' && selectedSlots.length > 1 && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <Label className="text-base font-medium">
                  Use same details for all {selectedSlots.length} slots?
                </Label>
                <RadioGroup 
                  value={sameForAll === null ? '' : sameForAll ? 'yes' : 'no'} 
                  onValueChange={(val) => setSameForAll(val === 'yes')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="yes" id="same-yes" />
                    <Label htmlFor="same-yes" className="cursor-pointer flex-1">
                      <span className="font-medium">Yes</span>
                      <p className="text-sm text-muted-foreground">Apply same reason, occasion, and notes to all slots</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="no" id="same-no" />
                    <Label htmlFor="same-no" className="cursor-pointer flex-1">
                      <span className="font-medium">No</span>
                      <p className="text-sm text-muted-foreground">I want to provide different details for each slot</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Skip ask step for single slot */}
            {step === 'ask' && selectedSlots.length === 1 && (
              <div className="text-center py-2">
                <Button onClick={() => setStep('same')}>Continue to Booking Details</Button>
              </div>
            )}

            {/* Step 2a: Same for all - Show single form */}
            {step === 'same' && (
              <>
                {/* Donate On Behalf Of */}
                <div className="space-y-2">
                  <Label>Donate On Behalf Of (Optional)</Label>
                  <Input
                    placeholder="Enter name if donating on behalf of someone (e.g., Father, Mother)"
                    value={donateOnBehalfOf}
                    onChange={(e) => setDonateOnBehalfOf(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty if {selectedDonorName || 'the donor'} is sponsoring for themselves
                  </p>
                </div>

                {/* Sponsor For */}
                <div className="space-y-2">
                  <Label>Sponsor For (Occasion) *</Label>
                  <Select value={sponsorFor} onValueChange={setSponsorFor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select occasion" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPONSOR_FOR_OPTIONS.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sponsorFor === 'Other' && (
                    <Input
                      placeholder="Specify occasion"
                      value={customSponsorFor}
                      onChange={(e) => setCustomSponsorFor(e.target.value)}
                    />
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Textarea
                    placeholder="Enter the reason for sponsorship..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <Separator />

                {/* Amount */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="manual-amount"
                      checked={useManualAmount}
                      onCheckedChange={(checked) => setUseManualAmount(checked === true)}
                    />
                    <Label htmlFor="manual-amount" className="text-sm">
                      Enter custom amount (override calculated total)
                    </Label>
                  </div>
                  {useManualAmount && (
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        className="max-w-[200px]"
                      />
                    </div>
                  )}
                </div>

                {/* Payment Status */}
                <div className="space-y-3">
                  <Label>Payment Status *</Label>
                  <RadioGroup
                    value={paymentStatus}
                    onValueChange={(v) => setPaymentStatus(v as FoodSlotPaymentStatus)}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FULLY_PAID" id="paid" />
                      <Label htmlFor="paid" className="font-normal cursor-pointer">Fully Paid</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FULLY_PENDING" id="yet-to-pay" />
                      <Label htmlFor="yet-to-pay" className="font-normal cursor-pointer">Pending</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PARTIALLY_PAID" id="prepaid" />
                      <Label htmlFor="prepaid" className="font-normal cursor-pointer">Partially Paid</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Step 2b: Different for each - Show accordion */}
            {step === 'different' && (
              <>
                <Accordion type="single" collapsible className="w-full">
                  {selectedSlots.map((slot, idx) => {
                    const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
                    const details = perSlotDetails.get(key) || {
                      sponsorFor: '',
                      customSponsorFor: '',
                      reason: '',
                      notes: '',
                      donateOnBehalfOf: '',
                    };
                    const effectiveSponsorFor = getEffectiveSponsorFor(details.sponsorFor, details.customSponsorFor);
                    const isComplete = effectiveSponsorFor && details.reason;

                    return (
                      <AccordionItem key={key} value={key}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2 text-left">
                            <span className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                              isComplete ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              {isComplete ? '✓' : idx + 1}
                            </span>
                            <span>
                              {format(new Date(slot.date), 'dd MMM')} - {slot.homeName} - {TIME_SLOT_LABELS[slot.timeSlot]}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          {/* Donate On Behalf Of */}
                          <div className="space-y-2">
                            <Label>Donate On Behalf Of (Optional)</Label>
                            <Input
                              placeholder="Enter name if donating on behalf of someone"
                              value={details.donateOnBehalfOf}
                              onChange={(e) => updateSlotDetails(key, 'donateOnBehalfOf', e.target.value)}
                            />
                          </div>

                          {/* Sponsor For */}
                          <div className="space-y-2">
                            <Label>Sponsor For (Occasion) *</Label>
                            <Select 
                              value={details.sponsorFor} 
                              onValueChange={(val) => updateSlotDetails(key, 'sponsorFor', val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select occasion" />
                              </SelectTrigger>
                              <SelectContent>
                                {SPONSOR_FOR_OPTIONS.map(option => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {details.sponsorFor === 'Other' && (
                              <Input
                                placeholder="Specify occasion"
                                value={details.customSponsorFor}
                                onChange={(e) => updateSlotDetails(key, 'customSponsorFor', e.target.value)}
                              />
                            )}
                          </div>

                          {/* Reason */}
                          <div className="space-y-2">
                            <Label>Reason *</Label>
                            <Textarea
                              placeholder="Enter the reason for sponsorship..."
                              value={details.reason}
                              onChange={(e) => updateSlotDetails(key, 'reason', e.target.value)}
                              rows={2}
                            />
                          </div>

                          {/* Notes */}
                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                              placeholder="Any additional notes..."
                              value={details.notes}
                              onChange={(e) => updateSlotDetails(key, 'notes', e.target.value)}
                              rows={2}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                <Separator />

                {/* Amount - shared */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="manual-amount-diff"
                      checked={useManualAmount}
                      onCheckedChange={(checked) => setUseManualAmount(checked === true)}
                    />
                    <Label htmlFor="manual-amount-diff" className="text-sm">
                      Enter custom amount (override calculated total)
                    </Label>
                  </div>
                  {useManualAmount && (
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        className="max-w-[200px]"
                      />
                    </div>
                  )}
                </div>

                {/* Payment Status - shared */}
                <div className="space-y-3">
                  <Label>Payment Status *</Label>
                  <RadioGroup
                    value={paymentStatus}
                    onValueChange={(v) => setPaymentStatus(v as FoodSlotPaymentStatus)}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FULLY_PAID" id="paid-diff" />
                      <Label htmlFor="paid-diff" className="font-normal cursor-pointer">Fully Paid</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FULLY_PENDING" id="yet-to-pay-diff" />
                      <Label htmlFor="yet-to-pay-diff" className="font-normal cursor-pointer">Pending</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PARTIALLY_PAID" id="prepaid-diff" />
                      <Label htmlFor="prepaid-diff" className="font-normal cursor-pointer">Partially Paid</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          {step !== 'ask' && selectedSlots.length > 1 && (
            <Button variant="ghost" onClick={handleBack} className="mr-auto">
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 'ask' && selectedSlots.length > 1 ? (
            <Button onClick={handleContinue} disabled={sameForAll === null}>
              Continue
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!isValid || bulkBookMutation.isPending || createDonor.isPending}
            >
              {(bulkBookMutation.isPending || createDonor.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm Booking ({selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}