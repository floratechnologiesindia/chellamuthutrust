import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, User, Home, AlertCircle } from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  showAssignee?: boolean;
}

export const TaskCard = ({ task, onStatusChange, showAssignee = false }: TaskCardProps) => {
  // Fetch assignee and assigner profiles
  const { data: assignedTo } = useQuery({
    queryKey: ['profile', task.assigned_to],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', task.assigned_to)
        .maybeSingle();
      return data;
    },
  });

  const { data: assignedBy } = useQuery({
    queryKey: ['profile', task.assigned_by],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', task.assigned_by)
        .maybeSingle();
      return data;
    },
  });

  const { data: home } = useQuery({
    queryKey: ['home', task.home_id],
    queryFn: async () => {
      if (!task.home_id) return null;
      const { data } = await supabase
        .from('homes')
        .select('id, name')
        .eq('id', task.home_id)
        .maybeSingle();
      return data;
    },
    enabled: !!task.home_id,
  });
  
  const isOverdue = isPast(new Date(task.due_date)) && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
  const isDueToday = isToday(new Date(task.due_date));

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-primary/20 text-primary">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-warning/20 text-warning">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-success/20 text-success">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isOverdue && "border-destructive/50 bg-destructive/5",
      isDueToday && !isOverdue && "border-warning/50 bg-warning/5",
      task.status === 'COMPLETED' && "opacity-70"
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn(
                  "font-semibold",
                  task.status === 'COMPLETED' && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </h3>
                {getPriorityBadge(task.priority)}
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            </div>
            {getStatusBadge(task.status)}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className={cn(
              "flex items-center gap-1",
              isOverdue && "text-destructive font-medium",
              isDueToday && !isOverdue && "text-warning font-medium"
            )}>
              {isOverdue && <AlertCircle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              <span>
                {isOverdue ? 'Overdue: ' : isDueToday ? 'Due Today: ' : 'Due: '}
                {format(new Date(task.due_date), 'MMM dd, yyyy')}
              </span>
            </div>
            
            {home && (
              <div className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                <span>{home.name}</span>
              </div>
            )}
            
            {showAssignee && assignedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{assignedTo.name}</span>
              </div>
            )}
          </div>

          {/* Assigned by */}
          {assignedBy && (
            <p className="text-xs text-muted-foreground">
              Assigned by {assignedBy.name}
            </p>
          )}

          {/* Actions */}
          {onStatusChange && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Update status:</span>
              <Select
                value={task.status}
                onValueChange={(value: TaskStatus) => onStatusChange(task.id, value)}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Completed info */}
          {task.status === 'COMPLETED' && task.completed_at && (
            <p className="text-xs text-success flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Completed on {format(new Date(task.completed_at), 'MMM dd, yyyy')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
