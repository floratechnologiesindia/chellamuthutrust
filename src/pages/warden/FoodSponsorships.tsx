import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FoodDistributionTableView } from '@/components/food-calendar/FoodDistributionTableView';
import { ProjectSwitcher } from '@/components/warden/ProjectSwitcher';
import { AssignedHomeStates } from '@/components/warden/AssignedHomeStates';
import { useAssignedHome, useActiveProject } from '@/hooks/useAssignedHome';
import {
  useFutureBookedFoodSlots,
  useCompletedFoodSlots,
  type FoodSlot,
} from '@/hooks/useFoodSlots';
import { useSendFoodThankYou, useShareFoodPhotos } from '@/hooks/useWardenOps';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { normalizePaymentStatus } from '@/lib/foodSlotUtils';
import { toast } from 'sonner';
import { Copy, Mail, Image } from 'lucide-react';

const TIME_LABELS: Record<string, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
  OUTSIDE_FOOD: 'Outside Food',
};

function SlotList({
  slots,
  empty,
  showActions,
}: {
  slots: FoodSlot[];
  empty: string;
  showActions?: boolean;
}) {
  const thankYou = useSendFoodThankYou();
  const sharePhotos = useShareFoodPhotos();

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
                    {TIME_LABELS[slot.time_slot] || slot.time_slot}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {slot.donor_name || 'Donor'} · ₹{(slot.amount || 0).toLocaleString('en-IN')}
                  </p>
                  {slot.sponsor_for && (
                    <p className="text-xs text-muted-foreground">
                      {slot.sponsor_for}
                      {slot.donate_on_behalf_of ? ` · For ${slot.donate_on_behalf_of}` : ''}
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
                  {pay === 'FULLY_PAID' && !slot.report_sent_at && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={thankYou.isPending}
                      onClick={() =>
                        thankYou.mutate(slot.id, {
                          onSuccess: () => toast.success('Thank-you letter sent'),
                          onError: (e) => toast.error(e.message),
                        })
                      }
                    >
                      <Mail className="h-3.5 w-3.5 mr-1" /> Send thank-you
                    </Button>
                  )}
                  {(slot.completion_photos?.length || 0) > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={sharePhotos.isPending}
                      onClick={() =>
                        sharePhotos.mutate(slot.id, {
                          onSuccess: () => toast.success('Photographs shared with donor'),
                          onError: (e) => toast.error(e.message),
                        })
                      }
                    >
                      <Image className="h-3.5 w-3.5 mr-1" /> Share photos
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
  const { homeId, home, isLoading } = useAssignedHome();
  const { assignedProjectIds, home: activeHome } = useActiveProject();
  const { data: upcoming = [] } = useFutureBookedFoodSlots(homeId);
  const { data: completed = [] } = useCompletedFoodSlots(homeId);

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
                <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
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
                <SlotList slots={upcoming} empty="No upcoming food sponsorships." showActions />
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                <SlotList slots={completed} empty="No completed sponsorships yet." showActions />
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sponsorship history</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SlotList
                      slots={[...upcoming, ...completed].sort((a, b) => b.date.localeCompare(a.date))}
                      empty="No sponsorship history."
                      showActions
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </MainLayout>
      )}
    </AssignedHomeStates>
  );
};

export default WardenFoodSponsorships;
