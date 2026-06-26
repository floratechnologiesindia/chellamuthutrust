import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  Users, 
  Home, 
  Heart, 
  AlertTriangle,
  Plus,
  ArrowRight,
  Clock,
  IndianRupee,
  BarChart3,
  UserCog,
  ClipboardList
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SuperAdminAnalytics } from '@/components/dashboard/SuperAdminAnalytics';
import { SuperAdminNeedsSection } from '@/components/dashboard/SuperAdminNeedsSection';
import { RecurringDonationsTracker } from '@/components/dashboard/RecurringDonationsTracker';
import UpcomingDonationOpportunities from '@/components/dashboard/UpcomingDonationOpportunities';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';
import { 
  usePlatformStats, 
  useRecentTrustsWithStats, 
  useRecentNeedsWithHomes 
} from '@/hooks/useDashboardAnalytics';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  
  const { data: stats, isLoading: loadingStats } = usePlatformStats();
  const { data: recentTrusts, isLoading: loadingTrusts } = useRecentTrustsWithStats();
  const { data: recentNeeds, isLoading: loadingNeeds } = useRecentNeedsWithHomes();

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Navigation */}
        <SuperAdminNav />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Platform-wide overview and analytics</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button onClick={() => navigate('/super-admin/homes/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Home
            </Button>
          </div>
        </div>

        {/* Platform Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Homes</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.totalHomes || 0}</p>
                  )}
                </div>
                <Home className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trusts</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.totalTrusts || 0}</p>
                  )}
                </div>
                <Building2 className="h-8 w-8 text-secondary-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
                  )}
                </div>
                <Users className="h-8 w-8 text-accent-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Donations</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">₹{(stats?.totalAmount || 0).toLocaleString()}</p>
                  )}
                </div>
                <IndianRupee className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              {loadingStats ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-foreground">{stats?.totalDonations || 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Donations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              {loadingStats ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-foreground">{stats?.recurringDonations || 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Recurring</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              {loadingStats ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-primary">{stats?.openNeeds || 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Open Needs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              {loadingStats ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-amber-600">{stats?.partialNeeds || 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Partial</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              {loadingStats ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-green-600">{stats?.fullySponsored || 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Fully Sponsored</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              {loadingStats ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-destructive">{stats?.overdueTasks || 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics & Trends
          </h2>
          <SuperAdminAnalytics />
        </div>

        {/* Needs Management Section */}
        <div className="mb-8">
          <SuperAdminNeedsSection />
        </div>

        {/* Recurring Donations Tracker */}
        <div className="mb-8">
          <RecurringDonationsTracker />
        </div>

        {/* Upcoming Donation Opportunities */}
        <div className="mb-8">
          <UpcomingDonationOpportunities />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Homes Overview */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Homes Overview
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/homes')}>
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingTrusts ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : recentTrusts && recentTrusts.length > 0 ? (
                <div className="space-y-4">
                  {recentTrusts.map((trust) => (
                    <div 
                      key={trust.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate(`/super-admin/trusts/${trust.id}/edit`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-primary/10">
                          {trust.image_url ? (
                            <img src={trust.image_url} alt={trust.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{trust.name}</h3>
                          <p className="text-sm text-muted-foreground">{trust.city}, {trust.state}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{trust.homesCount} Homes</p>
                          <p className="text-sm text-muted-foreground">{trust.openNeedsCount} open needs</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No homes found</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Alerts */}
          <div className="space-y-6">
            {/* Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingStats ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    {(stats?.overdueTasks || 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">{stats?.overdueTasks} Overdue Tasks</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => navigate('/super-admin/task-dashboard')}>
                          View
                        </Button>
                      </div>
                    )}
                    {(stats?.pendingTasks || 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium">{stats?.pendingTasks} Pending Tasks</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => navigate('/super-admin/task-dashboard')}>
                          View
                        </Button>
                      </div>
                    )}
                    {(stats?.openNeeds || 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{stats?.openNeeds} Needs Awaiting Sponsors</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => navigate('/admin/needs')}>
                          View
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate('/super-admin/homes/new')}
                >
                  <Home className="h-5 w-5" />
                  <span className="text-xs">Add Home</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate('/super-admin/users/new')}
                >
                  <UserCog className="h-5 w-5" />
                  <span className="text-xs">Add User</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate('/super-admin/task-dashboard')}
                >
                  <ClipboardList className="h-5 w-5" />
                  <span className="text-xs">Task Center</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate('/reports')}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs">Reports</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Needs */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Recent Needs Across Platform
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/needs')}>
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingNeeds ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentNeeds && recentNeeds.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Need</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Home</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Sponsors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentNeeds.map((need) => (
                      <tr key={need.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <p className="font-medium text-foreground text-sm truncate max-w-[200px]">
                            {need.description || 'No description'}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {(need.homes as any)?.name || 'Unknown'}
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {new Date(need.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2">
                          <Badge 
                            variant="outline"
                            className={
                              need.status === 'FULLY_SPONSORED' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                              need.status === 'PARTIAL' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                              'bg-primary/10 text-primary border-primary/20'
                            }
                          >
                            {need.status?.replace('_', ' ') || 'OPEN'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {need.current_sponsors_count}/{need.max_sponsors_allowed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent needs</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SuperAdminDashboard;
