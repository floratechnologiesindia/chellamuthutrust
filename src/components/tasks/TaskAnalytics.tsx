import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/types';
import { useStaffUsers } from '@/hooks/useTasks';
import { useHomes } from '@/hooks/useHomes';
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
  Area,
  AreaChart,
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

interface TaskAnalyticsProps {
  tasks: Task[];
}

export function TaskAnalytics({ tasks }: TaskAnalyticsProps) {
  const { data: staffUsers = [] } = useStaffUsers();
  const { data: homes = [] } = useHomes();

  // Status Distribution
  const statusData = [
    { name: 'Open', value: tasks.filter(t => t.status === 'OPEN').length, color: 'hsl(var(--muted-foreground))' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: 'hsl(var(--info))' },
    { name: 'Completed', value: tasks.filter(t => t.status === 'COMPLETED').length, color: 'hsl(var(--success))' },
    { name: 'Cancelled', value: tasks.filter(t => t.status === 'CANCELLED').length, color: 'hsl(var(--muted))' },
  ].filter(d => d.value > 0);

  // Priority Distribution
  const priorityData = [
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length, color: 'hsl(var(--destructive))' },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: 'hsl(var(--warning))' },
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, color: 'hsl(var(--success))' },
  ];

  // Tasks by Assignee
  const assigneeData = staffUsers.map(user => {
    const userTasks = tasks.filter(t => t.assigned_to === user.id);
    return {
      name: user.name.split(' ')[0],
      completed: userTasks.filter(t => t.status === 'COMPLETED').length,
      pending: userTasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
      overdue: userTasks.filter(t => {
        const dueDate = new Date(t.due_date);
        return dueDate < new Date() && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
      }).length,
    };
  }).filter(d => d.completed > 0 || d.pending > 0);

  // Daily Completion Trend (last 7 days)
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });

  const trendData = last7Days.map(date => {
    const dayStart = startOfDay(date);
    const dayTasks = tasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = startOfDay(new Date(t.completed_at));
      return completedDate.getTime() === dayStart.getTime();
    });
    
    return {
      date: format(date, 'EEE'),
      completed: dayTasks.length,
      created: tasks.filter(t => {
        const createdDate = startOfDay(new Date(t.created_at));
        return createdDate.getTime() === dayStart.getTime();
      }).length,
    };
  });

  // On-Time vs Delayed Performance
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' && t.completed_at);
  const onTimeCount = completedTasks.filter(t => {
    const completedDate = new Date(t.completed_at!);
    const dueDate = new Date(t.due_date);
    return completedDate <= dueDate;
  }).length;
  const delayedCount = completedTasks.length - onTimeCount;

  const performanceData = [
    { name: 'On Time', value: onTimeCount, color: 'hsl(var(--success))' },
    { name: 'Delayed', value: delayedCount, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Priority Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Task Activity (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="hsl(var(--success))"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="hsl(var(--info))"
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Assignee */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tasks by Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assigneeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="completed" name="Completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name="Overdue" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* On-Time Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completion Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={performanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-4">
            <p className="text-2xl font-bold text-success">
              {completedTasks.length > 0 ? Math.round((onTimeCount / completedTasks.length) * 100) : 0}%
            </p>
            <p className="text-sm text-muted-foreground">On-Time Completion Rate</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
