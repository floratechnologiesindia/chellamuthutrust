import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  useMonthlyDonationTrends,
  useDailyTaskActivity,
  useTaskCompletionPerformance,
  useNeedsByCategory,
} from '@/hooks/useDashboardAnalytics';
import {
  useDonationSummary,
  useTasksSummary,
  useTasksByAssignee,
  useNeedsByHome,
} from '@/hooks/useReportData';
import { TrendingUp, CheckCircle2, Users, PieChart as PieChartIcon } from 'lucide-react';

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted))',
  destructive: 'hsl(var(--destructive))',
};

const PIE_COLORS = ['#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#10b981', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.value > 1000 
              ? `₹${(entry.value / 1000).toFixed(1)}K` 
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function SuperAdminAnalytics() {
  const { data: monthlyDonations, isLoading: loadingMonthly } = useMonthlyDonationTrends();
  const { data: dailyTasks, isLoading: loadingDaily } = useDailyTaskActivity();
  const { data: taskPerformance, isLoading: loadingPerformance } = useTaskCompletionPerformance();
  const { data: donationSummary, isLoading: loadingDonations } = useDonationSummary();
  const { data: tasksSummary, isLoading: loadingTasks } = useTasksSummary();
  const { data: tasksByAssignee, isLoading: loadingAssignee } = useTasksByAssignee();
  const { data: needsByHome, isLoading: loadingHomes } = useNeedsByHome();
  const { data: needsByCategory, isLoading: loadingCategory } = useNeedsByCategory();

  const taskStatusData = tasksSummary ? [
    { name: 'Open', value: tasksSummary.open, color: '#6366f1' },
    { name: 'In Progress', value: tasksSummary.inProgress, color: '#f59e0b' },
    { name: 'Completed', value: tasksSummary.completed, color: '#10b981' },
    { name: 'Cancelled', value: tasksSummary.cancelled, color: '#94a3b8' },
  ] : [];

  const donationTypeData = donationSummary ? [
    { name: 'One-Time', value: donationSummary.oneTimeCount, color: '#0d9488' },
    { name: 'Recurring', value: donationSummary.recurringCount, color: '#f59e0b' },
  ] : [];

  const performanceData = taskPerformance ? [
    { name: 'On Time', value: taskPerformance.onTime, color: '#10b981' },
    { name: 'Delayed', value: taskPerformance.delayed, color: '#ef4444' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Row 1: Payment Trends & Task Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Donation Trends (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMonthly ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyDonations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${v/1000}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="oneTime" stackId="1" stroke="#0d9488" fill="#0d9488" fillOpacity={0.6} name="One-Time" />
                  <Area type="monotone" dataKey="recurring" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Recurring" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Task Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {taskStatusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Donation Types & Task Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* One-Time vs Recurring */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Donation Types</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDonations ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={donationTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {donationTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily Task Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Task Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDaily ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dailyTasks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="created" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="Created" />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Completed" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Employee Performance & Needs by Home */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Employee Task Ratio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Employee Task Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAssignee ? (
              <Skeleton className="h-[200px] w-full" />
            ) : tasksByAssignee && tasksByAssignee.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tasksByAssignee} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="overdue" stackId="a" fill="#ef4444" name="Overdue" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No employee data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs by Home */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Needs Status by Home</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHomes ? (
              <Skeleton className="h-[200px] w-full" />
            ) : needsByHome && needsByHome.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={needsByHome}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="open" stackId="a" fill="#6366f1" name="Open" />
                  <Bar dataKey="partial" stackId="a" fill="#f59e0b" name="Partial" />
                  <Bar dataKey="sponsored" stackId="a" fill="#10b981" name="Sponsored" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No home data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Category Distribution & Completion Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Needs by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Help Received by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCategory ? (
              <Skeleton className="h-[280px] w-full" />
            ) : needsByCategory && needsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={needsByCategory}
                    cx="50%"
                    cy="45%"
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ cx, cy, midAngle, outerRadius, percent }) => {
                      if (percent < 0.05) return null;
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 20;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    labelLine={true}
                  >
                    {needsByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Task Completion Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPerformance ? (
              <Skeleton className="h-[200px] w-full" />
            ) : taskPerformance ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{taskPerformance.onTimeRate}%</p>
                    <p className="text-sm text-muted-foreground">On-Time Rate</p>
                  </div>
                  <div className="flex justify-around">
                    <div className="text-center">
                      <p className="text-xl font-semibold text-green-600">{taskPerformance.onTime}</p>
                      <p className="text-xs text-muted-foreground">On Time</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-semibold text-red-500">{taskPerformance.delayed}</p>
                      <p className="text-xs text-muted-foreground">Delayed</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
