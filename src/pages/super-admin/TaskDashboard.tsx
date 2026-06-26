import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Plus,
  TrendingUp,
  Users,
  BarChart3,
  Zap
} from 'lucide-react';
import { useTasks, useUpdateTaskStatus, toTask } from '@/hooks/useTasks';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { EmployeeEfficiency } from '@/components/tasks/EmployeeEfficiency';
import { TaskAnalytics } from '@/components/tasks/TaskAnalytics';
import { ActivityTimeline } from '@/components/tasks/ActivityTimeline';
import { QuickTaskDialog } from '@/components/tasks/QuickTaskDialog';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';
import { TaskStatus } from '@/types';
import { isPast, isToday } from 'date-fns';

export default function TaskDashboard() {
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  
  const { data: tasksData, isLoading, refetch } = useTasks();
  const updateStatus = useUpdateTaskStatus();

  const tasks = (tasksData || []).map(toTask);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateStatus.mutate({ taskId, status: newStatus as TaskStatus });
  };

  // Calculate stats
  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completedToday: tasks.filter(t => 
      t.status === 'COMPLETED' && t.completed_at && isToday(new Date(t.completed_at))
    ).length,
    overdue: tasks.filter(t => 
      isPast(new Date(t.due_date)) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    ).length,
  };

  const statCards = [
    { 
      label: 'Total Tasks', 
      value: stats.total, 
      icon: ClipboardList, 
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: '+12%'
    },
    { 
      label: 'In Progress', 
      value: stats.inProgress, 
      icon: Clock, 
      color: 'text-info',
      bgColor: 'bg-info/10',
      trend: null
    },
    { 
      label: 'Completed Today', 
      value: stats.completedToday, 
      icon: CheckCircle2, 
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: '+3'
    },
    { 
      label: 'Overdue', 
      value: stats.overdue, 
      icon: AlertTriangle, 
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      trend: stats.overdue > 0 ? 'Needs attention' : null
    },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in container mx-auto py-8 px-4">
        {/* Navigation */}
        <SuperAdminNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Task Command Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time task tracking and employee performance analytics
            </p>
          </div>
          <Button 
            onClick={() => setIsQuickTaskOpen(true)}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Plus className="h-4 w-4" />
            Quick Task
          </Button>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card 
              key={stat.label} 
              className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold mt-2 text-foreground">
                      {stat.value}
                    </p>
                    {stat.trend && (
                      <div className="flex items-center gap-1 mt-2">
                        {stat.label === 'Overdue' ? (
                          <Badge variant="destructive" className="text-xs">
                            {stat.trend}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {stat.trend}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                {/* Decorative gradient */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 h-1 ${stat.bgColor}`}
                  style={{ opacity: 0.5 }}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="board" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4 bg-muted/50">
            <TabsTrigger value="board" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Board</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="space-y-6">
            <TaskBoard tasks={tasks} onStatusChange={handleStatusChange} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <TaskAnalytics tasks={tasks} />
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <EmployeeEfficiency tasks={tasks} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <ActivityTimeline tasks={tasks} />
          </TabsContent>
        </Tabs>
      </div>

      <QuickTaskDialog 
        open={isQuickTaskOpen} 
        onOpenChange={setIsQuickTaskOpen}
        onTaskCreate={() => {
          refetch();
        }}
      />
    </MainLayout>
  );
}
