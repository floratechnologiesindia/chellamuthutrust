import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectSwitcher } from '@/components/warden/ProjectSwitcher';
import { AssignedHomeStates } from '@/components/warden/AssignedHomeStates';
import { useAssignedHome } from '@/hooks/useAssignedHome';
import { useWardenDashboardStats, type PeriodPreset } from '@/hooks/useWardenOps';
import { WalkinKindDonationDialog } from '@/components/homes/WalkinKindDonationDialog';
import {
  UtensilsCrossed,
  ListChecks,
  BookOpen,
  CheckSquare,
  Wallet,
  Plus,
  Gift,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';

const MODULES = [
  { to: '/warden/food', title: 'Food Sponsorships', description: 'Book meals for donors', icon: UtensilsCrossed },
  { to: '/warden/needs', title: 'Project Requirements', description: 'Material and financial needs', icon: ListChecks },
  { to: '/warden/updates', title: 'Project Updates', description: 'Profile, residents, events', icon: BookOpen },
  { to: '/warden/tasks', title: 'Task Bar', description: 'Checklist & assigned work', icon: CheckSquare },
  { to: '/warden/donations', title: 'Active Donations', description: 'Ongoing sponsorships', icon: Wallet },
] as const;

const PIE_COLORS = ['#0d9488', '#f59e0b', '#ef4444', '#7ebec5', '#ff6633'];

const WardenDashboard = () => {
  const { homeId, home, isLoading } = useAssignedHome();
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showKindDonationDialog, setShowKindDonationDialog] = useState(false);

  const { data: stats, isLoading: statsLoading } = useWardenDashboardStats(
    homeId,
    period,
    period === 'custom' ? customStart : undefined,
    period === 'custom' ? customEnd : undefined,
  );

  const mealPie = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Breakfast', value: stats.food.breakfast },
      { name: 'Lunch', value: stats.food.lunch },
      { name: 'Dinner', value: stats.food.dinner },
      { name: 'Refreshments', value: stats.food.refreshments },
      { name: 'Outside Food', value: stats.food.outside_food },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const payPie = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Paid', value: stats.payment.paid, color: '#0d9488' },
      { name: 'Partial', value: stats.payment.partial, color: '#f59e0b' },
      { name: 'Pending', value: stats.payment.pending, color: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [stats]);

  return (
    <AssignedHomeStates homeId={homeId} home={home} isLoading={isLoading}>
      {home && homeId && (
        <MainLayout>
          <div className="container py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex flex-col gap-2 min-w-0">
                <div className="md:hidden">
                  <ProjectSwitcher className="w-full max-w-xs" />
                </div>
                <p className="text-sm text-muted-foreground">{home.name}</p>
                <h1 className="text-3xl font-display font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                  Donation activity overview for this project
                  {stats?.period ? ` · ${stats.period.start} to ${stats.period.end}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Period</Label>
                  <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="quarter">Quarterly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {period === 'custom' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">From</Label>
                      <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To</Label>
                      <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                    </div>
                  </>
                )}
                <Button variant="outline" onClick={() => setShowKindDonationDialog(true)}>
                  <Gift className="h-4 w-4 mr-2" /> Kind Donation
                </Button>
                <Button asChild>
                  <Link to="/warden/needs/new">
                    <Plus className="h-4 w-4 mr-2" /> Requirement
                  </Link>
                </Button>
              </div>
            </div>

            {statsLoading || !stats ? (
              <div className="grid md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardDescription>Food sponsorships</CardDescription>
                      <CardTitle className="text-2xl">{stats.food.total_sponsorships}</CardTitle>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.food.total_value)}</p>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardDescription>Pending payments</CardDescription>
                      <CardTitle className="text-2xl">{stats.payment.pending + stats.payment.partial}</CardTitle>
                      <p className="text-xs text-muted-foreground">{stats.payment.paid} paid</p>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardDescription>In-kind donations</CardDescription>
                      <CardTitle className="text-2xl">{stats.kind.total_count}</CardTitle>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stats.kind.estimated_value)}</p>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardDescription>Requirements</CardDescription>
                      <CardTitle className="text-2xl">{stats.requirements.listed}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {stats.requirements.fully_sponsored} full · {stats.requirements.partially_sponsored} partial ·{' '}
                        {stats.requirements.pending} open
                      </p>
                    </CardHeader>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Food sponsorship value</CardTitle>
                      <CardDescription>By date in selected period</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[240px]">
                      {stats.chart.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-16">No food sponsorships in this period</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.chart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}K` : v}`} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            <Area type="monotone" dataKey="amount" stroke="#ff6633" fill="#ffca0f" fillOpacity={0.45} name="Amount" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Meal mix</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[240px]">
                      {mealPie.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-16">No data</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={mealPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                              {mealPie.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Food sponsorship summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 text-sm">
                      <div>Breakfast: <strong>{stats.food.breakfast}</strong></div>
                      <div>Lunch: <strong>{stats.food.lunch}</strong></div>
                      <div>Dinner: <strong>{stats.food.dinner}</strong></div>
                      <div>Refreshments: <strong>{stats.food.refreshments}</strong></div>
                      <div>Outside food: <strong>{stats.food.outside_food}</strong></div>
                      <div>Total value: <strong>{formatCurrency(stats.food.total_value)}</strong></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Payment status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-4 items-center">
                      <div className="h-[140px] w-[140px]">
                        {payPie.length > 0 && (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={payPie} dataKey="value" innerRadius={35} outerRadius={55}>
                                {payPie.map((e, i) => (
                                  <Cell key={i} fill={e.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Paid: <strong>{stats.payment.paid}</strong></div>
                        <div>Partial: <strong>{stats.payment.partial}</strong></div>
                        <div>Pending: <strong>{stats.payment.pending}</strong></div>
                        <div>Upcoming: <strong>{stats.payment.upcoming}</strong></div>
                        <div>Completed: <strong>{stats.payment.completed}</strong></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link key={mod.to} to={mod.to} className="block group">
                    <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{mod.title}</CardTitle>
                            <CardDescription className="mt-1">{mod.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          <WalkinKindDonationDialog
            open={showKindDonationDialog}
            onOpenChange={setShowKindDonationDialog}
            homeId={homeId}
            trustId={home.trust_id}
            homeName={home.name}
          />
        </MainLayout>
      )}
    </AssignedHomeStates>
  );
};

export default WardenDashboard;
