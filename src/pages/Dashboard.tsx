import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDonations } from '@/hooks/useDonations';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { Calendar, Heart, Clock, ArrowRight, Bell, TrendingUp, Repeat } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();

  const { data: donations = [], isLoading: donationsLoading } = useDonations(user?.id);
  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.id);

  const activeDonations = donations.filter(d => d.status === 'ACTIVE');
  const recurringDonations = donations.filter(d => d.sponsorship_type === 'RECURRING');

  // Stats
  const totalDonated = donations.reduce((sum, d) => sum + d.amount_pledged, 0);
  const totalPeopleHelped = donations.reduce((sum, d) => {
    return sum + (d.needs?.quantity || 0);
  }, 0);

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your contributions and upcoming commitments
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {donationsLoading ? (
                    <Skeleton className="h-8 w-24 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">₹{totalDonated.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Donated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  {donationsLoading ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{totalPeopleHelped}</p>
                  )}
                  <p className="text-sm text-muted-foreground">People Helped</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Repeat className="h-6 w-6 text-accent" />
                </div>
                <div>
                  {donationsLoading ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{recurringDonations.length}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Recurring Supports</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadCount}</p>
                  <p className="text-sm text-muted-foreground">Notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recurring Donations Section */}
        {recurringDonations.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                My Recurring Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recurringDonations.map(donation => (
                  <div key={donation.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <Repeat className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">{donation.homes?.name || 'Unknown Home'}</p>
                        <p className="text-sm text-muted-foreground">
                          {donation.needs?.description || donation.needs?.categories?.label || 'General donation'}
                        </p>
                        {donation.next_due_date && (
                          <p className="text-xs text-muted-foreground">
                            Next due: {format(new Date(donation.next_due_date), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{donation.amount_pledged.toLocaleString()}</p>
                      <Badge variant={donation.status === 'ACTIVE' ? 'default' : donation.status === 'OVERDUE' ? 'destructive' : 'secondary'}>
                        {donation.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6">
              <Calendar className="h-8 w-8 mb-4 opacity-80" />
              <h3 className="font-display text-xl font-semibold mb-2">Sponsor by Date</h3>
              <p className="text-sm opacity-90 mb-4">
                Choose a special date and find needs to sponsor
              </p>
              <Button variant="secondary" asChild>
                <Link to="/sponsor">
                  Find Needs
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Heart className="h-8 w-8 mb-4 text-primary" />
              <h3 className="font-display text-xl font-semibold mb-2">Explore Homes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Discover care homes and their current needs
              </p>
              <Button variant="outline" asChild>
                <Link to="/homes">
                  View Homes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Donations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Donations</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/donations">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {donationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : donations.length > 0 ? (
              <div className="space-y-4">
                {donations.slice(0, 3).map(donation => (
                  <div key={donation.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {donation.sponsorship_type === 'RECURRING' ? (
                          <Repeat className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Heart className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{donation.homes?.name || 'Unknown Home'}</p>
                        <p className="text-sm text-muted-foreground">
                          {donation.needs?.description || donation.needs?.categories?.label || 'General donation'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{donation.amount_pledged.toLocaleString()}</p>
                      <Badge variant={donation.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {donation.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No donations yet</h3>
                <p className="text-muted-foreground mb-4">Start your journey of giving today</p>
                <Button asChild>
                  <Link to="/sponsor">Find a Need to Sponsor</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
