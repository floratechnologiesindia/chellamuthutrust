import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FoodDistributionTableView } from '@/components/food-calendar/FoodDistributionTableView';
import { FoodReceiptThankYouDialog } from '@/components/food-calendar/FoodReceiptThankYouDialog';
import { ProjectSwitcher } from '@/components/warden/ProjectSwitcher';
import { AssignedHomeStates } from '@/components/warden/AssignedHomeStates';
import { useAssignedHome, useActiveProject } from '@/hooks/useAssignedHome';
import {
  useFutureBookedFoodSlots,
  useCompletedFoodSlots,
  usePastFoodSlotsNeedingMedia,
  type FoodSlot,
} from '@/hooks/useFoodSlots';
import {
  useSendFoodThankYou,
  useSendFoodPaymentReminder,
  useSendFoodReceiptThankYou,
} from '@/hooks/useWardenOps';
import { useSubmitFoodEventMedia } from '@/hooks/useFoodEventMedia';
import { FoodEventMediaDialog } from '@/components/food-calendar/FoodEventMediaDialog';
import { FoodEventMediaStatusBadge } from '@/components/food-calendar/FoodEventMediaReviewDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { normalizePaymentStatus, getFoodSlotBalanceDue } from '@/lib/foodSlotUtils';
import { FOOD_TIME_SLOT_LABELS } from '@/lib/foodSlotConstants';
import { toast } from 'sonner';
import { Copy, Mail, Bell, FileText, Camera } from 'lucide-react';
import {
  isEligibleForPaymentReminder,
  daysSinceDate,
  paymentReminderLabel,
  PAYMENT_REMINDER_MIN_DAYS,
} from '@/lib/foodPaymentReminderUtils';

const TIME_LABELS = FOOD_TIME_SLOT_LABELS;

function slotMealLabel(slot: FoodSlot): string {
  const base = TIME_LABELS[slot.time_slot] || slot.time_slot;
  if (slot.time_slot === 'OUTSIDE_FOOD' && slot.meal_type) {
    return `${base} (${slot.meal_type})`;
  }
  return base;
}

function SlotList({
  slots,
  empty,
  showActions,
  onOpenReceipt,
  onUploadMedia,
}: {
  slots: FoodSlot[];
  empty: string;
  showActions?: boolean;
  onOpenReceipt?: (slotId: string) => void;
  onUploadMedia?: (slot: FoodSlot) => void;
}) {
  const thankYou = useSendFoodThankYou();
  const paymentReminder = useSendFoodPaymentReminder();
  const resendReceiptThankYou = useSendFoodReceiptThankYou();

  const canUploadMedia = (slot: FoodSlot) => {
    if (slot.photos_shared_at) return false;
    if (slot.event_media_status === 'PENDING' || slot.event_media_status === 'APPROVED') return false;
    const today = new Date().toISOString().split('T')[0];
    return slot.date <= today;
  };

  if (!slots.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>;
  }
  return (
    <div className="space-y-3">
      {slots.map((slot) => {
        const pay = normalizePaymentStatus(slot.payment_status, slot.status);
        const paymentLink = slot.donation_id
          ? `${window.location.origin}/pay?donationId=${slot.donation_id}`
          : null;
        return (
          <Card key={slot.id}>
            <CardContent className="py-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">
                    {format(new Date(`${slot.date}T12:00:00`), 'dd MMM yyyy')} ·{' '}
                    {slotMealLabel(slot)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {slot.donor_name || 'Donor'} · ₹{(slot.amount || 0).toLocaleString('en-IN')}
                  </p>
                  {slot.reason && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{slot.reason}</p>
                  )}
                  {slot.sponsor_for && (
                    <p className="text-xs text-muted-foreground">
                      {slot.sponsor_for}
                      {slot.donate_on_behalf_of ? ` · ${slot.donate_on_behalf_of}` : ''}
                    </p>
                  )}
                  {slot.payment_mode && (
                    <p className="text-xs text-muted-foreground">
                      {slot.payment_mode}
                      {pay && pay !== 'FULLY_PAID' && (
                        <> · Balance ₹{getFoodSlotBalanceDue(slot).toLocaleString('en-IN')}</>
                      )}
                    </p>
                  )}
                  <div className="pt-1">
                    <FoodEventMediaStatusBadge
                      status={slot.event_media_status}
                      photosSharedAt={slot.photos_shared_at}
                    />
                  </div>
                  {pay && pay !== 'FULLY_PAID' && slot.created_at && (
                    <p className="text-xs text-muted-foreground">
                      Pending {daysSinceDate(slot.created_at)} day(s)
                      {slot.payment_reminder_sent_at ? ' · Reminder sent' : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{slot.status}</Badge>
                  {pay && (
                    <Badge
                      variant={
                        pay === 'FULLY_PAID' ? 'default' : pay === 'PARTIALLY_PAID' ? 'secondary' : 'destructive'
                      }
                    >
                      {pay.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </div>
              {showActions && (
                <div className="flex flex-wrap gap-2">
                  {paymentLink && pay !== 'FULLY_PAID' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(paymentLink);
                        toast.success('Payment link copied');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy payment link
                    </Button>
                  )}
                  {showActions && pay && pay !== 'FULLY_PAID' && isEligibleForPaymentReminder(slot) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={paymentReminder.isPending}
                      onClick={() =>
                        paymentReminder.mutate(
                          { slotId: slot.id },
                          {
                            onSuccess: () => toast.success('Payment reminder sent via email & WhatsApp'),
                            onError: (e) => toast.error(e.message),
                          },
                        )
                      }
                    >
                      <Bell className="h-3.5 w-3.5 mr-1" />
                      {paymentReminderLabel(slot)}
                    </Button>
                  )}
                  {showActions && pay && pay !== 'FULLY_PAID' && !isEligibleForPaymentReminder(slot) && (
                    <span className="text-xs text-muted-foreground self-center">
                      Reminder available after {PAYMENT_REMINDER_MIN_DAYS} days
                    </span>
                  )}
                  {pay === 'FULLY_PAID' && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenReceipt?.(slot.id)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" /> Receipt &amp; thank-you
                      </Button>
                      {!slot.receipt_thankyou_sent_at && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={resendReceiptThankYou.isPending}
                          onClick={() =>
                            resendReceiptThankYou.mutate(
                              { slotIds: [slot.id] },
                              {
                                onSuccess: (data) => {
                                  if (data?.count) toast.success('Receipt and thank-you sent to donor');
                                  else toast.message('Receipt/thank-you was already sent or not eligible');
                                },
                                onError: (e) => toast.error(e.message),
                              },
                            )
                          }
                        >
                          <Mail className="h-3.5 w-3.5 mr-1" /> Send to donor
                        </Button>
                      )}
                    </>
                  )}
                  {showActions && canUploadMedia(slot) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onUploadMedia?.(slot)}
                    >
                      <Camera className="h-3.5 w-3.5 mr-1" />
                      {slot.event_media_status === 'REJECTED' ? 'Re-upload media' : 'Upload event media'}
                    </Button>
                  )}
                  {pay === 'FULLY_PAID' && !slot.report_sent_at && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={thankYou.isPending}
                      onClick={() =>
                        thankYou.mutate(slot.id, {
                          onSuccess: () => toast.success('Post-event thank-you sent'),
                          onError: (e) => toast.error(e.message),
                        })
                      }
                    >
                      <Mail className="h-3.5 w-3.5 mr-1" /> Post-event thank-you
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const WardenFoodSponsorships = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'book';
  const [receiptSlotId, setReceiptSlotId] = useState<string | null>(null);
  const [mediaSlot, setMediaSlot] = useState<FoodSlot | null>(null);
  const submitEventMedia = useSubmitFoodEventMedia();
  const { homeId, home, isLoading } = useAssignedHome();
  const { assignedProjectIds, home: activeHome } = useActiveProject();
  const { data: upcoming = [] } = useFutureBookedFoodSlots(homeId);
  const { data: completed = [] } = useCompletedFoodSlots(homeId);
  const { data: needingMedia = [] } = usePastFoodSlotsNeedingMedia(homeId);

  const completedMerged = useMemo(() => {
    const byId = new Map<string, FoodSlot>();
    [...needingMedia, ...completed].forEach((slot) => byId.set(slot.id, slot));
    return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [needingMedia, completed]);

  const lockTrustId = activeHome?.trust_id || home?.trust_id;
  const homeIds = useMemo(
    () => (assignedProjectIds.length ? assignedProjectIds : homeId ? [homeId] : []),
    [assignedProjectIds, homeId],
  );

  return (
    <AssignedHomeStates homeId={homeId} home={home} isLoading={isLoading}>
      {home && homeId && (
        <MainLayout>
          <div className="container py-8 space-y-6">
            <div className="flex flex-col gap-2">
              <div className="md:hidden">
                <ProjectSwitcher className="w-full max-w-xs" />
              </div>
              <p className="text-sm text-muted-foreground">{home.name}</p>
              <h1 className="text-3xl font-display font-bold">Food Sponsorships</h1>
              <p className="text-muted-foreground">
                Multi-slot booking for donors — including Outside Food (donor brings and serves)
              </p>
            </div>

            <Tabs defaultValue={defaultTab}>
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="book">New Booking</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedMerged.length})</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="book" className="mt-4">
                <FoodDistributionTableView
                  homeIds={homeIds}
                  lockTrustId={lockTrustId}
                  selectModeDefault={false}
                  singleClickBooking
                />
              </TabsContent>

              <TabsContent value="upcoming" className="mt-4">
                <SlotList
                  slots={upcoming}
                  empty="No upcoming food sponsorships."
                  showActions
                  onOpenReceipt={setReceiptSlotId}
                  onUploadMedia={setMediaSlot}
                />
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                <SlotList
                  slots={completedMerged}
                  empty="No completed sponsorships yet."
                  showActions
                  onOpenReceipt={setReceiptSlotId}
                  onUploadMedia={setMediaSlot}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sponsorship history</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SlotList
                      slots={[...upcoming, ...completedMerged].sort((a, b) => b.date.localeCompare(a.date))}
                      empty="No sponsorship history."
                      showActions
                      onOpenReceipt={setReceiptSlotId}
                      onUploadMedia={setMediaSlot}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <FoodReceiptThankYouDialog
              slotId={receiptSlotId}
              open={Boolean(receiptSlotId)}
              onOpenChange={(open) => {
                if (!open) setReceiptSlotId(null);
              }}
            />

            {mediaSlot && (
              <FoodEventMediaDialog
                open={Boolean(mediaSlot)}
                onOpenChange={(open) => {
                  if (!open) setMediaSlot(null);
                }}
                slot={mediaSlot}
                onSubmit={async ({ notes, photoUrls, videoUrls }) => {
                  await submitEventMedia.mutateAsync({
                    slotId: mediaSlot.id,
                    photos: photoUrls,
                    videos: videoUrls,
                    notes,
                  });
                }}
              />
            )}
          </div>
        </MainLayout>
      )}
    </AssignedHomeStates>
  );
};

export default WardenFoodSponsorships;
