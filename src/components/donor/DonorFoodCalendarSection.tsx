import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, ExternalLink, Utensils } from 'lucide-react';
import { FoodCalendarGrid } from '@/components/food-calendar/FoodCalendarGrid';
import { FoodSlotLegend } from '@/components/food-calendar/FoodSlotLegend';
import { FoodSlotDetailPanel } from '@/components/food-calendar/FoodSlotDetailPanel';
import { useFoodSlots, FoodSlot, FoodTimeSlot } from '@/hooks/useFoodSlots';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRazorpay } from '@/hooks/useRazorpay';
import { invalidateDonorNotifications } from '@/hooks/useNotifications';
import { clearBlockingOverlays, RAZORPAY_OPEN_DELAY_MS } from '@/lib/razorpayCheckout';
import type { FoodSlotRazorpayPayRequest } from '@/lib/foodSlotRazorpay';
import { cn } from '@/lib/utils';

interface Home {
  id: string;
  name: string;
  trust_id: string;
}

export const DonorFoodCalendarSection = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { initiatePayment, isProcessing: razorpayProcessing } = useRazorpay();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<FoodTimeSlot | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<FoodSlot | null>(null);

  const { data: homes = [], isLoading: homesLoading } = useQuery({
    queryKey: ['homes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('homes').select('id, name, trust_id').order('name');
      if (error) throw error;
      return data as Home[];
    },
  });

  const { data: slots = [], isLoading: slotsLoading } = useFoodSlots(
    selectedHomeId,
    currentDate.getFullYear(),
    currentDate.getMonth(),
  );

  const selectedHome = homes.find((h) => h.id === selectedHomeId);
  const calendarLoading = Boolean(selectedHomeId) && slotsLoading;

  const handleSlotClick = (date: Date, timeSlot: FoodTimeSlot, existingSlot?: FoodSlot) => {
    if (isBefore(date, startOfDay(new Date()))) {
      toast.error('Cannot book slots for past dates');
      return;
    }
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
    setSelectedSlot(existingSlot || null);
    setPanelOpen(true);
  };

  const handleRazorpayFoodPayment = useCallback((req: FoodSlotRazorpayPayRequest) => {
    setPanelOpen(false);

    window.setTimeout(() => {
      clearBlockingOverlays();
      void initiatePayment({
        amount: req.amount,
        foodSlot: {
          food_slot_id: req.food_slot_id,
          home_id: req.home_id,
          trust_id: req.trust_id,
          date: req.date,
          time_slot: req.time_slot,
          occasion_type: req.occasion_type,
          occasion_note: req.occasion_note,
          recurring_frequency: req.recurring_frequency,
          donation_for: req.donation_for,
          event_date: req.event_date,
          donor_board_name: req.donor_board_name,
          meal_type: req.meal_type,
          reason: req.reason,
          sponsor_for: req.sponsor_for,
          donate_on_behalf_of: req.donate_on_behalf_of,
          include_refreshment: req.include_refreshment,
        },
        donorName: req.donorName,
        donorEmail: req.donorEmail,
        donorPhone: req.donorPhone,
        description: `${req.slotLabel} sponsorship · ${req.homeName}`,
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ['food-slots'] });
          await queryClient.invalidateQueries({ queryKey: ['donor-food-slots'] });
          await queryClient.invalidateQueries({ queryKey: ['food-recurring-pledges'] });
          await queryClient.refetchQueries({ queryKey: ['food-slots'] });
          await invalidateDonorNotifications(queryClient);
          toast.success(
            req.recurring_frequency
              ? `Thank you! Your ${req.slotLabel.toLowerCase()} sponsorship is confirmed and a ${req.recurring_frequency} pledge is set.`
              : `Thank you! Your ${req.slotLabel.toLowerCase()} sponsorship for ${req.homeName} is confirmed.`,
          );
        },
        onFailure: (error) => {
          if (error !== 'Payment cancelled by user') {
            toast.error(error || 'Payment could not be completed');
          }
        },
      });
    }, RAZORPAY_OPEN_DELAY_MS);
  }, [initiatePayment, queryClient]);

  return (
    <section className="donor-section border-t border-[var(--msc-border)] bg-[var(--msc-surface-alt)]">
      <div className="donor-container py-10 md:py-14">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#ffca0f]/20">
              <Utensils className="h-6 w-6 text-[#ff6633]" />
            </div>
            <div>
              <h2 className="donor-section-title">Food Calendar</h2>
              <p className="text-sm mt-1" style={{ color: '#666' }}>
                Sponsor morning, afternoon, or evening meals for our projects
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-4 md:py-6">
            <p className="text-sm font-medium mb-3 text-center" style={{ color: '#333' }}>
              Select a project
            </p>
            {homesLoading ? (
              <Skeleton className="h-32 w-full max-w-lg rounded-lg" />
            ) : (
              <div className="w-full max-w-lg space-y-2">
                {homes.map((home) => {
                  const selected = selectedHomeId === home.id;
                  return (
                    <div
                      key={home.id}
                      className={cn(
                        'donor-card flex items-center gap-3 px-4 py-3 transition-colors',
                        selected && 'ring-2 ring-[#ff6633] bg-[rgba(255,202,15,0.08)]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedHomeId(home.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={cn(
                              'h-4 w-4 rounded-full border-2 shrink-0',
                              selected ? 'border-[#ff6633] bg-[#ff6633]' : 'border-[#ccc] bg-white',
                            )}
                            aria-hidden
                          />
                          <span className="font-medium truncate" style={{ color: '#333' }}>
                            {home.name}
                          </span>
                        </span>
                      </button>
                      <Link
                        to={`/projects/${home.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-sm font-medium underline whitespace-nowrap"
                        style={{ color: '#ff6633' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Know More
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
            {!selectedHomeId && !homesLoading && (
              <p className="text-sm mt-4 text-center max-w-md" style={{ color: '#666' }}>
                Choose a project above to view available meal slots and sponsor a meal.
              </p>
            )}
          </div>

          {selectedHomeId && (
            <>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[150px] text-center font-medium" style={{ fontFamily: 'Rubik, sans-serif' }}>
                  {format(currentDate, 'MMMM yyyy')}
                </span>
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <FoodSlotLegend />
            </>
          )}
        </div>

        {selectedHomeId && (
          calendarLoading ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : (
            <div className="donor-card p-4 md:p-6 overflow-x-auto donor-food-calendar">
              <FoodCalendarGrid
                currentDate={currentDate}
                slots={slots}
                onSlotClick={handleSlotClick}
                compact={isMobile}
              />
            </div>
          )
        )}

        <FoodSlotDetailPanel
          open={panelOpen}
          onOpenChange={(open) => {
            setPanelOpen(open);
            if (!open) {
              setSelectedSlot(null);
              setSelectedDate(null);
              setSelectedTimeSlot(null);
            }
          }}
          date={selectedDate}
          timeSlot={selectedTimeSlot}
          existingSlot={selectedSlot}
          homeId={selectedHomeId || ''}
          trustId={selectedHome?.trust_id || ''}
          homeName={selectedHome?.name || ''}
          homeSlots={slots}
          onRazorpayFoodPayment={handleRazorpayFoodPayment}
          razorpayProcessing={razorpayProcessing}
        />
      </div>
    </section>
  );
};
