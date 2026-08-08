import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
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
import {
  FOOD_OCCASION_OPTIONS,
  FOOD_TIME_SLOT_LABELS,
  OUTSIDE_MEAL_TYPES,
  type OutsideMealType,
} from '@/lib/foodSlotConstants';
import { buildStaffFoodPurpose } from '@/lib/foodSponsorshipPurpose';
import {
  appendRefreshmentBookingSlots,
  canOfferRefreshmentOptIn,
} from '@/lib/foodRefreshmentOptIn';
import { FoodRefreshmentOptIn } from '@/components/food-calendar/FoodRefreshmentOptIn';
import {
  FoodBookingPaymentSection,
  type FoodBookingPaymentState,
} from '@/components/food-calendar/FoodBookingPaymentSection';
import {
  buildFoodPaymentLink,
  sendBookingPaymentNotifications,
} from '@/lib/sendBookingPaymentNotifications';
import { resolveBookingPaymentFields, needsPaymentLink } from '@/lib/foodPaymentUtils';
import { useFoodSlotAttachments } from '@/hooks/useFoodSlotAttachments';
import { sendFoodBookingAcknowledgement } from '@/lib/sendFoodBookingAcknowledgement';
import { sendAdminFoodBookingStaffNotify } from '@/lib/sendAdminFoodBookingStaffNotify';
import { sendFoodReceiptThankYou } from '@/lib/sendFoodReceiptThankYou';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TIME_SLOT_LABELS = FOOD_TIME_SLOT_LABELS;

interface SelectedSlot {
  date: string;
  homeId: string;
  homeName: string;
  timeSlot: FoodTimeSlot;
  existingSlotId: string | null;
}

interface SlotDetails {
  occasion: string;
  customOccasion: string;
  purpose: string;
  purposeEdited: boolean;
  additionalNotes: string;
  personName: string;
  outsideMealType: OutsideMealType;
}

function resolveOccasionLabel(occasion: string, customOccasion: string): string {
  return occasion === 'Others' ? customOccasion.trim() : occasion;
}

function slotPurposeLabel(slot: SelectedSlot, outsideMealType?: OutsideMealType): string {
  if (slot.timeSlot === 'OUTSIDE_FOOD' && outsideMealType) {
    return `${TIME_SLOT_LABELS[slot.timeSlot]} (${outsideMealType})`;
  }
  return TIME_SLOT_LABELS[slot.timeSlot];
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
  const { user } = useAuth();

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
  const [occasion, setOccasion] = useState<string>('');
  const [customOccasion, setCustomOccasion] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [purposeEdited, setPurposeEdited] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [outsideMealType, setOutsideMealType] = useState<OutsideMealType>('Breakfast');
  const [paymentState, setPaymentState] = useState<FoodBookingPaymentState>({
    paymentMode: 'NEFT',
    cashStatus: 'FULLY_PENDING',
    amountReceived: '',
    chequeNumber: '',
    bankName: '',
    chequeImageUrl: '',
  });
  const { uploadChequeImage, uploading: chequeUploading } = useFoodSlotAttachments();
  const [useManualAmount, setUseManualAmount] = useState(false);
  const [manualAmount, setManualAmount] = useState<string>('');
  const [refreshmentOptIn, setRefreshmentOptIn] = useState<Map<string, boolean>>(new Map());

  // Per-slot details (used when different for each)
  const [perSlotDetails, setPerSlotDetails] = useState<Map<string, SlotDetails>>(new Map());

  // Initialize per-slot details when slots change
  useEffect(() => {
    if (selectedSlots.length > 0) {
      const newMap = new Map<string, SlotDetails>();
      selectedSlots.forEach((slot, idx) => {
        const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
        newMap.set(key, {
          occasion: '',
          customOccasion: '',
          purpose: '',
          purposeEdited: false,
          additionalNotes: '',
          personName: '',
          outsideMealType: 'Breakfast',
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
      setOccasion('');
      setCustomOccasion('');
      setPurpose('');
      setPurposeEdited(false);
      setAdditionalNotes('');
      setPersonName('');
      setOutsideMealType('Breakfast');
      setPaymentState({
        paymentMode: 'NEFT',
        cashStatus: 'FULLY_PENDING',
        amountReceived: '',
        chequeNumber: '',
        bankName: '',
        chequeImageUrl: '',
      });
      setUseManualAmount(false);
      setManualAmount('');
      setRefreshmentOptIn(new Map());
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
      let total = sum + (priceMap[slot.timeSlot] ?? 0);
      const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
      if (canOfferRefreshmentOptIn(slot.timeSlot) && refreshmentOptIn.get(key)) {
        total += priceMap.REFRESHMENTS ?? 0;
      }
      return total;
    }, 0);
  }, [selectedSlots, priceMap, refreshmentOptIn]);

  const hasOutsideFoodSlot = useMemo(
    () => selectedSlots.some((slot) => slot.timeSlot === 'OUTSIDE_FOOD'),
    [selectedSlots],
  );

  const effectiveAmount = useManualAmount && manualAmount
    ? parseFloat(manualAmount) || 0
    : calculatedTotal;

  const refreshmentPrice = priceMap.REFRESHMENTS ?? 30;

  const toggleRefreshmentOptIn = (key: string, checked: boolean) => {
    setRefreshmentOptIn((prev) => {
      const next = new Map(prev);
      if (checked) next.set(key, true);
      else next.delete(key);
      return next;
    });
  };

  const buildSlotsForBooking = (
    mapped: Array<{
      date: string;
      homeId: string;
      homeName: string;
      timeSlot: FoodTimeSlot;
      existingSlotId: string | null;
      individualDetails?: {
        reason: string;
        sponsor_for: string;
        note: string;
        donate_on_behalf_of: string | null;
        meal_type: string | null;
      };
    }>,
  ) =>
    appendRefreshmentBookingSlots(
      mapped.map((slot) => ({
        ...slot,
        slotAmount: priceMap[slot.timeSlot] ?? 0,
      })),
      refreshmentOptIn,
      refreshmentPrice,
    );

  const buildPurposeForSlot = (
    slot: SelectedSlot,
    occasionValue: string,
    customOccasionValue: string,
    personNameValue: string,
    outsideMeal?: OutsideMealType,
  ) =>
    buildStaffFoodPurpose({
      homeName: slot.homeName,
      timeSlot: slot.timeSlot,
      outsideMealType: slot.timeSlot === 'OUTSIDE_FOOD' ? outsideMeal : undefined,
      occasion: occasionValue,
      customOccasion: customOccasionValue,
      personName: personNameValue,
      eventDate: slot.date,
    });

  // Auto-generate purpose for same-for-all mode
  useEffect(() => {
    if (step !== 'same' || purposeEdited || !occasion) return;
    const firstSlot = selectedSlots[0];
    if (!firstSlot) return;
    setPurpose(
      buildPurposeForSlot(firstSlot, occasion, customOccasion, personName, outsideMealType),
    );
  }, [
    step,
    occasion,
    customOccasion,
    personName,
    outsideMealType,
    selectedSlots,
    purposeEdited,
  ]);

  const updateSlotDetails = (
    key: string,
    field: keyof SlotDetails,
    value: string | boolean,
  ) => {
    setPerSlotDetails((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(key) || {
        occasion: '',
        customOccasion: '',
        purpose: '',
        purposeEdited: false,
        additionalNotes: '',
        personName: '',
        outsideMealType: 'Breakfast' as OutsideMealType,
      };
      const updated = { ...existing, [field]: value };

      if (
        field !== 'purpose' &&
        field !== 'purposeEdited' &&
        !updated.purposeEdited &&
        updated.occasion
      ) {
        const slot = selectedSlots.find(
          (s) => `${s.date}-${s.homeId}-${s.timeSlot}` === key,
        );
        if (slot) {
          updated.purpose = buildPurposeForSlot(
            slot,
            updated.occasion,
            updated.customOccasion,
            updated.personName,
            updated.outsideMealType,
          );
        }
      }

      newMap.set(key, updated);
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

  const handleSubmit = async (openPayPage = false) => {
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

    const paymentFields = resolveBookingPaymentFields({
      mode: paymentState.paymentMode,
      totalAmount: effectiveAmount,
      cashStatus: paymentState.cashStatus,
      amountReceived: parseFloat(paymentState.amountReceived) || 0,
    });

    if (
      paymentState.paymentMode === 'Cash' &&
      paymentState.cashStatus === 'PARTIALLY_PAID' &&
      (parseFloat(paymentState.amountReceived) <= 0 ||
        parseFloat(paymentState.amountReceived) >= effectiveAmount)
    ) {
      toast.error('Enter a valid partial amount received (less than total)');
      return;
    }

    if (paymentState.paymentMode === 'Cheque') {
      if (!paymentState.chequeNumber.trim() || !paymentState.bankName.trim()) {
        toast.error('Cheque number and bank name are required');
        return;
      }
      if (!paymentState.chequeImageUrl) {
        toast.error('Please upload a cheque image');
        return;
      }
    }

    const normalizedPayment = paymentFields.payment_status;
    let donationId: string | null = null;

    const donor =
      preSelectedDonor ||
      donors.find((d) => d.id === effectiveDonorId) ||
      (effectiveDonorId && showNewDonor
        ? {
            id: effectiveDonorId,
            name: newDonor.name,
            email: newDonor.email,
            phone: newDonor.phone,
          }
        : undefined);
    const shouldCreateDonation =
      effectiveAmount > 0 &&
      needsPaymentLink({
        mode: paymentState.paymentMode,
        payment_status: normalizedPayment,
        totalAmount: effectiveAmount,
      });

    if (shouldCreateDonation && donor) {
      try {
        const homeId = selectedSlots[0]?.homeId;
        const { data: insertedDonation, error } = await supabase
          .from('donations')
          .insert({
            donor_id: effectiveDonorId!,
            home_id: homeId,
            trust_id: trustId,
            amount_pledged: effectiveAmount,
            sponsorship_type: 'ONE_TIME' as const,
            payment_mode: paymentState.paymentMode === 'NEFT' ? 'offline' : 'offline',
            start_date: selectedSlots[0]?.date || format(new Date(), 'yyyy-MM-dd'),
            status: 'PLEDGED' as const,
          })
          .select('id')
          .single();
        if (error) throw error;
        donationId = insertedDonation?.id || null;
      } catch (err) {
        console.error('Failed to create donation for payment link:', err);
      }
    }

    const sharedPaymentData = {
      payment_status: normalizedPayment,
      payment_mode: paymentFields.payment_mode,
      amount_paid: paymentFields.amount_paid,
      donation_id: donationId,
      cheque_number: paymentState.paymentMode === 'Cheque' ? paymentState.chequeNumber.trim() : null,
      bank_name: paymentState.paymentMode === 'Cheque' ? paymentState.bankName.trim() : null,
      cheque_image_url: paymentState.paymentMode === 'Cheque' ? paymentState.chequeImageUrl : null,
      cheque_status: paymentState.paymentMode === 'Cheque' ? 'PENDING' : null,
    };
    let bookedSlots: Array<{ id?: string }> = [];

    if (step === 'same') {
      const sharedOccasion = resolveOccasionLabel(occasion, customOccasion);
      bookedSlots = await bulkBookMutation.mutateAsync({
        slots: buildSlotsForBooking(
          selectedSlots.map((slot) => ({
            date: slot.date,
            homeId: slot.homeId,
            homeName: slot.homeName,
            timeSlot: slot.timeSlot,
            existingSlotId: slot.existingSlotId,
            individualDetails: {
              reason: purposeEdited
                ? purpose
                : buildPurposeForSlot(
                    slot,
                    occasion,
                    customOccasion,
                    personName,
                    outsideMealType,
                  ),
              sponsor_for: sharedOccasion,
              note: additionalNotes,
              donate_on_behalf_of: personName || null,
              meal_type: slot.timeSlot === 'OUTSIDE_FOOD' ? outsideMealType : null,
            },
          })),
        ),
        bookingData: {
          donor_id: effectiveDonorId,
          reason: purpose,
          sponsor_for: sharedOccasion,
          note: additionalNotes,
          amount: effectiveAmount,
          ...sharedPaymentData,
          donate_on_behalf_of: personName || null,
          meal_type: hasOutsideFoodSlot ? outsideMealType : null,
        },
        trustId,
        useIndividualDetails: true,
      });
    } else {
      bookedSlots = await bulkBookMutation.mutateAsync({
        slots: buildSlotsForBooking(
          selectedSlots.map((slot) => {
            const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
            const details = perSlotDetails.get(key);
            const occasionLabel = details
              ? resolveOccasionLabel(details.occasion, details.customOccasion)
              : '';
            return {
              date: slot.date,
              homeId: slot.homeId,
              homeName: slot.homeName,
              timeSlot: slot.timeSlot,
              existingSlotId: slot.existingSlotId,
              individualDetails: details
                ? {
                    reason: details.purpose,
                    sponsor_for: occasionLabel,
                    note: details.additionalNotes,
                    donate_on_behalf_of: details.personName || null,
                    meal_type:
                      slot.timeSlot === 'OUTSIDE_FOOD' ? details.outsideMealType : null,
                  }
                : undefined,
            };
          }),
        ),
        bookingData: {
          donor_id: effectiveDonorId,
          reason: '',
          sponsor_for: '',
          note: '',
          amount: effectiveAmount,
          ...sharedPaymentData,
          donate_on_behalf_of: null,
        },
        trustId,
        useIndividualDetails: true,
      });
    }

    const bookedSlotIds = bookedSlots.map((s) => s.id).filter(Boolean) as string[];
    if (bookedSlotIds.length) {
      try {
        const ack = await sendFoodBookingAcknowledgement(bookedSlotIds);
        if (ack?.sent) {
          toast.success('Acknowledgement sent to donor via email/WhatsApp');
        }
      } catch (ackErr) {
        console.error('Failed to send booking acknowledgement:', ackErr);
        toast.error('Booking saved, but acknowledgement could not be sent');
      }

      if (user?.role === 'admin' || user?.role === 'super_admin') {
        try {
          const staffNotify = await sendAdminFoodBookingStaffNotify(bookedSlotIds);
          if (staffNotify && !staffNotify.skipped && staffNotify.workersNotified > 0) {
            toast.success('Assigned social workers notified');
          }
        } catch (staffErr) {
          console.error('Failed to notify social workers:', staffErr);
          toast.error('Booking saved, but social worker notifications could not be sent');
        }
      }

      if (normalizedPayment === 'FULLY_PAID') {
        try {
          const receiptResult = await sendFoodReceiptThankYou(bookedSlotIds);
          if (receiptResult?.count) {
            toast.success('Receipt and thank-you letter sent to donor');
          }
        } catch (receiptErr) {
          console.error('Failed to send receipt/thank-you:', receiptErr);
          toast.error('Booking saved, but receipt/thank-you could not be sent');
        }
      }
    }

    if (donationId && donor && paymentState.paymentMode === 'NEFT') {
      try {
        const slotSummary = selectedSlots
          .map((s) => `${format(new Date(s.date), 'dd MMM yyyy')} - ${TIME_SLOT_LABELS[s.timeSlot]}`)
          .join(', ');

        await sendBookingPaymentNotifications({
          donorEmail: donor.email,
          donorPhone: donor.phone,
          donorName: donor.name,
          donationId,
          amount: effectiveAmount,
          homeName: selectedSlots[0]?.homeName || 'Project',
          eventDescription: `Food Sponsorship (${slotSummary})`,
          date: selectedSlots[0]?.date || format(new Date(), 'dd MMM yyyy'),
        });
      } catch (notifyErr) {
        console.error('Failed to send payment notifications:', notifyErr);
      }
    }

    if (openPayPage && donationId) {
      window.open(buildFoodPaymentLink(donationId), '_blank', 'noopener,noreferrer');
    } else if (donationId && paymentState.paymentMode === 'NEFT') {
      toast.success('Booking saved. Payment link sent to donor.');
    }

    onSuccess();
    onOpenChange(false);
  };

  const isValidSameForAll =
    !!occasion &&
    (occasion !== 'Others' || !!customOccasion.trim()) &&
    !!purpose.trim();

  const isValidDifferent = useMemo(() => {
    for (const slot of selectedSlots) {
      const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
      const details = perSlotDetails.get(key);
      if (!details) return false;
      const occasionLabel = resolveOccasionLabel(details.occasion, details.customOccasion);
      if (!occasionLabel || !details.purpose.trim()) return false;
    }
    return true;
  }, [selectedSlots, perSlotDetails]);

  const isValidDonor =
    !!preSelectedDonor ||
    !!donorId ||
    (showNewDonor && !!newDonor.name.trim() && !!newDonor.phone.trim());

  const isValidPayment = useMemo(() => {
    if (paymentState.paymentMode === 'Cheque') {
      return (
        !!paymentState.chequeNumber.trim() &&
        !!paymentState.bankName.trim() &&
        !!paymentState.chequeImageUrl
      );
    }
    if (paymentState.paymentMode === 'Cash' && paymentState.cashStatus === 'PARTIALLY_PAID') {
      const received = parseFloat(paymentState.amountReceived);
      return received > 0 && received < effectiveAmount;
    }
    return true;
  }, [paymentState, effectiveAmount]);

  const handleChequeUpload = async (file: File) => {
    const url = await uploadChequeImage(
      file,
      selectedSlots.map((s) => s.date).join('-'),
    );
    if (url) {
      setPaymentState((prev) => ({ ...prev, chequeImageUrl: url }));
    }
  };

  const isValid =
    isValidDonor &&
    isValidPayment &&
    (step === 'same'
      ? isValidSameForAll
      : step === 'different'
        ? isValidDifferent
        : sameForAll !== null);

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
                        {format(new Date(slot.date), 'dd MMM yyyy')} - {slot.homeName} - {slotPurposeLabel(slot, slot.timeSlot === 'OUTSIDE_FOOD' ? outsideMealType : undefined)}
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
                      <p className="text-sm text-muted-foreground">Apply same occasion, purpose, and notes to all slots</p>
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
                {hasOutsideFoodSlot && (
                  <div className="space-y-2">
                    <Label>Outside Food — Meal Type *</Label>
                    <Select
                      value={outsideMealType}
                      onValueChange={(val) => {
                        setOutsideMealType(val as OutsideMealType);
                        setPurposeEdited(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select meal type" />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTSIDE_MEAL_TYPES.map((meal) => (
                          <SelectItem key={meal} value={meal}>
                            {meal}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Person Name (if applicable)</Label>
                  <Input
                    placeholder="e.g., T.S. Uma Maheswari"
                    value={personName}
                    onChange={(e) => {
                      setPersonName(e.target.value);
                      setPurposeEdited(false);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Name of the person being honoured or remembered
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Occasion Type *</Label>
                  <Select
                    value={occasion}
                    onValueChange={(val) => {
                      setOccasion(val);
                      setPurposeEdited(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select occasion" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_OCCASION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {occasion === 'Others' && (
                    <Input
                      placeholder="Specify occasion"
                      value={customOccasion}
                      onChange={(e) => {
                        setCustomOccasion(e.target.value);
                        setPurposeEdited(false);
                      }}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Purpose *</Label>
                  <Textarea
                    placeholder="Purpose will be generated from your selections…"
                    value={purpose}
                    onChange={(e) => {
                      setPurpose(e.target.value);
                      setPurposeEdited(true);
                    }}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-generated from home, meal, occasion, and person name. You can edit before saving.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    placeholder="Special instructions or donor requests…"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
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

                {selectedSlots.some((slot) => canOfferRefreshmentOptIn(slot.timeSlot)) && (
                  <div className="space-y-3">
                    <Label>Optional refreshments</Label>
                    {selectedSlots
                      .filter((slot) => canOfferRefreshmentOptIn(slot.timeSlot))
                      .map((slot) => {
                        const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
                        return (
                          <div key={key} className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(slot.date), 'dd MMM yyyy')} · {slot.homeName} ·{' '}
                              {TIME_SLOT_LABELS[slot.timeSlot]}
                            </p>
                            <FoodRefreshmentOptIn
                              timeSlot={slot.timeSlot}
                              checked={refreshmentOptIn.get(key) === true}
                              onCheckedChange={(checked) => toggleRefreshmentOptIn(key, checked)}
                              price={refreshmentPrice}
                              idPrefix={key}
                            />
                          </div>
                        );
                      })}
                  </div>
                )}

                <FoodBookingPaymentSection
                  effectiveAmount={effectiveAmount}
                  state={paymentState}
                  onChange={(patch) => setPaymentState((prev) => ({ ...prev, ...patch }))}
                  onChequeFileSelect={handleChequeUpload}
                  chequeUploading={chequeUploading}
                />
              </>
            )}

            {/* Step 2b: Different for each - Show accordion */}
            {step === 'different' && (
              <>
                <Accordion type="single" collapsible className="w-full">
                  {selectedSlots.map((slot, idx) => {
                    const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
                    const details = perSlotDetails.get(key) || {
                      occasion: '',
                      customOccasion: '',
                      purpose: '',
                      purposeEdited: false,
                      additionalNotes: '',
                      personName: '',
                      outsideMealType: 'Breakfast' as OutsideMealType,
                    };
                    const occasionLabel = resolveOccasionLabel(
                      details.occasion,
                      details.customOccasion,
                    );
                    const isComplete = !!occasionLabel && !!details.purpose.trim();
                    const isOutsideFood = slot.timeSlot === 'OUTSIDE_FOOD';

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
                              {format(new Date(slot.date), 'dd MMM')} - {slot.homeName} -{' '}
                              {slotPurposeLabel(slot, isOutsideFood ? details.outsideMealType : undefined)}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          {isOutsideFood && (
                            <div className="space-y-2">
                              <Label>Outside Food — Meal Type *</Label>
                              <Select
                                value={details.outsideMealType}
                                onValueChange={(val) =>
                                  updateSlotDetails(key, 'outsideMealType', val)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select meal type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {OUTSIDE_MEAL_TYPES.map((meal) => (
                                    <SelectItem key={meal} value={meal}>
                                      {meal}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Person Name (if applicable)</Label>
                            <Input
                              placeholder="Name of person being honoured or remembered"
                              value={details.personName}
                              onChange={(e) =>
                                updateSlotDetails(key, 'personName', e.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Occasion Type *</Label>
                            <Select
                              value={details.occasion}
                              onValueChange={(val) => updateSlotDetails(key, 'occasion', val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select occasion" />
                              </SelectTrigger>
                              <SelectContent>
                                {FOOD_OCCASION_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {details.occasion === 'Others' && (
                              <Input
                                placeholder="Specify occasion"
                                value={details.customOccasion}
                                onChange={(e) =>
                                  updateSlotDetails(key, 'customOccasion', e.target.value)
                                }
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Purpose *</Label>
                            <Textarea
                              placeholder="Purpose will be generated from your selections…"
                              value={details.purpose}
                              onChange={(e) => {
                                setPerSlotDetails((prev) => {
                                  const newMap = new Map(prev);
                                  const existing = newMap.get(key) || {
                                    occasion: '',
                                    customOccasion: '',
                                    purpose: '',
                                    purposeEdited: false,
                                    additionalNotes: '',
                                    personName: '',
                                    outsideMealType: 'Breakfast' as OutsideMealType,
                                  };
                                  newMap.set(key, {
                                    ...existing,
                                    purpose: e.target.value,
                                    purposeEdited: true,
                                  });
                                  return newMap;
                                });
                              }}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Additional Notes</Label>
                            <Textarea
                              placeholder="Special instructions or donor requests…"
                              value={details.additionalNotes}
                              onChange={(e) =>
                                updateSlotDetails(key, 'additionalNotes', e.target.value)
                              }
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

                {selectedSlots.some((slot) => canOfferRefreshmentOptIn(slot.timeSlot)) && (
                  <div className="space-y-3">
                    <Label>Optional refreshments</Label>
                    {selectedSlots
                      .filter((slot) => canOfferRefreshmentOptIn(slot.timeSlot))
                      .map((slot) => {
                        const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
                        return (
                          <div key={key} className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(slot.date), 'dd MMM yyyy')} · {slot.homeName} ·{' '}
                              {TIME_SLOT_LABELS[slot.timeSlot]}
                            </p>
                            <FoodRefreshmentOptIn
                              timeSlot={slot.timeSlot}
                              checked={refreshmentOptIn.get(key) === true}
                              onCheckedChange={(checked) => toggleRefreshmentOptIn(key, checked)}
                              price={refreshmentPrice}
                              idPrefix={`diff-${key}`}
                            />
                          </div>
                        );
                      })}
                  </div>
                )}

                <FoodBookingPaymentSection
                  effectiveAmount={effectiveAmount}
                  state={paymentState}
                  onChange={(patch) => setPaymentState((prev) => ({ ...prev, ...patch }))}
                  onChequeFileSelect={handleChequeUpload}
                  chequeUploading={chequeUploading}
                  idPrefix="diff"
                />
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
            <>
              {paymentState.paymentMode === 'NEFT' && effectiveAmount > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => handleSubmit(true)}
                  disabled={!isValid || bulkBookMutation.isPending || createDonor.isPending}
                >
                  {(bulkBookMutation.isPending || createDonor.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Pay Now
                </Button>
              )}
              <Button
                onClick={() => handleSubmit(false)}
                disabled={!isValid || bulkBookMutation.isPending || createDonor.isPending}
              >
                {(bulkBookMutation.isPending || createDonor.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirm Booking ({selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}