import { useSearchParams, Link } from 'react-router-dom';
import { isPast } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { AssignedHomeStates } from '@/components/warden/AssignedHomeStates';
import { ProjectSwitcher } from '@/components/warden/ProjectSwitcher';
import { TaskCard } from '@/components/tasks/TaskCard';
import { useAssignedHome } from '@/hooks/useAssignedHome';
import { useWardenTaskBar } from '@/hooks/useWardenOps';
import { useMyTasks, useUpdateTaskStatus, toTask } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckSquare, ArrowRight, ClipboardList } from 'lucide-react';
import type { TaskStatus } from '@/types';

const priorityVariant = {
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
};

const WardenTaskBar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'assigned' ? 'assigned' : 'general';
  const { user } = useAuth();
  const { homeId, home, isLoading } = useAssignedHome();
  const { data: generalItems = [], isLoading: generalLoading } = useWardenTaskBar(homeId);
  const { data: tasksData, isLoading: assignedLoading } = useMyTasks(user?.id);
  const updateStatus = useUpdateTaskStatus();

  const assignedTasks = (tasksData || []).map(toTask);
  const pendingAssigned = assignedTasks.filter(
    (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS',
  );
  const overdueAssigned = assignedTasks.filter(
    (t) => isPast(new Date(t.due_date)) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED',
  );

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateStatus.mutate({ taskId, status: newStatus });
  };

  return (
    <AssignedHomeStates homeId={homeId} home={home} isLoading={isLoading}>
      {home && (
        <MainLayout>
          <div className="container py-8 space-y-6">
            <div className="flex flex-col gap-2">
              <div className="md:hidden">
                <ProjectSwitcher className="w-full max-w-xs" />
              </div>
              <p className="text-sm text-muted-foreground">{home.name}</p>
              <h1 className="text-3xl font-display font-bold">Task Bar</h1>
              <p className="text-muted-foreground">
                Auto checklist from project activity, plus tasks assigned to you
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(tab) =>
                setSearchParams(tab === 'general' ? {} : { tab }, { replace: true })
              }
            >
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="general">
                  General Tasks (auto)
                  {generalItems.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {generalItems.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="assigned">
                  Assigned Tasks
                  {pendingAssigned.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingAssigned.length}
                    </Badge>
                  )}
                  {overdueAssigned.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {overdueAssigned.length} overdue
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-6">
                {generalLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : generalItems.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>You&apos;re all caught up — no pending checklist items.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {generalItems.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="py-4 flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={priorityVariant[item.priority]}>{item.priority}</Badge>
                              <Badge variant="outline">{item.category}</Badge>
                            </div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            {item.due_date && (
                              <p className="text-xs text-muted-foreground">Due {item.due_date}</p>
                            )}
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link to={item.href}>
                              Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assigned" className="mt-6">
                {assignedLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : assignedTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium mb-1">No tasks assigned to you</p>
                      <p className="text-sm">
                        When a super admin assigns you a task, it will appear here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {overdueAssigned.length > 0 && (
                      <p className="text-sm text-destructive">
                        {overdueAssigned.length} overdue task
                        {overdueAssigned.length === 1 ? '' : 's'} need attention
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assignedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </MainLayout>
      )}
    </AssignedHomeStates>
  );
};

export default WardenTaskBar;
