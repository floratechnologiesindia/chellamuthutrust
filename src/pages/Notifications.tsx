import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DonorPortalSubpage } from '@/components/donor/DonorPortalSubpage';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  CreditCard,
  ListTodo,
  Megaphone,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  Notification,
} from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { isDonorPortal } from '@/lib/portal';
import { receiptPathFromDedupeKey } from '@/lib/donorReceipt';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'payments', label: 'Payments' },
  { id: 'tasks', label: 'Tasks' },
] as const;

type FilterTab = (typeof FILTER_TABS)[number]['id'];

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const donorPortal = isDonorPortal();

  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_successful':
      case 'receipt_ready':
      case 'recurring_received':
      case 'need_sponsored':
        return <CreditCard className="h-5 w-5" />;
      case 'payment_failed':
      case 'balance_due':
      case 'recurring_overdue':
        return <CreditCard className="h-5 w-5" />;
      case 'recurring_payment_due':
      case 'donation_reminder':
      case 'recurring_due_soon':
        return <CreditCard className="h-5 w-5" />;
      case 'new_need_posted':
      case 'need_fulfilled':
        return <Megaphone className="h-5 w-5" />;
      case 'pay_later_received':
      case 'booking_confirmed':
      case 'booking_declined':
      case 'calendar_reminder':
      case 'open_slots_digest':
        return <Bell className="h-5 w-5" />;
      case 'work_completed':
      case 'milestone':
      case 'welcome':
      case 'anniversary':
        return <Bell className="h-5 w-5" />;
      case 'tax_summary':
      case 'account_security':
        return <Bell className="h-5 w-5" />;
      case 'task_assigned':
      case 'task_due':
        return <ListTodo className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment_failed':
      case 'balance_due':
      case 'recurring_overdue':
      case 'booking_declined':
        return 'bg-destructive/10 text-destructive';
      case 'payment_successful':
      case 'booking_confirmed':
      case 'need_fulfilled':
      case 'milestone':
      case 'welcome':
        return 'bg-success/10 text-success';
      case 'recurring_payment_due':
      case 'donation_reminder':
      case 'recurring_due_soon':
        return 'bg-warning/10 text-warning';
      case 'new_need_posted':
      case 'need_sponsored':
        return 'bg-primary/10 text-primary';
      case 'task_assigned':
      case 'task_due':
        return 'bg-accent/10 text-accent';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getDonorIconClass = (type: string) => {
    switch (type) {
      case 'payment_failed':
      case 'balance_due':
      case 'recurring_overdue':
      case 'booking_declined':
        return 'donor-notification-icon-danger';
      case 'payment_successful':
      case 'booking_confirmed':
      case 'need_fulfilled':
      case 'milestone':
      case 'welcome':
        return 'donor-notification-icon-success';
      case 'recurring_payment_due':
      case 'donation_reminder':
      case 'recurring_due_soon':
        return 'donor-notification-icon-warning';
      case 'new_need_posted':
      case 'need_sponsored':
        return 'donor-notification-icon-info';
      default:
        return 'donor-notification-icon-muted';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment_successful: 'Payment',
      payment_failed: 'Payment',
      balance_due: 'Balance Due',
      pay_later_received: 'Booking',
      booking_confirmed: 'Booking',
      booking_declined: 'Booking',
      need_sponsored: 'Sponsorship',
      need_fulfilled: 'Fulfilled',
      new_need_posted: 'New Need',
      work_completed: 'Impact',
      receipt_ready: 'Receipt',
      milestone: 'Milestone',
      recurring_due_soon: 'Recurring',
      recurring_overdue: 'Overdue',
      recurring_received: 'Recurring',
      recurring_ended: 'Recurring',
      calendar_reminder: 'Reminder',
      open_slots_digest: 'Calendar',
      anniversary: 'Anniversary',
      tax_summary: 'Tax Summary',
      account_security: 'Security',
      welcome: 'Welcome',
      donation_reminder: 'Reminder',
      recurring_payment_due: 'Payment',
      task_assigned: 'Task',
      task_due: 'Task Due',
    };
    return labels[type] || 'Notification';
  };

  const markAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read.',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await markAllAsReadMutation.mutateAsync(user.id);
      toast({
        title: 'All notifications marked as read',
        description: `${unreadCount} notifications marked as read.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read.',
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteNotificationMutation.mutateAsync(id);
      toast({ title: 'Notification deleted' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete notification.',
        variant: 'destructive',
      });
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.is_read;
    if (activeTab === 'payments') {
      return [
        'recurring_payment_due',
        'donation_reminder',
        'payment_successful',
        'payment_failed',
        'balance_due',
        'receipt_ready',
        'recurring_due_soon',
        'recurring_overdue',
        'recurring_received',
      ].includes(n.type);
    }
    if (activeTab === 'tasks') return n.type === 'task_assigned' || n.type === 'task_due';
    return true;
  });

  const handleDonorNotificationActivate = (notification: Notification) => {
    if (!notification.is_read) {
      void markAsRead(notification.id);
    }
    if (notification.type === 'receipt_ready') {
      const receiptPath = receiptPathFromDedupeKey(notification.dedupe_key);
      if (receiptPath) {
        navigate(receiptPath);
      }
    }
  };

  const renderDonorNotificationCard = (notification: Notification) => (
    <div
      key={notification.id}
      className={cn(
        'donor-card donor-notification-card p-4',
        !notification.is_read && 'donor-notification-unread',
      )}
      onClick={() => handleDonorNotificationActivate(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleDonorNotificationActivate(notification);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-4">
        <div className={cn('donor-notification-icon', getDonorIconClass(notification.type))}>
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3
                  className={cn(
                    'donor-notification-title',
                    !notification.is_read && 'donor-notification-title-unread',
                  )}
                >
                  {notification.title}
                </h3>
                <span className="donor-notification-badge">{getTypeLabel(notification.type)}</span>
              </div>
              <p className="donor-notification-message">{notification.message}</p>
              <div className="donor-notification-time flex items-center gap-1.5 mt-2">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {!notification.is_read && (
                <button
                  type="button"
                  className="donor-notification-action"
                  disabled={markAsReadMutation.isPending}
                  aria-label="Mark as read"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                >
                  {markAsReadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                className="donor-notification-action donor-notification-action-danger"
                disabled={deleteNotificationMutation.isPending}
                aria-label="Delete notification"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                {deleteNotificationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppNotificationCard = (notification: Notification) => (
    <Card
      key={notification.id}
      className={cn(
        'transition-all hover:shadow-md cursor-pointer',
        !notification.is_read && 'border-l-4 border-l-primary bg-primary/5',
      )}
      onClick={() => !notification.is_read && markAsRead(notification.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
              getNotificationColor(notification.type),
            )}
          >
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn('font-medium', !notification.is_read && 'font-semibold')}>
                    {notification.title}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(notification.type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={markAsReadMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    {markAsReadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={deleteNotificationMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  {deleteNotificationMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    if (donorPortal) {
      return (
        <MainLayout>
          <DonorPortalSubpage title="Notifications">
            <div className="donor-container py-8 max-w-3xl mx-auto space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded" />
              ))}
            </div>
          </DonorPortalSubpage>
        </MainLayout>
      );
    }

    return (
      <MainLayout>
        <div className="container py-8 max-w-3xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <Skeleton className="h-10 w-full mb-6" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  const subtitle =
    unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!';

  if (donorPortal) {
    return (
      <MainLayout>
        <DonorPortalSubpage title="Notifications" subtitle={subtitle}>
          <div className="donor-container py-8 max-w-3xl mx-auto">
            {unreadCount > 0 && (
              <div className="flex justify-end mb-6">
                <button
                  type="button"
                  className="donor-btn donor-btn-outline inline-flex items-center gap-2"
                  onClick={markAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                >
                  {markAllAsReadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Mark all as read
                </button>
              </div>
            )}

            <div className="donor-notification-filters mb-6">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'donor-btn',
                    activeTab === tab.id ? 'donor-btn-primary' : 'donor-btn-outline',
                  )}
                >
                  {tab.label}
                  {tab.id === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="donor-card donor-notification-empty">
                  <BellOff className="h-12 w-12 mx-auto text-[#ccc]" />
                  <h3>No notifications</h3>
                  <p>
                    {activeTab === 'unread'
                      ? "You're all caught up!"
                      : 'No notifications in this category'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map(renderDonorNotificationCard)
              )}
            </div>
          </div>
        </DonorPortalSubpage>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Bell className="h-8 w-8" />
              Notifications
            </h1>
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead} disabled={markAllAsReadMutation.isPending}>
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Mark all as read
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BellOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'unread'
                      ? "You're all caught up!"
                      : 'No notifications in this category'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map(renderAppNotificationCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Notifications;
