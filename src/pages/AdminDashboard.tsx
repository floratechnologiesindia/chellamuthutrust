import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useHomes } from '@/hooks/useHomes';
import { useNeeds } from '@/hooks/useNeeds';
import { useDonations } from '@/hooks/useDonations';
import { useMyTasks } from '@/hooks/useTasks';
import { useCorpusFundStats, useCorpusFundContributions } from '@/hooks/useCorpusFund';
import { useKindDonations } from '@/hooks/useKindDonations';
import { CorpusFundForm } from '@/components/corpus-fund/CorpusFundForm';
import { RecurringDonationsTracker } from '@/components/dashboard/RecurringDonationsTracker';
import UpcomingDonationOpportunities from '@/components/dashboard/UpcomingDonationOpportunities';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { 
  Home, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  Landmark,
  Package,
  FileText,
  Gift
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [corpusDialogOpen, setCorpusDialogOpen] = useState(false);

  // Live Supabase data
  const { data: homes = [], isLoading: homesLoading } = useHomes();
  const { data: needs = [], isLoading: needsLoading } = useNeeds();
  const { data: donations = [], isLoading: donationsLoading } = useDonations();
  const { data: tasks = [], isLoading: tasksLoading } = useMyTasks(user?.id);

  // Corpus Fund data
  const { data: corpusStats } = useCorpusFundStats();
  const { data: recentContributions } = useCorpusFundContributions();

  // Kind Donations data
  const { data: kindDonations = [], isLoading: kindLoading } = useKindDonations();
  const recentKindDonations = kindDonations.slice(0, 5);
  const kindThisMonth = kindDonations.filter(kd => {
    const d = new Date(kd.received_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Calculate stats from live data
  const totalHomes = homes.length;
  const openNeeds = needs.filter(n => n.status === 'OPEN' || n.status === 'PARTIAL').length;
  const fullySponsored = needs.filter(n => n.status === 'FULLY_SPONSORED').length;
  const totalDonations = donations.reduce((sum, d) => sum + d.amount_pledged, 0);
  
  const pendingTasks = tasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const overdueTasks = pendingTasks.filter(t => new Date(t.due_date) < new Date());

  const recentNeeds = needs.slice(0, 5);
  const isLoading = homesLoading || needsLoading || donationsLoading || tasksLoading;

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage homes, needs, and monitor donations
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link to="/admin/homes">
                <Home className="mr-2 h-4 w-4" />
                Manage Homes
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/needs">
                <Calendar className="mr-2 h-4 w-4" />
                Requirements Management
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/needs/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Requirement
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Homes</p>
                  {isLoading ? <Skeleton className="h-9 w-12" /> : <p className="text-3xl font-bold">{totalHomes}</p>}
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Home className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Requirements</p>
                  {isLoading ? <Skeleton className="h-9 w-12" /> : (
                    <>
                      <p className="text-3xl font-bold">{openNeeds}</p>
                      <p className="text-xs text-muted-foreground">{fullySponsored} fully sponsored</p>
                    </>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Donations</p>
                  {isLoading ? <Skeleton className="h-9 w-16" /> : (
                    <p className="text-3xl font-bold">₹{(totalDonations / 1000).toFixed(0)}K</p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Tasks</p>
                  {isLoading ? <Skeleton className="h-9 w-12" /> : (
                    <>
                      <p className="text-3xl font-bold">{pendingTasks.length}</p>
                      {overdueTasks.length > 0 && (
                        <p className="text-xs text-destructive">{overdueTasks.length} overdue</p>
                      )}
                    </>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Corpus Fund Stats */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Corpus Fund</p>
                  <p className="text-3xl font-bold">
                    {corpusStats?.total ? formatCurrency(corpusStats.total) : '₹0'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {corpusStats?.count || 0} contributions
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Landmark className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Needs */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Requirements</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/needs">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {needsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentNeeds.map(need => (
                    <div key={need.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{need.description || need.categories?.label || 'Untitled'}</p>
                          <Badge 
                            variant={need.status === 'OPEN' ? 'default' : need.status === 'PARTIAL' ? 'secondary' : 'outline'}
                            className="shrink-0"
                          >
                            {need.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {need.homes?.name || 'Unknown'} • {new Date(need.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium">
                          {need.current_sponsors_count || 0}/{need.max_sponsors_allowed || 1} sponsors
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentNeeds.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No requirements found</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Tasks</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/tasks">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTasks.slice(0, 4).map(task => {
                    const isOverdue = new Date(task.due_date) < new Date();
                    return (
                      <div key={task.id} className="p-3 border border-border rounded-lg">
                        <div className="flex items-start gap-2">
                          {isOverdue ? (
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'secondary' : 'outline'}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {pendingTasks.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No pending tasks</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Kind Donations Section */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Recent Kind Donations Received
              {kindThisMonth > 0 && (
                <Badge variant="secondary">{kindThisMonth} this month</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/kind-donations">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {kindLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : recentKindDonations.length > 0 ? (
              <div className="space-y-3">
                {recentKindDonations.map((kd) => (
                  <div key={kd.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{kd.donor_name || kd.profiles?.name || 'Walk-in Donor'}</p>
                      <p className="text-sm text-muted-foreground">
                        {kd.homes?.name || 'Unknown Home'} • {formatDate(kd.received_date)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{kd.item_type}{kd.quantity ? ` × ${kd.quantity}` : ''}</p>
                    </div>
                    <div className="text-right ml-4">
                      {kd.estimated_value && (
                        <p className="font-semibold text-primary">{formatCurrency(kd.estimated_value)}</p>
                      )}
                      <Badge 
                        variant={kd.status === 'RECEIVED' ? 'default' : kd.status === 'DELIVERED' ? 'secondary' : 'outline'}
                        className="mt-1"
                      >
                        {kd.status === 'RECEIVED' ? '✓ Received' : kd.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No kind donations recorded yet. Social Workers can record walk-in donations from their dashboard.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Corpus Fund Section */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Recent Corpus Fund Contributions
            </CardTitle>
            <div className="flex gap-2">
              <Dialog open={corpusDialogOpen} onOpenChange={setCorpusDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contribution
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Corpus Fund Contribution</DialogTitle>
                  </DialogHeader>
                  <CorpusFundForm 
                    onSuccess={() => setCorpusDialogOpen(false)}
                    onCancel={() => setCorpusDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/corpus-fund">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentContributions && recentContributions.length > 0 ? (
              <div className="space-y-3">
                {recentContributions.slice(0, 5).map((contribution) => (
                  <div key={contribution.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{contribution.donor_name || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground">
                        {contribution.trusts?.name} • {formatDate(contribution.contribution_date)}
                      </p>
                      {contribution.purpose && (
                        <p className="text-xs text-muted-foreground mt-1">{contribution.purpose}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-primary">{formatCurrency(contribution.amount)}</p>
                      {contribution.contribution_mode && (
                        <Badge variant="outline" className="mt-1 capitalize">
                          {contribution.contribution_mode.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No corpus fund contributions yet. Add your first contribution above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recurring Donations Tracker */}
        <div className="mt-6">
          <RecurringDonationsTracker />
        </div>

        {/* Upcoming Donation Opportunities */}
        <div className="mt-6">
          <UpcomingDonationOpportunities />
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link to="/admin/homes">
              <Home className="mr-3 h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Manage Homes</p>
                <p className="text-xs text-muted-foreground">Add, edit, or remove homes</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link to="/admin/needs">
              <Calendar className="mr-3 h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Manage Requirements</p>
                <p className="text-xs text-muted-foreground">Create and track requirements</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link to="/reports">
              <FileText className="mr-3 h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Reports</p>
                <p className="text-xs text-muted-foreground">Analytics and insights</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link to="/corpus-fund">
              <Landmark className="mr-3 h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Corpus Fund</p>
                <p className="text-xs text-muted-foreground">Manage corpus contributions</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link to="/kind-donations">
              <Package className="mr-3 h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Kind Donations</p>
                <p className="text-xs text-muted-foreground">Track in-kind donations</p>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link to="/admin/tasks">
              <CheckCircle className="mr-3 h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Manage Tasks</p>
                <p className="text-xs text-muted-foreground">View and assign tasks</p>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
