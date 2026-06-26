import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Utensils } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FoodCalendarGrid } from '@/components/food-calendar/FoodCalendarGrid';
import { FoodSlotLegend } from '@/components/food-calendar/FoodSlotLegend';
import { FoodSlotDetailPanel } from '@/components/food-calendar/FoodSlotDetailPanel';
import { useFoodSlots, FoodSlot, FoodTimeSlot } from '@/hooks/useFoodSlots';
import { useIsMobile } from '@/hooks/use-mobile';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';

interface Home {
  id: string;
  name: string;
  trust_id: string;
}

interface Trust {
  id: string;
  name: string;
}

export default function FoodCalendar() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [selectedTrustId, setSelectedTrustId] = useState<string | null>(null);
  
  // Panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<FoodTimeSlot | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<FoodSlot | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';

  // Fetch trusts for super admin
  const { data: trusts = [] } = useQuery({
    queryKey: ['trusts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trusts').select('id, name').order('name');
      if (error) throw error;
      return data as Trust[];
    },
    enabled: isSuperAdmin,
  });

  // Fetch homes
  const { data: homes = [] } = useQuery({
    queryKey: ['homes', selectedTrustId],
    queryFn: async () => {
      let query = supabase.from('homes').select('id, name, trust_id').order('name');
      
      if (selectedTrustId) {
        query = query.eq('trust_id', selectedTrustId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Home[];
    },
  });

  // Fetch user's profile to get their home/trust
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('home_id, trust_id')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Auto-select home based on user role
  useEffect(() => {
    if (userProfile) {
      if (user?.role === 'warden' && userProfile.home_id) {
        setSelectedHomeId(userProfile.home_id);
      } else if (user?.role === 'admin' && userProfile.trust_id) {
        setSelectedTrustId(userProfile.trust_id);
      }
    }
  }, [userProfile, user?.role]);

  // Auto-select first home when trust changes or homes load
  useEffect(() => {
    if (homes.length > 0 && !selectedHomeId) {
      setSelectedHomeId(homes[0].id);
    }
  }, [homes, selectedHomeId]);

  // Fetch food slots
  const { data: slots = [], isLoading } = useFoodSlots(
    selectedHomeId,
    currentDate.getFullYear(),
    currentDate.getMonth()
  );

  const selectedHome = homes.find((h) => h.id === selectedHomeId);

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

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Super Admin Navigation */}
        {isSuperAdmin && <SuperAdminNav />}
        
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Utensils className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Food Distribution Calendar</h1>
              <p className="text-muted-foreground text-sm">Sponsor morning, afternoon, or evening meals</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {/* Trust selector for super admin */}
              {isSuperAdmin && (
                <Select value={selectedTrustId || ''} onValueChange={(v) => {
                  setSelectedTrustId(v);
                  setSelectedHomeId(null);
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Trust" />
                  </SelectTrigger>
                  <SelectContent>
                    {trusts.map((trust) => (
                      <SelectItem key={trust.id} value={trust.id}>
                        {trust.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Home selector */}
              <Select value={selectedHomeId || ''} onValueChange={setSelectedHomeId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Home" />
                </SelectTrigger>
                <SelectContent>
                  {homes.map((home) => (
                    <SelectItem key={home.id} value={home.id}>
                      {home.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[150px] text-center font-medium">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Legend */}
          <FoodSlotLegend />
        </div>

        {/* Calendar Grid */}
        {selectedHomeId ? (
          <FoodCalendarGrid
            currentDate={currentDate}
            slots={slots}
            onSlotClick={handleSlotClick}
            compact={isMobile}
          />
        ) : (
          <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Please select a home to view the food calendar</p>
          </div>
        )}

        {/* Detail Panel */}
        <FoodSlotDetailPanel
          open={panelOpen}
          onOpenChange={setPanelOpen}
          date={selectedDate}
          timeSlot={selectedTimeSlot}
          existingSlot={selectedSlot}
          homeId={selectedHomeId || ''}
          trustId={selectedHome?.trust_id || ''}
          homeName={selectedHome?.name || ''}
        />
      </div>
    </MainLayout>
  );
}
