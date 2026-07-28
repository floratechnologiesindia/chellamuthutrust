import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  RefreshCcw, 
  Bell, 
  Search, 
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Home,
  Loader2
} from 'lucide-react';
import { useRecurringDonationsWithPayments } from '@/hooks/useRecurringDonations';
import { useStaffFoodRecurringPledges } from '@/hooks/useFoodRecurringPledges';
import { useCreateNotification } from '@/hooks/useNotifications';
import { useHomes } from '@/hooks/useHomes';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInMonths, addMonths, isBefore, differenceInDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const TIME_SLOT_LABELS: Record<string, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
  OUTSIDE_FOOD: 'Outside Food',
};

export function RecurringDonationsTracker() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'due_soon'>('all');
  const [homeFilter, setHomeFilter] = useState<string>('all');
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const { data: donations = [], isLoading } = useRecurringDonationsWithPayments();
  const { data: foodPledges = [], isLoading: foodPledgesLoading } = useStaffFoodRecurringPledges(
    homeFilter === 'all' ? null : homeFilter,
  );
  const { data: homes = [] } = useHomes();
  const createNotification = useCreateNotification();

  // Calculate payment progress for each donation
  const donationsWithProgress = donations.map(donation => {
    const startDate = new Date(donation.start_date);
    const today = new Date();
    const endDate = addMonths(startDate, 24);
    
    const totalMonths = differenceInMonths(endDate, startDate) + 1;
    const paidMonths = donation.payments?.length || 0;
    const progressPercent = totalMonths > 0 ? (paidMonths / totalMonths) * 100 : 0;
    
    const isOverdue = donation.next_due_date && isBefore(new Date(donation.next_due_date), today);
    const isDueSoon = donation.next_due_date && !isOverdue && 
      differenceInDays(new Date(donation.next_due_date), today) <= 7;
    
    return {
      ...donation,
      totalMonths,
      paidMonths,
      progressPercent,
      isOverdue,
      isDueSoon,
    };
  });

  // Apply filters
  const filteredDonations = donationsWithProgress.filter(donation => {
    const matchesSearch = 
      donation.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.homes?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'overdue' && donation.isOverdue) ||
      (statusFilter === 'due_soon' && donation.isDueSoon) ||
      (statusFilter === 'active' && donation.status === 'ACTIVE' && !donation.isOverdue && !donation.isDueSoon);
    
    const matchesHome = homeFilter === 'all' || donation.home_id === homeFilter;
    
    return matchesSearch && matchesStatus && matchesHome;
  });

  const handleSendReminder = async (donation: typeof donationsWithProgress[0]) => {
    if (!donation.donor_id) return;
    
    setSendingReminderId(donation.id);
    const channels: string[] = [];
    const failures: string[] = [];

    const reminderMessage = `Dear ${donation.profiles?.name || 'Donor'}, your recurring donation of ₹${donation.amount_pledged.toLocaleString()} to ${donation.homes?.name || 'the home'} is ${donation.isOverdue ? 'overdue' : 'due soon'}. ${donation.next_due_date ? `Next due date: ${format(new Date(donation.next_due_date), 'MMM dd, yyyy')}.` : ''} Please make your payment at your earliest convenience. Thank you for your generous support!`;

    try {
      // 1. In-app notification
      await createNotification.mutateAsync({
        user_id: donation.donor_id,
        type: 'recurring_due_soon' as const,
        title: 'Payment Reminder',
        message: reminderMessage,
      });
      channels.push('In-app');

      // 2. WhatsApp (if phone available)
      if (donation.profiles?.phone) {
        try {
          const { data: waData, error } = await supabase.functions.invoke('send-whatsapp', {
            body: { phone: donation.profiles.phone, message: reminderMessage },
          });
          if (error) {
            failures.push('WhatsApp');
          } else if (waData?.error) {
            const detail = waData.message || 'Unknown error';
            failures.push(`WhatsApp: ${detail}`);
          } else if (waData?.delivery_status === 'template_fallback') {
            channels.push('WhatsApp (template greeting only)');
          } else {
            channels.push('WhatsApp');
          }
        } catch {
          failures.push('WhatsApp');
        }
      } else {
        failures.push('WhatsApp (no phone)');
      }

      // 3. Email (if email available)
      if (donation.profiles?.email) {
        try {
          const { error } = await supabase.functions.invoke('send-donor-report', {
            body: {
              donor_email: donation.profiles.email,
              donor_name: donation.profiles.name,
              subject: `Payment Reminder – ₹${donation.amount_pledged.toLocaleString()}/mo to ${donation.homes?.name || 'Project'}`,
              message_body: reminderMessage,
            },
          });
          if (error) throw error;
          channels.push('Email');
        } catch {
          failures.push('Email');
        }
      } else {
        failures.push('Email (no email)');
      }

      const description = channels.length > 0
        ? `Sent via ${channels.join(', ')}${failures.length > 0 ? `. Failed: ${failures.join(', ')}` : ''}`
        : 'All channels failed';

      toast({
        title: channels.length > 0 ? 'Reminder Sent' : 'Reminder Failed',
        description,
        variant: channels.length > 0 ? 'default' : 'destructive',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setSendingReminderId(null);
    }
  };

  // Stats
  const totalActive = donationsWithProgress.filter(d => d.status === 'ACTIVE').length;
  const totalOverdue = donationsWithProgress.filter(d => d.isOverdue).length;
  const totalDueSoon = donationsWithProgress.filter(d => d.isDueSoon).length;
  const monthlyCommitment = donationsWithProgress
    .filter(d => d.status === 'ACTIVE')
    .reduce((sum, d) => sum + d.amount_pledged, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className="h-5 w-5" />
          Recurring Donations Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
            <p className="text-2xl font-bold text-success">{totalActive}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-center">
            <p className="text-2xl font-bold text-warning">{totalDueSoon}</p>
            <p className="text-xs text-muted-foreground">Due Soon</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-2xl font-bold text-destructive">{totalOverdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-2xl font-bold text-primary">₹{monthlyCommitment.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Monthly</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search donor or home..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">On Track</SelectItem>
              <SelectItem value="due_soon">Due Soon</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={homeFilter} onValueChange={setHomeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {homes.map(home => (
                <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Donations List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : filteredDonations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No recurring donations found</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredDonations.map((donation) => (
              <div 
                key={donation.id} 
                className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{donation.profiles?.name || 'Unknown Donor'}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Home className="h-3 w-3" />
                        <span>{donation.homes?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">₹{donation.amount_pledged.toLocaleString()}/mo</p>
                    {donation.isOverdue ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    ) : donation.isDueSoon ? (
                      <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Due Soon
                      </Badge>
                    ) : donation.status === 'ACTIVE' ? (
                      <Badge className="bg-success/20 text-success border-success/30 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        On Track
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {donation.status}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{donation.paidMonths}/{donation.totalMonths} payments</span>
                    <span>{Math.round(donation.progressPercent)}%</span>
                  </div>
                  <Progress value={donation.progressPercent} className="h-1.5" />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {donation.next_due_date && (
                      <>Next: {format(new Date(donation.next_due_date), 'MMM dd, yyyy')}</>
                    )}
                  </span>
                  {(donation.isOverdue || donation.isDueSoon) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendReminder(donation)}
                      disabled={sendingReminderId === donation.id}
                    >
                      {sendingReminderId === donation.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Bell className="h-3 w-3 mr-1" />
                      )}
                      Send Reminder
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Food recurring pledges */}
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Home className="h-4 w-4" />
            Food recurring pledges
          </h3>
          {foodPledgesLoading ? (
            <Skeleton className="h-20" />
          ) : foodPledges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No food recurring pledges yet</p>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {foodPledges
                .filter((p) => {
                  const matchesSearch =
                    !searchTerm ||
                    p.donor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.homes?.name?.toLowerCase().includes(searchTerm.toLowerCase());
                  const overdue =
                    p.status === 'ACTIVE' &&
                    p.next_due_date &&
                    isBefore(new Date(p.next_due_date), new Date());
                  const dueSoon =
                    p.status === 'ACTIVE' &&
                    p.next_due_date &&
                    !overdue &&
                    differenceInDays(new Date(p.next_due_date), new Date()) <= 7;
                  const matchesStatus =
                    statusFilter === 'all' ||
                    (statusFilter === 'overdue' && overdue) ||
                    (statusFilter === 'due_soon' && dueSoon) ||
                    (statusFilter === 'active' && p.status === 'ACTIVE' && !overdue && !dueSoon);
                  return matchesSearch && matchesStatus;
                })
                .map((pledge) => {
                  const overdue =
                    pledge.status === 'ACTIVE' &&
                    pledge.next_due_date &&
                    isBefore(new Date(pledge.next_due_date), new Date());
                  return (
                    <div
                      key={pledge.id}
                      className="p-3 rounded-lg border border-border flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {pledge.donor_name || 'Donor'} · {pledge.homes?.name || 'Project'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pledge.frequency === 'annual' ? 'Annual' : 'Monthly'} ·{' '}
                          {TIME_SLOT_LABELS[pledge.time_slot] || pledge.time_slot} · ₹
                          {pledge.amount.toLocaleString()} · {pledge.status}
                          {pledge.next_due_date
                            ? ` · Next ${format(new Date(pledge.next_due_date), 'MMM dd, yyyy')}`
                            : ''}
                          {overdue ? ' (overdue)' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
