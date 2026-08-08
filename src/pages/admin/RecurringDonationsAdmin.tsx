import { MainLayout } from '@/components/layout/MainLayout';
import { RecurringDonationsTracker } from '@/components/dashboard/RecurringDonationsTracker';

const RecurringDonationsAdmin = () => (
  <MainLayout>
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Recurring Donations</h1>
        <p className="text-muted-foreground mt-1">
          View, pause, cancel, and send reminders for recurring monetary and food sponsorships
        </p>
      </div>
      <RecurringDonationsTracker />
    </div>
  </MainLayout>
);

export default RecurringDonationsAdmin;
