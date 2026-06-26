import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle2,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';
import { Task } from '@/types';
import { useStaffUsers } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface EmployeeEfficiencyProps {
  tasks: Task[];
}

export function EmployeeEfficiency({ tasks }: EmployeeEfficiencyProps) {
  const { data: allStaffUsers = [] } = useStaffUsers();

  // Calculate stats from actual tasks
  const calculateEmployeeStats = (userId: string) => {
    const userTasks = tasks.filter(t => t.assigned_to === userId);
    const completed = userTasks.filter(t => t.status === 'COMPLETED');
    const inProgress = userTasks.filter(t => t.status === 'IN_PROGRESS');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdue = userTasks.filter(t => {
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
    });

    const onTimeCompletions = completed.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = new Date(t.completed_at);
      const dueDate = new Date(t.due_date);
      return completedDate <= dueDate;
    });

    const avgCompletionTime = completed.reduce((acc, task) => {
      if (!task.started_at || !task.completed_at) return acc;
      const start = new Date(task.started_at).getTime();
      const end = new Date(task.completed_at).getTime();
      return acc + (end - start) / (1000 * 60 * 60); // hours
    }, 0) / (completed.length || 1);

    const efficiencyScore = userTasks.length > 0 
      ? Math.round((onTimeCompletions.length / Math.max(completed.length, 1)) * 100)
      : 0;

    return {
      total: userTasks.length,
      completed: completed.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
      onTimeCompletions: onTimeCompletions.length,
      avgCompletionTime: Math.round(avgCompletionTime),
      efficiencyScore,
      currentWorkload: inProgress.length + overdue.length,
    };
  };

  // Only show staff who have tasks assigned
  const staffWithTasks = allStaffUsers.filter(u => {
    const userTasks = tasks.filter(t => t.assigned_to === u.id);
    return userTasks.length > 0;
  });

  // Calculate team-wide efficiency
  const allStats = staffWithTasks.map(u => calculateEmployeeStats(u.id));
  const avgTeamEfficiency = allStats.length > 0
    ? Math.round(allStats.reduce((a, b) => a + b.efficiencyScore, 0) / allStats.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Team Efficiency</p>
                <p className="text-2xl font-bold text-foreground">{avgTeamEfficiency}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/20">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {tasks.filter(t => t.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/5 to-info/10 border-info/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/20">
                <Zap className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Team Members</p>
                <p className="text-2xl font-bold text-foreground">{staffWithTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {staffWithTasks.map((user) => {
          const stats = calculateEmployeeStats(user.id);
          const isEfficiencyHigh = stats.efficiencyScore >= 80;

          return (
            <Card key={user.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{user.name}</CardTitle>
                      <Badge variant="outline" className="text-xs capitalize mt-1">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                  {/* Efficiency Score */}
                  <div className="text-right">
                    <div className={cn(
                      "text-3xl font-bold",
                      isEfficiencyHigh ? "text-success" : "text-warning"
                    )}>
                      {stats.efficiencyScore}%
                    </div>
                    <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                      {isEfficiencyHigh ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span>efficiency</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-success/10">
                    <p className="text-lg font-bold text-success">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Done</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-info/10">
                    <p className="text-lg font-bold text-info">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-destructive/10">
                    <p className="text-lg font-bold text-destructive">{stats.overdue}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                  {/* Completion Rate */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Completion Rate</span>
                      <span className="font-medium">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  {/* Avg Completion Time */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Avg Completion Time</span>
                    </div>
                    <span className="font-medium">{stats.avgCompletionTime}h</span>
                  </div>

                  {/* Workload */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      <span>Current Workload</span>
                    </div>
                    <Badge 
                      variant={stats.currentWorkload > 3 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {stats.currentWorkload} tasks
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {staffWithTasks.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            No staff members with assigned tasks yet.
          </div>
        )}
      </div>
    </div>
  );
}
