import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { AssignedHomeStates } from '@/components/warden/AssignedHomeStates';
import { ProjectSwitcher } from '@/components/warden/ProjectSwitcher';
import { useAssignedHome } from '@/hooks/useAssignedHome';
import { useDonationsForHome } from '@/hooks/useDonations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { Clock, User, Wallet } from 'lucide-react';

const WardenActiveDonations = () => {
  const { homeId, home, isLoading } = useAssignedHome();
  const { data: donations = [], isLoading: donationsLoading } = useDonationsForHome(homeId);

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
              <h1 className="text-3xl font-display font-bold">Active Donations</h1>
              <p className="text-muted-foreground">
                Ongoing and upcoming sponsorships that may need follow-up
              </p>
            </div>

            {donationsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : donations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No active or pledged donations for this project.</p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link to="/warden/food">Create food sponsorship</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {donations.map((donation) => (
                  <Card key={donation.id}>
                    <CardContent className="py-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {donation.needs?.categories?.label || 'Donation'}
                        </Badge>
                        <Badge variant={donation.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {donation.status === 'ACTIVE' ? 'Active' : 'Pledged'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Start: {format(new Date(`${donation.start_date}T12:00:00`), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <p className="font-medium">
                        {donation.sponsorship_type === 'RECURRING'
                          ? `${formatCurrency(donation.amount_pledged)}/month`
                          : formatCurrency(donation.amount_pledged)}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {donation.profiles?.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {donation.profiles.name}
                          </span>
                        )}
                        {donation.sponsorship_type === 'RECURRING' && donation.next_due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Next: {format(new Date(`${donation.next_due_date}T12:00:00`), 'dd MMM yyyy')}
                          </span>
                        )}
                      </div>
                      {donation.need_id && (
                        <Button asChild variant="link" className="px-0 h-auto">
                          <Link to={`/admin/needs/${donation.need_id}`}>View requirement</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </MainLayout>
      )}
    </AssignedHomeStates>
  );
};

export default WardenActiveDonations;
