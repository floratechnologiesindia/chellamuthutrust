import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  Heart, 
  Users, 
  CheckCircle2,
  Calendar,
  IndianRupee,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  UtensilsCrossed,
  Package,
  Timer
} from 'lucide-react';
import {
  useDonationSummary,
  useNeedsSummary,
  useTasksSummary,
  useDonationsByCategory,
  useNeedsByHome,
  useTopDonors,
  useTasksByAssignee,
  useHomesPerformance,
  useTrusts,
  useReportHomes,
  useRecentDonations,
  useRecurringSummary,
  useCorpusKindSummary,
  useMonthlyTrend,
  type ReportFilters,
} from '@/hooks/useReportData';
import {
  useHomeWorkDoneSummary,
  useWorkDoneTotals,
  useCompletedFoodSlots,
  useReceivedKindDonations,
  useCompletedNeeds,
  useCompletedTasks,
  useAllCompletionPhotos,
} from '@/hooks/useHomeWorkDone';
import { WorkDonePhotoGallery } from '@/components/reports/WorkDonePhotoGallery';
import { RecentCompletedItems, type CompletedItemData } from '@/components/reports/RecentCompletedItems';
import { SendToDonorDialog, type SelectedWorkItem } from '@/components/reports/SendToDonorDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'super_admin';
  
  const [trustFilter, setTrustFilter] = useState<string>('all');
  const [homeFilter, setHomeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  // Selection state for Send to Donor
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, SelectedWorkItem>>(new Map());
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const handleToggleItem = useCallback((id: string, item: CompletedItemData) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSelectedItemsMap(prev => { const n = new Map(prev); n.delete(id); return n; });
      } else {
        next.add(id);
         setSelectedItemsMap(prev => {
          const n = new Map(prev);
          n.set(id, {
            id: item.id,
            type: item.type,
            title: item.title,
            donorId: item.donorId || null,
            donorName: item.donorName || 'Anonymous',
            home: item.home,
            date: item.date.toISOString(),
            value: item.value,
            photos: item.photos || [],
            reportSentAt: item.reportSentAt,
          });
          return n;
        });
      }
      return next;
    });
  }, []);

  const handleOpenSendDialog = useCallback(() => {
    setSendDialogOpen(true);
  }, []);

  // Build filters object
  const dateRangeNum = parseInt(dateRange, 10);
  const filters: ReportFilters = useMemo(() => ({
    trustFilter,
    homeFilter,
    dateRange: dateRangeNum,
  }), [trustFilter, homeFilter, dateRangeNum]);

  // Fetch data with filters
  const { data: donationSummary, isLoading: donationsLoading } = useDonationSummary(filters);
  const { data: needsSummary, isLoading: needsLoading } = useNeedsSummary(filters);
  const { data: tasksSummary, isLoading: tasksLoading } = useTasksSummary(filters);
  const { data: donationsByCategory = [] } = useDonationsByCategory(filters);
  const { data: needsByHome = [] } = useNeedsByHome(filters);
  const { data: topDonors = [] } = useTopDonors(5, filters);
  const { data: tasksByAssignee = [] } = useTasksByAssignee(filters);
  const { data: homesPerformance = [] } = useHomesPerformance(filters);
  const { data: trusts = [] } = useTrusts();
  const { data: homes = [] } = useReportHomes(trustFilter);
  const { data: recentDonations = [] } = useRecentDonations(3);

  // New hooks
  const { data: recurringSummary, isLoading: recurringLoading } = useRecurringSummary(filters);
  const { data: corpusKindSummary, isLoading: corpusKindLoading } = useCorpusKindSummary(filters);
  const { data: monthlyTrend = [] } = useMonthlyTrend(6);

  // Work Done data
  const { data: workDoneSummary = [], isLoading: workDoneLoading } = useHomeWorkDoneSummary(
    trustFilter, homeFilter, dateRangeNum
  );
  const { data: workDoneTotals } = useWorkDoneTotals(trustFilter, homeFilter, dateRangeNum);
  const { data: completedFoodSlots = [] } = useCompletedFoodSlots(homeFilter, dateRangeNum);
  const { data: receivedKindDonations = [] } = useReceivedKindDonations(homeFilter, dateRangeNum);
  const { data: completedNeedsData = [] } = useCompletedNeeds(homeFilter, dateRangeNum);
  const { data: completedTasksData = [] } = useCompletedTasks(homeFilter, dateRangeNum);
  const { data: completionPhotos = [] } = useAllCompletionPhotos(homeFilter, dateRangeNum);

  const isLoading = donationsLoading || needsLoading || tasksLoading;

  // Computed values with defaults
  const totalDonations = donationSummary?.totalAmount || 0;
  const oneTimeTotal = donationSummary?.oneTimeAmount || 0;
  const recurringTotal = donationSummary?.recurringAmount || 0;
  const oneTimeCount = donationSummary?.oneTimeCount || 0;
  const recurringCount = donationSummary?.recurringCount || 0;
  const donorCount = donationSummary?.donorCount || 0;

  const totalNeeds = needsSummary?.total || 0;
  const openNeeds = needsSummary?.open || 0;
  const partialNeeds = needsSummary?.partial || 0;
  const fullySponsored = needsSummary?.fullySponsored || 0;
  const completedNeeds = needsSummary?.completed || 0;

  const totalTasks = tasksSummary?.total || 0;
  const openTasks = tasksSummary?.open || 0;
  const inProgressTasks = tasksSummary?.inProgress || 0;
  const completedTasks = tasksSummary?.completed || 0;
  const overdueTasks = tasksSummary?.overdue || 0;
  const onTimeCompleted = tasksSummary?.onTimeCompleted || 0;
  const delayedCompleted = tasksSummary?.delayedCompleted || 0;

  // Chart data
  const donationTypePieData = [
    { name: 'One-Time', value: oneTimeTotal, count: oneTimeCount },
    { name: 'Recurring', value: recurringTotal, count: recurringCount },
  ];

  const needsStatusData = [
    { name: 'Open', value: openNeeds, color: 'hsl(var(--primary))' },
    { name: 'Partial', value: partialNeeds, color: '#f59e0b' },
    { name: 'Sponsored', value: fullySponsored, color: '#10b981' },
    { name: 'Completed', value: completedNeeds, color: '#6b7280' },
  ];

  const taskStatusData = [
    { name: 'Open', value: openTasks },
    { name: 'In Progress', value: inProgressTasks },
    { name: 'Completed', value: completedTasks },
  ];

  const handleExportCSV = async (reportType: string) => {
    try {
      let csvContent = '';
      let filename = '';

      switch (reportType) {
        case 'donations': {
          const { data: donations, error } = await supabase
            .from('donations')
            .select(`amount_pledged, sponsorship_type, status, start_date, profiles:donor_id (name), homes (name)`);
          if (error) throw error;
          csvContent = 'Donor,Home,Amount,Type,Status,Date\n';
          donations?.forEach(d => {
            csvContent += `"${(d.profiles as any)?.name || 'Unknown'}","${(d.homes as any)?.name || 'Unknown'}",${d.amount_pledged},${d.sponsorship_type},${d.status},${d.start_date}\n`;
          });
          filename = 'donation_summary.csv';
          break;
        }
        case 'needs': {
          const { data: needs, error } = await supabase
            .from('needs')
            .select(`description, status, current_sponsors_count, max_sponsors_allowed, date, homes (name)`);
          if (error) throw error;
          csvContent = 'Description,Home,Status,Sponsors,Date\n';
          needs?.forEach(n => {
            csvContent += `"${n.description || ''}","${(n.homes as any)?.name || 'Unknown'}",${n.status},${n.current_sponsors_count}/${n.max_sponsors_allowed},${n.date}\n`;
          });
          filename = 'needs_coverage.csv';
          break;
        }
        case 'tasks': {
          const { data: tasks, error } = await supabase
            .from('tasks')
            .select(`title, status, priority, due_date, profiles:assigned_to (name)`);
          if (error) throw error;
          csvContent = 'Title,Assignee,Status,Priority,Due Date\n';
          tasks?.forEach(t => {
            csvContent += `"${t.title}","${(t.profiles as any)?.name || 'Unknown'}",${t.status},${t.priority},${t.due_date}\n`;
          });
          filename = 'task_completion.csv';
          break;
        }
        case 'recurring': {
          csvContent = 'Donor,Home,Amount,Start Date,Next Due Date,Status\n';
          recurringSummary?.donations.forEach(d => {
            csvContent += `"${d.donorName}","${d.homeName}",${d.amount},${d.startDate},${d.nextDueDate || 'N/A'},${d.status || 'N/A'}\n`;
          });
          filename = 'recurring_sponsorship.csv';
          break;
        }
        case 'corpus-kind': {
          csvContent = 'Type,Donor,Item/Mode,Amount/Value,Date\n';
          corpusKindSummary?.recentCorpus.forEach(c => {
            csvContent += `"Corpus Fund","${c.donorName}","${c.mode || 'N/A'}",${c.amount},${c.date}\n`;
          });
          corpusKindSummary?.recentKind.forEach(k => {
            csvContent += `"Kind Donation","${k.donorName}","${k.itemType} (${k.quantity})",${k.value},${k.date}\n`;
          });
          filename = 'corpus_kind_donations.csv';
          break;
        }
        case 'workdone': {
          csvContent = 'Type,Home,Date,Item,Donor,Amount/Value,Completion Notes\n';
          completedFoodSlots.forEach(slot => {
            csvContent += `"Food Slot","${slot.home_name}","${slot.date}","${slot.time_slot}","${slot.donor_name}","₹${slot.amount || 0}","${slot.completion_notes || ''}"\n`;
          });
          receivedKindDonations.forEach(donation => {
            csvContent += `"Kind Donation","${donation.home_name}","${donation.received_date}","${donation.item_type} (${donation.quantity || 1})","${donation.donor_name}","₹${donation.estimated_value || 0}","${donation.completion_notes || ''}"\n`;
          });
          completedNeedsData.forEach(need => {
            csvContent += `"Need","${need.home_name}","${need.date}","${need.category_label || need.description}","Various","₹${need.collected_amount || 0}","${need.fulfillment_details || ''}"\n`;
          });
          completedTasksData.forEach(task => {
            csvContent += `"Task","${task.home_name || 'General'}","${task.completed_at ? format(new Date(task.completed_at), 'yyyy-MM-dd') : ''}","${task.title}","${task.assignee_name || 'Staff'}","N/A",""\n`;
          });
          filename = 'work_done_report.csv';
          break;
        }
        default:
          return;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      toast.success(`${filename} downloaded successfully`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <Skeleton className="h-16 w-full mb-6" />
          <Skeleton className="h-10 w-full mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        {isSuperAdmin && <SuperAdminNav />}
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Platform-wide insights and performance metrics</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Select value={trustFilter} onValueChange={setTrustFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Trust" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Trusts</SelectItem>
                  {trusts.map(trust => (
                    <SelectItem key={trust.id} value={trust.id}>{trust.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={homeFilter} onValueChange={setHomeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Home" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Homes</SelectItem>
                  {homes.map(home => (
                    <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Report Tabs */}
        <Tabs defaultValue="donations" className="space-y-6">
          <TabsList className="w-full flex overflow-x-auto">
            <TabsTrigger value="donations" className="gap-2 flex-1 min-w-0">
              <IndianRupee className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Donations</span>
            </TabsTrigger>
            <TabsTrigger value="needs" className="gap-2 flex-1 min-w-0">
              <Heart className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Needs</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2 flex-1 min-w-0">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="recurring" className="gap-2 flex-1 min-w-0">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Recurring</span>
            </TabsTrigger>
            <TabsTrigger value="corpus-kind" className="gap-2 flex-1 min-w-0">
              <Package className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Corpus & Kind</span>
            </TabsTrigger>
            <TabsTrigger value="workdone" className="gap-2 flex-1 min-w-0">
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Work Done</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2 flex-1 min-w-0">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline truncate">Overview</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== Donations Report ==================== */}
          <TabsContent value="donations" className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExportCSV('donations')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Raised</p>
                      <p className="text-2xl font-bold text-foreground">₹{totalDonations.toLocaleString()}</p>
                    </div>
                    <IndianRupee className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">One-Time</p>
                      <p className="text-2xl font-bold text-foreground">₹{oneTimeTotal.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline">{oneTimeCount}</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Recurring</p>
                      <p className="text-2xl font-bold text-foreground">₹{recurringTotal.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline">{recurringCount}</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Donors</p>
                      <p className="text-2xl font-bold text-foreground">{donorCount}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Donations by Category</CardTitle>
                  <CardDescription>Amount raised per need category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {donationsByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={donationsByCategory}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                          />
                          <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">No donation data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Donation Type Distribution</CardTitle>
                  <CardDescription>One-time vs Recurring donations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {totalDonations > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donationTypePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {donationTypePieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">No donation data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Donors</CardTitle>
                <CardDescription>Highest contributing donors</CardDescription>
              </CardHeader>
              <CardContent>
                {topDonors.length > 0 ? (
                  <div className="space-y-4">
                    {topDonors.map((donor, index) => (
                      <div key={donor.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{index + 1}</div>
                          <div>
                            <p className="font-medium text-foreground">{donor.name}</p>
                            <p className="text-sm text-muted-foreground">{donor.donationCount} donations</p>
                          </div>
                        </div>
                        <p className="font-bold text-foreground">₹{donor.totalAmount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">No donor data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Needs Coverage Report ==================== */}
          <TabsContent value="needs" className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExportCSV('needs')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{totalNeeds}</p><p className="text-sm text-muted-foreground">Total Needs</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{openNeeds}</p><p className="text-sm text-muted-foreground">Open</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{partialNeeds}</p><p className="text-sm text-muted-foreground">Partial</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{fullySponsored}</p><p className="text-sm text-muted-foreground">Sponsored</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-muted-foreground">{completedNeeds}</p><p className="text-sm text-muted-foreground">Completed</p></CardContent></Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Needs Status Distribution</CardTitle><CardDescription>Current status of all needs</CardDescription></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {totalNeeds > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={needsStatusData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}>
                            {needsStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">No needs data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Needs by Home</CardTitle><CardDescription>Need distribution across homes</CardDescription></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {needsByHome.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={needsByHome}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Legend />
                          <Bar dataKey="open" name="Open" fill="hsl(var(--primary))" stackId="a" />
                          <Bar dataKey="partial" name="Partial" fill="#f59e0b" stackId="a" />
                          <Bar dataKey="sponsored" name="Sponsored" fill="#10b981" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">No home data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Coverage Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Overall Coverage Rate</span>
                      <span className="font-medium">{totalNeeds > 0 ? ((fullySponsored + completedNeeds) / totalNeeds * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${totalNeeds > 0 ? (fullySponsored + completedNeeds) / totalNeeds * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Partial Coverage</span>
                      <span className="font-medium">{totalNeeds > 0 ? (partialNeeds / totalNeeds * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${totalNeeds > 0 ? partialNeeds / totalNeeds * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Tasks Report ==================== */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExportCSV('tasks')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{totalTasks}</p><p className="text-sm text-muted-foreground">Total Tasks</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{openTasks}</p><p className="text-sm text-muted-foreground">Open</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{inProgressTasks}</p><p className="text-sm text-muted-foreground">In Progress</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{completedTasks}</p><p className="text-sm text-muted-foreground">Completed</p></CardContent></Card>
              <Card className={overdueTasks > 0 ? 'border-destructive/50' : ''}>
                <CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{overdueTasks}</p><p className="text-sm text-muted-foreground">Overdue</p></CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Task Status</CardTitle><CardDescription>Current task distribution</CardDescription></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {totalTasks > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}>
                            {taskStatusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">No task data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Tasks by Assignee</CardTitle><CardDescription>Assigned vs Completed per staff</CardDescription></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {tasksByAssignee.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tasksByAssignee}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Legend />
                          <Bar dataKey="assigned" name="Assigned" fill="hsl(var(--primary))" />
                          <Bar dataKey="completed" name="Completed" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">No assignee data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Completion Metrics with on-time vs delayed */}
            <Card>
              <CardHeader><CardTitle>Completion Metrics</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Completion Rate</span>
                        <span className="font-medium">{totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${totalTasks > 0 ? completedTasks / totalTasks * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">On-Time Rate</span>
                        <span className="font-medium">{totalTasks > 0 ? ((totalTasks - overdueTasks) / totalTasks * 100).toFixed(1) : 0}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${totalTasks > 0 ? (totalTasks - overdueTasks) / totalTasks * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-foreground">On-Time Completed</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">{onTimeCompleted}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-foreground">Delayed Completed</span>
                      </div>
                      <span className="text-lg font-bold text-destructive">{delayedCompleted}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Recurring Sponsorship Report ==================== */}
          <TabsContent value="recurring" className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExportCSV('recurring')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Recurring</p>
                      <p className="text-2xl font-bold text-foreground">{recurringSummary?.activeCount || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Commitment</p>
                      <p className="text-2xl font-bold text-foreground">₹{(recurringSummary?.monthlyCommitment || 0).toLocaleString()}</p>
                    </div>
                    <IndianRupee className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Due (30 days)</p>
                      <p className="text-2xl font-bold text-amber-600">{recurringSummary?.upcomingDue || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className={(recurringSummary?.overdueCount || 0) > 0 ? 'border-destructive/50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue</p>
                      <p className="text-2xl font-bold text-destructive">{recurringSummary?.overdueCount || 0}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recurring Donations</CardTitle>
                <CardDescription>All recurring sponsorship commitments</CardDescription>
              </CardHeader>
              <CardContent>
                {recurringLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (recurringSummary?.donations || []).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Donor</TableHead>
                        <TableHead>Home</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Next Due</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurringSummary!.donations.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.donorName}</TableCell>
                          <TableCell>{d.homeName}</TableCell>
                          <TableCell className="text-right">₹{d.amount.toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(d.startDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{d.nextDueDate ? format(new Date(d.nextDueDate), 'MMM d, yyyy') : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={d.status === 'ACTIVE' ? 'default' : d.status === 'OVERDUE' ? 'destructive' : 'secondary'}>
                              {d.status || 'N/A'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">No recurring donations found</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Corpus & Kind Donations Report ==================== */}
          <TabsContent value="corpus-kind" className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExportCSV('corpus-kind')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Corpus Fund Section */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Corpus Fund Total</p>
                  <p className="text-2xl font-bold text-foreground">₹{(corpusKindSummary?.corpusTotal || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{corpusKindSummary?.corpusCount || 0} contributions</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Kind Donations</p>
                  <p className="text-2xl font-bold text-foreground">{corpusKindSummary?.kindTotal || 0} items</p>
                  <p className="text-xs text-muted-foreground mt-1">{corpusKindSummary?.kindCount || 0} entries</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Kind Est. Value</p>
                  <p className="text-2xl font-bold text-foreground">₹{(corpusKindSummary?.kindTotalValue || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Corpus by Mode Pie Chart */}
              <Card>
                <CardHeader><CardTitle>Corpus by Payment Mode</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {(corpusKindSummary?.corpusByMode || []).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={corpusKindSummary!.corpusByMode} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {(corpusKindSummary!.corpusByMode).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">No corpus data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Kind by Type Bar Chart */}
              <Card>
                <CardHeader><CardTitle>Kind Donations by Type</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {(corpusKindSummary?.kindByType || []).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={corpusKindSummary!.kindByType}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Legend />
                          <Bar dataKey="quantity" name="Quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="value" name="Est. Value (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">No kind donation data available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Tables */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Recent Corpus Contributions</CardTitle></CardHeader>
                <CardContent>
                  {corpusKindLoading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : (corpusKindSummary?.recentCorpus || []).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Donor</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {corpusKindSummary!.recentCorpus.map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.donorName}</TableCell>
                            <TableCell><Badge variant="outline">{c.mode || 'N/A'}</Badge></TableCell>
                            <TableCell className="text-right">₹{c.amount.toLocaleString()}</TableCell>
                            <TableCell>{format(new Date(c.date), 'MMM d, yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground">No corpus contributions</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Recent Kind Donations</CardTitle></CardHeader>
                <CardContent>
                  {corpusKindLoading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : (corpusKindSummary?.recentKind || []).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Donor</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {corpusKindSummary!.recentKind.map(k => (
                          <TableRow key={k.id}>
                            <TableCell className="font-medium">{k.donorName}</TableCell>
                            <TableCell>{k.itemType}</TableCell>
                            <TableCell className="text-center">{k.quantity}</TableCell>
                            <TableCell className="text-right">₹{k.value.toLocaleString()}</TableCell>
                            <TableCell>{format(new Date(k.date), 'MMM d, yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground">No kind donations</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ==================== Work Done Report ==================== */}
          <TabsContent value="workdone" className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleExportCSV('workdone')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2"><UtensilsCrossed className="h-6 w-6 text-orange-600" /></div>
                  <p className="text-2xl font-bold text-foreground">{workDoneTotals?.completedFoodSlots || 0}</p>
                  <p className="text-sm text-muted-foreground">Food Slots Done</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2"><Package className="h-6 w-6 text-blue-600" /></div>
                  <p className="text-2xl font-bold text-foreground">{workDoneTotals?.receivedKindDonations || 0}</p>
                  <p className="text-sm text-muted-foreground">Kind Received</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2"><Heart className="h-6 w-6 text-pink-600" /></div>
                  <p className="text-2xl font-bold text-foreground">{workDoneTotals?.completedNeeds || 0}</p>
                  <p className="text-sm text-muted-foreground">Needs Done</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2"><CheckCircle2 className="h-6 w-6 text-green-600" /></div>
                  <p className="text-2xl font-bold text-foreground">{workDoneTotals?.completedTasks || 0}</p>
                  <p className="text-sm text-muted-foreground">Tasks Done</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2"><IndianRupee className="h-6 w-6 text-green-600" /></div>
                  <p className="text-2xl font-bold text-foreground">₹{(workDoneTotals?.totalValue || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Home-wise Work Done Summary</CardTitle><CardDescription>Completed work breakdown by home</CardDescription></CardHeader>
              <CardContent>
                {workDoneLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : workDoneSummary.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Home</TableHead>
                        <TableHead className="text-center">Food Slots</TableHead>
                        <TableHead className="text-center">Kind Items</TableHead>
                        <TableHead className="text-center">Needs</TableHead>
                        <TableHead className="text-center">Tasks</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workDoneSummary.map((home) => (
                        <TableRow key={home.homeId}>
                          <TableCell className="font-medium">{home.homeName}</TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-orange-600 border-orange-200">{home.completedFoodSlots}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-blue-600 border-blue-200">{home.receivedKindDonations}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-pink-600 border-pink-200">{home.completedNeeds}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-green-600 border-green-200">{home.completedTasks}</Badge></TableCell>
                          <TableCell className="text-right font-medium">₹{home.totalValue.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">No completed work in the selected period</div>
                )}
              </CardContent>
            </Card>

            <RecentCompletedItems
              foodSlots={completedFoodSlots}
              kindDonations={receivedKindDonations}
              completedNeeds={completedNeedsData}
              completedTasks={completedTasksData}
              isLoading={workDoneLoading}
              selectedItemIds={selectedItemIds}
              onToggleItem={handleToggleItem}
              onSendToDonor={handleOpenSendDialog}
            />

            <WorkDonePhotoGallery photos={completionPhotos} isLoading={workDoneLoading} />

            <SendToDonorDialog
              open={sendDialogOpen}
              onOpenChange={setSendDialogOpen}
              selectedItems={Array.from(selectedItemsMap.values())}
              onSendComplete={() => {
                setSelectedItemIds(new Set());
                setSelectedItemsMap(new Map());
                queryClient.invalidateQueries({ queryKey: ['completed-food-slots'] });
                queryClient.invalidateQueries({ queryKey: ['received-kind-donations'] });
                queryClient.invalidateQueries({ queryKey: ['completed-needs'] });
                queryClient.invalidateQueries({ queryKey: ['completed-tasks'] });
              }}
            />
          </TabsContent>

          {/* ==================== Overview Report ==================== */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IndianRupee className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Raised</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">₹{totalDonations.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground">Needs Fulfilled</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{fullySponsored + completedNeeds}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-amber-600" />
                    <span className="text-sm text-muted-foreground">Tasks Done</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{completedTasks}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span className="text-sm text-muted-foreground">Active Donors</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{donorCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend - Real Data */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Donations and needs over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {monthlyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis yAxisId="left" className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" className="text-xs" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(value: number, name: string) => [
                            name === 'donations' ? `₹${value.toLocaleString()}` : value,
                            name === 'donations' ? 'Donations' : 'Needs'
                          ]}
                        />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="donations" name="Donations (₹)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                        <Line yAxisId="right" type="monotone" dataKey="needs" name="Needs Created" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No trend data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Homes Performance</CardTitle></CardHeader>
                <CardContent>
                  {homesPerformance.length > 0 ? (
                    <div className="space-y-3">
                      {homesPerformance.map(home => (
                        <div key={home.id} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground truncate max-w-[150px]">{home.name}</span>
                          <Badge variant="outline">{home.coverageRate.toFixed(0)}% covered</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-muted-foreground text-sm">No home data available</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
                <CardContent>
                  {recentDonations.length > 0 ? (
                    <div className="space-y-3">
                      {recentDonations.map((donation: any) => (
                        <div key={donation.id} className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <IndianRupee className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">New donation received</p>
                            <p className="text-xs text-muted-foreground">
                              ₹{donation.amount_pledged.toLocaleString()} - {format(new Date(donation.created_at), 'MMM d')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-muted-foreground text-sm">No recent activity</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Attention Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overdueTasks > 0 && (
                      <div className="flex items-center justify-between p-2 rounded bg-destructive/10">
                        <span className="text-sm text-foreground">Overdue Tasks</span>
                        <Badge variant="destructive">{overdueTasks}</Badge>
                      </div>
                    )}
                    {openNeeds > 0 && (
                      <div className="flex items-center justify-between p-2 rounded bg-amber-500/10">
                        <span className="text-sm text-foreground">Open Needs</span>
                        <Badge variant="outline" className="text-amber-600 border-amber-200">{openNeeds}</Badge>
                      </div>
                    )}
                    {(recurringSummary?.overdueCount || 0) > 0 && (
                      <div className="flex items-center justify-between p-2 rounded bg-destructive/10">
                        <span className="text-sm text-foreground">Overdue Recurring</span>
                        <Badge variant="destructive">{recurringSummary?.overdueCount}</Badge>
                      </div>
                    )}
                    {overdueTasks === 0 && openNeeds === 0 && (recurringSummary?.overdueCount || 0) === 0 && (
                      <div className="py-4 text-center text-muted-foreground text-sm">All clear! 🎉</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reports;
