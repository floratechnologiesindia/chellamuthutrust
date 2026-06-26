import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';
import DonorFinder from '@/components/booking/DonorFinder';
import DonorProfilePanel from '@/components/booking/DonorProfilePanel';
import EventCreator from '@/components/booking/EventCreator';
import BookingCalendarView from '@/components/booking/BookingCalendarView';
import { useDonors } from '@/hooks/useDonors';
import type { DonorWithStats } from '@/hooks/useDonors';
import { cn } from '@/lib/utils';
import { Search, User, CalendarPlus, Calendar, CheckCircle } from 'lucide-react';

type BookingStep = 'find-donor' | 'donor-profile' | 'event-creator' | 'calendar-view';

interface EventDetails {
  category: string;
  categoryId: string;
  homeId: string;
  trustId: string;
  date: Date;
}

const steps = [
  { key: 'find-donor', label: 'Find Donor', icon: Search },
  { key: 'donor-profile', label: 'Donor Profile', icon: User },
  { key: 'event-creator', label: 'Create Event', icon: CalendarPlus },
  { key: 'calendar-view', label: 'Book Slot', icon: Calendar },
];

export const BookingPlatform = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const donorIdFromUrl = searchParams.get('donorId');
  const { data: donors } = useDonors();

  const [currentStep, setCurrentStep] = useState<BookingStep>(donorIdFromUrl ? 'donor-profile' : 'find-donor');
  const [selectedDonor, setSelectedDonor] = useState<DonorWithStats | null>(null);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);

  // Auto-select donor from URL param
  useEffect(() => {
    if (donorIdFromUrl && donors && !selectedDonor) {
      const found = donors.find(d => d.id === donorIdFromUrl);
      if (found) {
        setSelectedDonor(found);
        setCurrentStep('donor-profile');
        // Clean up URL
        searchParams.delete('donorId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [donorIdFromUrl, donors, selectedDonor, searchParams, setSearchParams]);

  const handleSelectDonor = (donor: DonorWithStats) => {
    setSelectedDonor(donor);
    setCurrentStep('donor-profile');
  };

  const handleCreateNewDonor = () => {
    navigate('/super-admin/donors/new');
  };

  const handleProceedToEvent = () => {
    setCurrentStep('event-creator');
  };

  const handleShowCalendar = (category: string, categoryId: string, homeId: string, trustId: string, date: Date) => {
    setEventDetails({ category, categoryId, homeId, trustId, date });
    setCurrentStep('calendar-view');
  };

  const handleBookingComplete = () => {
    // Reset to start for next booking
    setCurrentStep('find-donor');
    setSelectedDonor(null);
    setEventDetails(null);
  };

  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.key === currentStep);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <SuperAdminNav />

        <div>
          <h1 className="text-3xl font-bold">Booking Platform</h1>
          <p className="text-muted-foreground">
            Book events and sponsorships on behalf of donors
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.key === currentStep;
            const isCompleted = index < getCurrentStepIndex();
            return (
              <div key={step.key} className="flex items-center">
                <div 
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full transition-all',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    'w-8 h-0.5 mx-1',
                    index < getCurrentStepIndex() ? 'bg-green-500' : 'bg-muted'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[500px]">
          {currentStep === 'find-donor' && (
            <DonorFinder 
              onSelectDonor={handleSelectDonor}
              onCreateNew={handleCreateNewDonor}
            />
          )}

          {currentStep === 'donor-profile' && selectedDonor && (
            <DonorProfilePanel
              donor={selectedDonor}
              onProceed={handleProceedToEvent}
              onBack={() => setCurrentStep('find-donor')}
            />
          )}

          {currentStep === 'event-creator' && selectedDonor && (
            <EventCreator
              donor={selectedDonor}
              onShowCalendar={handleShowCalendar}
              onBack={() => setCurrentStep('donor-profile')}
            />
          )}

          {currentStep === 'calendar-view' && selectedDonor && eventDetails && (
            <BookingCalendarView
              donor={selectedDonor}
              category={eventDetails.category}
              categoryId={eventDetails.categoryId}
              homeId={eventDetails.homeId}
              trustId={eventDetails.trustId}
              selectedDate={eventDetails.date}
              onBack={() => setCurrentStep('event-creator')}
              onComplete={handleBookingComplete}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default BookingPlatform;
