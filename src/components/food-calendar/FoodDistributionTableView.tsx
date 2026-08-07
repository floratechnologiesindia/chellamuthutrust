import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Loader2, CalendarIcon, X, IndianRupee, CheckSquare, Square } from 'lucide-react';
import { useHomes } from '@/hooks/useHomes';
import { useFoodSlotsAllHomes, FoodTimeSlot, FoodSlotStatus } from '@/hooks/useFoodSlots';
import { useFoodSlotPricingMap } from '@/hooks/useFoodSlotPricing';
import { FoodSlotEditDialog } from './FoodSlotEditDialog';
import { MultiSlotBookingDialog } from './MultiSlotBookingDialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { DonorWithStats } from '@/hooks/useDonors';
import { mergeFoodSlotsByCell } from '@/lib/foodSlotUtils';
import {
  FOOD_TIME_SLOTS,
  FOOD_TIME_SLOT_SHORT_LABELS,
} from '@/lib/foodSlotConstants';

const TIME_SLOT_LABELS = FOOD_TIME_SLOT_SHORT_LABELS;
const TIME_SLOTS = FOOD_TIME_SLOTS;

interface Trust {
  id: string;
  name: string;
}

interface FoodSlotCellData {
  slotId: string | null;
  status: FoodSlotStatus | null;
  note: string | null;
}

interface SelectedSlotKey {
  date: string;
  homeId: string;
  homeName: string;
  timeSlot: FoodTimeSlot;
  existingSlotId: string | null;
}

interface FoodDistributionTableViewProps {
  preSelectedDonor?: DonorWithStats;
  /** Limit projects shown (e.g. social worker assigned projects). */
  homeIds?: string[];
  /** Hide trust picker and lock to this trust. */
  lockTrustId?: string;
  /** Start in multi-select booking mode (default true). */
  selectModeDefault?: boolean;
  /**
   * When true, a single click (outside select mode) opens the booking flow for
   * that slot instead of the admin create/edit dialog. Used by the social worker portal.
   */
  singleClickBooking?: boolean;
}

export function FoodDistributionTableView({
  preSelectedDonor,
  homeIds,
  lockTrustId,
  selectModeDefault = true,
  singleClickBooking = false,
}: FoodDistributionTableViewProps) {
  const { priceMap } = useFoodSlotPricingMap();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTrustId, setSelectedTrustId] = useState<string>(lockTrustId || '');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectMode, setSelectMode] = useState(selectModeDefault);
  const [selectedSlots, setSelectedSlots] = useState<Map<string, SelectedSlotKey>>(new Map());
  const [showMultiBookDialog, setShowMultiBookDialog] = useState(false);
  const [singleBookingSlot, setSingleBookingSlot] = useState<SelectedSlotKey | null>(null);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    date: string;
    timeSlot: FoodTimeSlot;
    homeId: string;
    homeName: string;
    trustId: string;
    existingSlot: any | null;
  } | null>(null);

  // Fetch trusts
  const { data: trusts = [] } = useQuery({
    queryKey: ['trusts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusts')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as Trust[];
    },
  });

  // Get user role info
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(r => r.role);
    },
    enabled: !!user?.id,
  });

  const isSuperAdmin = userRoles.includes('super_admin');

  // Auto-select trust
  const effectiveTrustId = useMemo(() => {
    if (lockTrustId) return lockTrustId;
    if (selectedTrustId) return selectedTrustId;
    if (!isSuperAdmin && user?.trust_id) return user.trust_id;
    if (trusts.length > 0) return trusts[0].id;
    return '';
  }, [lockTrustId, selectedTrustId, isSuperAdmin, user?.trust_id, trusts]);

  // Fetch homes filtered by trust (and optional assigned project IDs)
  const { data: allHomes = [] } = useHomes();
  const homes = useMemo(() => {
    let list = allHomes;
    if (effectiveTrustId) list = list.filter((h) => h.trust_id === effectiveTrustId);
    if (homeIds?.length) {
      const allowed = new Set(homeIds);
      list = list.filter((h) => allowed.has(h.id));
    }
    return list;
  }, [allHomes, effectiveTrustId, homeIds]);

  // Calculate date range for the month
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  // Fetch food slots for all homes in the trust
  const { data: foodSlots = [], isLoading } = useFoodSlotsAllHomes(
    effectiveTrustId,
    startDate,
    endDate
  );

  // Generate all dates in the month
  const datesInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  }, [currentDate]);

  // Filter dates based on selection
  const displayDates = useMemo(() => {
    if (selectedDates.length > 0) {
      return [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    }
    return datesInMonth;
  }, [datesInMonth, selectedDates]);

  // Create a lookup map for quick slot access (prefer PAID > BOOKED > NEED per cell)
  const slotMap = useMemo(() => {
    const map = new Map<string, (typeof foodSlots)[number]>();
    for (const slot of mergeFoodSlotsByCell(foodSlots)) {
      map.set(`${slot.date}-${slot.home_id}-${slot.time_slot}`, slot);
    }
    return map;
  }, [foodSlots]);

  const getSlotData = (date: string, homeId: string, timeSlot: FoodTimeSlot): FoodSlotCellData => {
    const key = `${date}-${homeId}-${timeSlot}`;
    const slot = slotMap.get(key);
    return {
      slotId: slot?.id || null,
      status: slot?.status || null,
      note: slot?.note || null,
    };
  };

  const getStatusColor = (status: FoodSlotStatus | null, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2';
    }
    switch (status) {
      case 'BOOKED':
        return 'bg-warning/80 hover:bg-warning text-warning-foreground';
      case 'PAID':
        return 'bg-destructive/80 hover:bg-destructive text-destructive-foreground';
      case 'NEED':
      default:
        return 'bg-success/80 hover:bg-success text-success-foreground';
    }
  };

  const getSlotKey = (date: string, homeId: string, timeSlot: FoodTimeSlot) => {
    return `${date}-${homeId}-${timeSlot}`;
  };

  const handleCellClick = useCallback((date: Date, homeId: string, homeName: string, timeSlot: FoodTimeSlot) => {
    if (isBefore(date, startOfDay(new Date()))) {
      toast.error('Cannot book slots for past dates');
      return;
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotData = getSlotData(dateStr, homeId, timeSlot);
    const key = getSlotKey(dateStr, homeId, timeSlot);
    const existingSlot = slotData.slotId ? slotMap.get(key) : null;

    if (selectMode) {
      // In select mode, toggle selection
      setSelectedSlots(prev => {
        const newMap = new Map(prev);
        if (newMap.has(key)) {
          newMap.delete(key);
        } else {
          newMap.set(key, {
            date: dateStr,
            homeId,
            homeName,
            timeSlot,
            existingSlotId: slotData.slotId,
          });
        }
        return newMap;
      });
    } else if (singleClickBooking) {
      // Social worker: a single click opens the booking flow for just this slot.
      setSingleBookingSlot({
        date: dateStr,
        homeId,
        homeName,
        timeSlot,
        existingSlotId: slotData.slotId,
      });
    } else {
      // Admin: open the create/edit dialog for the slot.
      setEditDialog({
        open: true,
        date: dateStr,
        timeSlot,
        homeId,
        homeName,
        trustId: effectiveTrustId,
        existingSlot,
      });
    }
  }, [selectMode, singleClickBooking, effectiveTrustId, slotMap]);

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    if (selectMode) {
      setSelectedSlots(new Map());
    }
  };

  const clearSelection = () => {
    setSelectedSlots(new Map());
  };

  const handleBookSelected = () => {
    if (selectedSlots.size > 0) {
      setShowMultiBookDialog(true);
    }
  };

  const handleMultiBookSuccess = () => {
    setSelectedSlots(new Map());
    setShowMultiBookDialog(false);
    setSingleBookingSlot(null);
  };

  const bookingSlots = singleBookingSlot
    ? [singleBookingSlot]
    : Array.from(selectedSlots.values());

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Food Sponsorship Booking</CardTitle>
          <div className="flex items-center gap-4">
            {/* Select Mode Toggle */}
            <Button
              variant={selectMode ? 'default' : 'outline'}
              size="sm"
              onClick={toggleSelectMode}
              className="flex items-center gap-2"
            >
              {selectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {selectMode ? 'Exit Select Mode' : 'Select Mode'}
            </Button>

            {/* Trust selector for super admins (hidden when trust is locked) */}
            {!lockTrustId && isSuperAdmin && trusts.length > 0 && (
              <Select value={effectiveTrustId} onValueChange={setSelectedTrustId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Trust" />
                </SelectTrigger>
                <SelectContent>
                  {trusts.map(trust => (
                    <SelectItem key={trust.id} value={trust.id}>
                      {trust.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedDates.length > 0 
                      ? `${selectedDates.length} date${selectedDates.length > 1 ? 's' : ''} selected` 
                      : 'Filter by Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    month={currentDate}
                    onMonthChange={setCurrentDate}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {selectedDates.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedDates([])}
                  className="flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
            
            {/* Month navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend with Pricing */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success/80" />
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-warning/80" />
              <span className="text-muted-foreground">Booked (Unpaid)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive/80" />
              <span className="text-muted-foreground">Paid (Confirmed)</span>
            </div>
            {selectMode && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary ring-2 ring-primary ring-offset-2" />
                <span className="text-muted-foreground">Selected</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-3 text-xs">
              {TIME_SLOTS.map(slot => {
                const price = priceMap[slot] ?? 0;
                if (price === 0) return null;
                return (
                  <div key={slot} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                    <span className="font-medium">{TIME_SLOT_LABELS[slot]}:</span>
                    <IndianRupee className="h-3 w-3" />
                    <span>{price.toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {homes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No projects found for the selected trust.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-3 py-2 text-left font-medium">Date</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">Project</th>
                    {TIME_SLOTS.map(slot => (
                      <th key={slot} className="border border-border px-3 py-2 text-center font-medium w-16">
                        {TIME_SLOT_LABELS[slot]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayDates.map((date) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const displayDate = format(date, 'dd.MM.yyyy');
                    
                    return homes.map((home, homeIndex) => (
                      <tr key={`${dateStr}-${home.id}`} className="hover:bg-muted/30">
                        {/* Show date only for the first home of each day */}
                        {homeIndex === 0 ? (
                          <td 
                            className="border border-border px-3 py-2 font-medium bg-muted/20"
                            rowSpan={homes.length}
                          >
                            {displayDate}
                          </td>
                        ) : null}
                        <td className="border border-border px-3 py-2 text-sm">
                          {home.name}
                        </td>
                        {TIME_SLOTS.map(timeSlot => {
                          const slotData = getSlotData(dateStr, home.id, timeSlot);
                          const key = getSlotKey(dateStr, home.id, timeSlot);
                          const isSelected =
                            selectedSlots.has(key) ||
                            (singleBookingSlot?.date === dateStr &&
                              singleBookingSlot?.homeId === home.id &&
                              singleBookingSlot?.timeSlot === timeSlot);
                          const isPast = isBefore(date, startOfDay(new Date()));
                          
                          return (
                            <td 
                              key={key}
                              className="border border-border p-1"
                            >
                              <button
                                onClick={() => handleCellClick(date, home.id, home.name, timeSlot)}
                                disabled={isPast}
                                className={cn(
                                  'w-full h-8 rounded text-xs font-medium transition-all',
                                  getStatusColor(slotData.status, isSelected),
                                  isPast && 'opacity-40 cursor-not-allowed pointer-events-none'
                                )}
                                title={slotData.note || undefined}
                              >
                                {selectMode && isSelected ? '✓' : 
                                  slotData.status === 'PAID' ? 'P' : 
                                  slotData.status === 'BOOKED' ? 'B' : 'A'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Floating Action Bar when slots are selected */}
          {selectMode && selectedSlots.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border border-border shadow-lg rounded-lg px-6 py-3 flex items-center gap-4 z-50">
              <span className="font-medium">
                {selectedSlots.size} slot{selectedSlots.size > 1 ? 's' : ''} selected
              </span>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button size="sm" onClick={handleBookSelected}>
                Book Selected Slots
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog for single slot */}
      {editDialog && (
        <FoodSlotEditDialog
          open={editDialog.open}
          onOpenChange={(open) => {
            if (!open) setEditDialog(null);
          }}
          date={editDialog.date}
          timeSlot={editDialog.timeSlot}
          homeId={editDialog.homeId}
          homeName={editDialog.homeName}
          trustId={editDialog.trustId}
          existingSlot={editDialog.existingSlot}
        />
      )}

      {/* Booking dialog — handles both multi-select and single-click booking */}
      <MultiSlotBookingDialog
        open={showMultiBookDialog || !!singleBookingSlot}
        onOpenChange={(open) => {
          if (!open) {
            setShowMultiBookDialog(false);
            setSingleBookingSlot(null);
          }
        }}
        selectedSlots={bookingSlots}
        trustId={effectiveTrustId}
        onSuccess={handleMultiBookSuccess}
        preSelectedDonor={preSelectedDonor}
      />
    </>
  );
}