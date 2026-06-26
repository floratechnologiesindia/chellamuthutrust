import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  ListTodo,
} from 'lucide-react';
import { TaskCard } from '@/components/tasks/TaskCard';
import { useMyTasks, useUpdateTaskStatus, toTask } from '@/hooks/useTasks';
import { TaskStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { isPast } from 'date-fns';

const MyTasks = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  
  const { data: tasksData, isLoading, error } = useMyTasks(user?.id);
  const updateStatus = useUpdateTaskStatus();

  // Convert to frontend format
  const myTasks = (tasksData || []).map(toTask);
  
  const pendingTasks = myTasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const completedTasks = myTasks.filter(t => t.status === 'COMPLETED');
  const overdueTasks = myTasks.filter(t => 
    isPast(new Date(t.due_date)) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  );

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateStatus.mutate({ taskId, status: newStatus });
  };

  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'pending':
        return pendingTasks;
      case 'completed':
        return completedTasks;
      case 'overdue':
        return overdueTasks;
      default:
        return myTasks;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
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
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <ClipboardList className="h-8 w-8" />
            My Tasks
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage your assigned tasks</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ListTodo className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">{myTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">{overdueTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">
              Pending
              {pendingTasks.length > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingTasks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue
              {overdueTasks.length > 0 && (
                <Badge variant="destructive" className="ml-2">{overdueTasks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              {completedTasks.length > 0 && (
                <Badge variant="outline" className="ml-2">{completedTasks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {getFilteredTasks().length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {activeTab === 'pending' && "No pending tasks"}
                    {activeTab === 'overdue' && "No overdue tasks"}
                    {activeTab === 'completed' && "No completed tasks yet"}
                    {activeTab === 'all' && "No tasks assigned"}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'overdue' 
                      ? "Great job staying on top of your tasks!" 
                      : "Tasks assigned to you will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getFilteredTasks().map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default MyTasks;
