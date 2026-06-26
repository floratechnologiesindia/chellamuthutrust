import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Extended need type that includes relation data
interface NeedWithRelations {
  id: string;
  home_id: string;
  trust_id: string;
  category_id: string;
  subcategory_id?: string | null;
  date: string;
  quantity: number;
  unit: string;
  help_mode: string;
  recurring_frequency?: string | null;
  recurring_end_date?: string | null;
  description: string;
  max_sponsors_allowed: number;
  current_sponsors_count: number;
  status: string;
  categories?: { id: string; key: string; label: string; icon: string | null } | null;
  homes?: { id: string; name: string; city: string; image_url: string | null } | null;
}

interface NeedsCalendarProps {
  needs: NeedWithRelations[];
}

export const NeedsCalendar = ({ needs }: NeedsCalendarProps) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get needs for a specific date
  const getNeedsForDate = (date: Date) => {
    return needs.filter(need => isSameDay(new Date(need.date), date));
  };

  // Get needs for selected date
  const selectedDateNeeds = selectedDate ? getNeedsForDate(selectedDate) : [];

  // Custom day render to show need indicators
  const getDayContent = (day: Date) => {
    const dayNeeds = getNeedsForDate(day);
    if (dayNeeds.length === 0) return null;

    const hasOpen = dayNeeds.some(n => n.status === 'OPEN');
    const hasPartial = dayNeeds.some(n => n.status === 'PARTIAL');
    const hasSponsored = dayNeeds.some(n => n.status === 'FULLY_SPONSORED');

    return (
      <div className="flex gap-0.5 justify-center mt-1">
        {hasOpen && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
        {hasPartial && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        {hasSponsored && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-green-500/20 text-green-600 text-xs">Open</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-amber-500/20 text-amber-600 text-xs">Partial</Badge>;
      case 'FULLY_SPONSORED':
        return <Badge className="bg-primary/20 text-primary text-xs">Sponsored</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Calendar View</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Open</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Partial</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Sponsored</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="rounded-md border p-4"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex w-full",
              head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: cn(
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full",
                "[&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-md"
              ),
              day: cn(
                "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:rounded-md flex flex-col items-center justify-start pt-2"
              ),
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-md",
              day_today: "bg-accent text-accent-foreground rounded-md",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
            }}
            components={{
              DayContent: ({ date }) => (
                <div className="flex flex-col items-center">
                  <span>{format(date, 'd')}</span>
                  {getDayContent(date)}
                </div>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Select a date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateNeeds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No requirements for this date</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => navigate('/admin/needs/new')}
              >
                Create Requirement
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateNeeds.map(need => (
                <div 
                  key={need.id} 
                  className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(`/sponsor/${need.id}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{need.categories?.label || 'Unknown'}</span>
                    {getStatusBadge(need.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{need.homes?.name || 'Unknown'}</p>
                  <p className="text-xs line-clamp-2">{need.description}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{need.quantity} {need.unit}</span>
                    <span>{need.current_sponsors_count}/{need.max_sponsors_allowed} sponsors</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NeedsCalendar;
