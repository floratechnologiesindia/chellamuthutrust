import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Circle,
  ArrowRight,
  Calendar,
  Flag
} from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { useStaffUsers } from '@/hooks/useTasks';
import { useHomes } from '@/hooks/useHomes';
import { differenceInDays, format, isToday, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: string) => void;
}

const columns: { status: TaskStatus; label: string; color: string; icon: any }[] = [
  { status: 'OPEN', label: 'Open', color: 'bg-muted', icon: Circle },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'bg-info/20', icon: Clock },
  { status: 'COMPLETED', label: 'Completed', color: 'bg-success/20', icon: CheckCircle2 },
  { status: 'CANCELLED', label: 'Cancelled', color: 'bg-muted/50', icon: AlertTriangle },
];

export function TaskBoard({ tasks, onStatusChange }: TaskBoardProps) {
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const { data: staffUsers = [] } = useStaffUsers();
  const { data: homes = [] } = useHomes();

  const filteredTasks = tasks.filter(task => {
    if (filterAssignee !== 'all' && task.assigned_to !== filterAssignee) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    return true;
  });

  const getTasksByStatus = (status: TaskStatus) => 
    filteredTasks.filter(t => t.status === status);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {staffUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.status);
          const Icon = column.icon;
          
          return (
            <div key={column.status} className="space-y-3">
              <Card className={cn("border-t-4", column.color, "border-t-current")}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <CardTitle className="text-sm font-medium">
                        {column.label}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              <div className="space-y-3 min-h-96">
                {columnTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onStatusChange={onStatusChange}
                    staffUsers={staffUsers}
                    homes={homes}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: string) => void;
  staffUsers: { id: string; name: string; email: string; role: string }[];
  homes: { id: string; name: string }[];
}

function TaskCard({ task, onStatusChange, staffUsers, homes }: TaskCardProps) {
  const assignee = staffUsers.find(u => u.id === task.assigned_to);
  const home = task.home_id ? homes.find(h => h.id === task.home_id) : null;
  
  const dueDate = new Date(task.due_date);
  const isOverdue = isPast(dueDate) && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
  const isDueToday = isToday(dueDate);
  const daysUntilDue = differenceInDays(dueDate, new Date());

  const priorityConfig = {
    high: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: '🔴' },
    medium: { color: 'bg-warning/10 text-warning border-warning/20', icon: '🟡' },
    low: { color: 'bg-success/10 text-success border-success/20', icon: '🟢' },
  };

  const getNextStatuses = (): TaskStatus[] => {
    switch (task.status) {
      case 'OPEN': return ['IN_PROGRESS', 'CANCELLED'];
      case 'IN_PROGRESS': return ['COMPLETED', 'OPEN', 'CANCELLED'];
      case 'COMPLETED': return ['OPEN'];
      case 'CANCELLED': return ['OPEN'];
      default: return [];
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-300 hover:shadow-md cursor-pointer",
        isOverdue && "ring-2 ring-destructive/50 animate-pulse",
        isDueToday && !isOverdue && "ring-2 ring-warning/50"
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Priority & Status */}
        <div className="flex items-center justify-between">
          <Badge 
            variant="outline" 
            className={cn("text-xs", priorityConfig[task.priority].color)}
          >
            <Flag className="h-3 w-3 mr-1" />
            {task.priority}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              Overdue
            </Badge>
          )}
          {isDueToday && !isOverdue && (
            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
              Due Today
            </Badge>
          )}
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>

        {/* Project */}
        {home && (
          <Badge variant="secondary" className="text-xs">
            {home.name}
          </Badge>
        )}

        {/* Due Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span className={cn(
            isOverdue && "text-destructive font-medium",
            isDueToday && "text-warning font-medium"
          )}>
            {format(dueDate, 'MMM d, yyyy')}
            {daysUntilDue > 0 && daysUntilDue <= 7 && ` (${daysUntilDue}d left)`}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {/* Assignee */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {assignee?.name?.split(' ').map(n => n[0]).join('') || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-20">
              {assignee?.name?.split(' ')[0] || 'Unknown'}
            </span>
          </div>

          {/* Quick Status Change */}
          {getNextStatuses().length > 0 && (
            <Select 
              value="" 
              onValueChange={(value) => onStatusChange(task.id, value)}
            >
              <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent">
                <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </SelectTrigger>
              <SelectContent align="end">
                {getNextStatuses().map((status) => (
                  <SelectItem key={status} value={status}>
                    Move to {status.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
