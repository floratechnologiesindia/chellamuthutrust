import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  XCircle, 
  Plus,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Task } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const actionConfig = {
  created: { 
    icon: Plus, 
    color: 'text-primary bg-primary/10', 
    label: 'created task' 
  },
  started: { 
    icon: Clock, 
    color: 'text-info bg-info/10', 
    label: 'started working on' 
  },
  completed: { 
    icon: CheckCircle2, 
    color: 'text-success bg-success/10', 
    label: 'completed' 
  },
  cancelled: { 
    icon: XCircle, 
    color: 'text-destructive bg-destructive/10', 
    label: 'cancelled' 
  },
  reassigned: { 
    icon: ArrowRight, 
    color: 'text-warning bg-warning/10', 
    label: 'reassigned' 
  },
  updated: { 
    icon: RefreshCw, 
    color: 'text-muted-foreground bg-muted', 
    label: 'updated' 
  },
};

interface ActivityTimelineProps {
  tasks: Task[];
}

interface ActivityItem {
  id: string;
  task_title: string;
  user_name: string;
  action: keyof typeof actionConfig;
  old_status?: string;
  new_status?: string;
  timestamp: string;
}

export function ActivityTimeline({ tasks }: ActivityTimelineProps) {
  // Derive activity from real tasks based on their timestamps
  const activities: ActivityItem[] = [];

  tasks.forEach(task => {
    // Created activity
    if (task.created_at) {
      activities.push({
        id: `${task.id}-created`,
        task_title: task.title,
        user_name: 'System',
        action: 'created',
        new_status: 'OPEN',
        timestamp: task.created_at,
      });
    }

    // Started activity
    if (task.started_at) {
      activities.push({
        id: `${task.id}-started`,
        task_title: task.title,
        user_name: 'Assignee',
        action: 'started',
        old_status: 'OPEN',
        new_status: 'IN_PROGRESS',
        timestamp: task.started_at,
      });
    }

    // Completed activity
    if (task.completed_at && task.status === 'COMPLETED') {
      activities.push({
        id: `${task.id}-completed`,
        task_title: task.title,
        user_name: 'Assignee',
        action: 'completed',
        old_status: 'IN_PROGRESS',
        new_status: 'COMPLETED',
        timestamp: task.completed_at,
      });
    }

    // Cancelled activity
    if (task.status === 'CANCELLED' && task.updated_at) {
      activities.push({
        id: `${task.id}-cancelled`,
        task_title: task.title,
        user_name: 'System',
        action: 'cancelled',
        old_status: 'OPEN',
        new_status: 'CANCELLED',
        timestamp: task.updated_at,
      });
    }
  });

  // Sort by most recent first and take top 15
  const sortedActivities = activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Badge variant="outline" className="text-xs">
            Live Feed
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {sortedActivities.map((activity, index) => {
              const config = actionConfig[activity.action];
              const Icon = config.icon;
              const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });

              return (
                <div 
                  key={activity.id} 
                  className={cn(
                    "relative flex gap-4 animate-fade-in",
                    index === 0 && "animate-pulse"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Icon */}
                  <div className={cn(
                    "relative z-10 flex items-center justify-center w-10 h-10 rounded-full",
                    config.color
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {activity.user_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{activity.user_name}</span>
                        <span className="text-sm text-muted-foreground">{config.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo}
                      </span>
                    </div>

                    <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="font-medium text-sm">{activity.task_title}</p>
                      {activity.old_status && activity.new_status && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.old_status.replace('_', ' ')}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              activity.new_status === 'COMPLETED' && "bg-success/10 text-success border-success/20",
                              activity.new_status === 'IN_PROGRESS' && "bg-info/10 text-info border-info/20",
                              activity.new_status === 'CANCELLED' && "bg-destructive/10 text-destructive border-destructive/20"
                            )}
                          >
                            {activity.new_status.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedActivities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
