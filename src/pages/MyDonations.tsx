import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Heart, 
  Home, 
  Download, 
  RefreshCcw, 
  Clock, 
  CheckCircle2,
  Pause,
  Play,
  X,
  Loader2,
  CreditCard,
  Eye,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { useDonations, useUpdateDonation, useDonationPayments, DonationWithRelations } from '@/hooks/useDonations';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/contexts/AuthContext';
import { format, isBefore } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { RecordPaymentDialog } from '@/components/donations/RecordPaymentDialog';
import type { Database } from '@/integrations/supabase/types';

type DonationStatus = Database['public']['Enums']['donation_status'];

const MyDonations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('one-time');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<DonationWithRelations | null>(null);

  // Fetch donations from Supabase
  const { data: donations = [], isLoading } = useDonations(user?.id);
  const updateDonation = useUpdateDonation();
  const { initiatePayment, isProcessing } = useRazorpay();

  // Filter donations by type
  const oneTimeDonations = donations.filter(d => d.sponsorship_type === 'ONE_TIME');
  const recurringDonations = donations.filter(d => d.sponsorship_type === 'RECURRING');

  const getStatusBadge = (status: DonationStatus | null) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-success/20 text-success border-success/30">Active</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Completed</Badge>;
      case 'PLEDGED':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Pledged</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-muted text-muted-foreground">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getOccasionLabel = (type?: string | null) => {
    switch (type) {
      case 'birthday': return 'Birthday Celebration';
      case 'ancestor_remembrance': return 'In Memory';
      case 'festival': return 'Festival';
      default: return 'Donation';
    }
  };

  const handlePauseDonation = async (donationId: string) => {
    try {
      await updateDonation.mutateAsync({
        id: donationId,
        status: 'PLEDGED', // Using PLEDGED as paused state
      });
      toast({
        title: "Donation Paused",
        description: "Your recurring donation has been paused. You can resume it anytime.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause donation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResumeDonation = async (donationId: string) => {
    try {
      await updateDonation.mutateAsync({
        id: donationId,
        status: 'ACTIVE',
      });
      toast({
        title: "Donation Resumed",
        description: "Your recurring donation has been resumed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resume donation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelDonation = async (donationId: string) => {
    try {
      await updateDonation.mutateAsync({
        id: donationId,
        status: 'CANCELLED',
      });
      toast({
        title: "Donation Cancelled",
        description: "Your recurring donation has been cancelled.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel donation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (donations.length === 0) {
      toast({
        title: "No Data",
        description: "No donations to export.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Home', 'Category', 'Type', 'Amount', 'Status', 'Occasion', 'Note'];
    const rows = donations.map(d => [
      format(new Date(d.start_date), 'yyyy-MM-dd'),
      d.homes?.name || '',
      d.needs?.categories?.label || '',
      d.sponsorship_type,
      d.amount_pledged.toString(),
      d.status || '',
      d.occasion_type || '',
      d.occasion_note || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `my-donations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: "Export Complete",
      description: "Your donation history has been downloaded.",
    });
  };

  const totalOneTime = oneTimeDonations.reduce((sum, d) => sum + d.amount_pledged, 0);
  const totalRecurring = recurringDonations.reduce((sum, d) => sum + d.amount_pledged, 0);

  const renderDonationCard = (donation: DonationWithRelations, isRecurring: boolean) => {
    const home = donation.homes;
    const need = donation.needs;
    const category = need?.categories;
    const isDue = donation.status === 'OVERDUE' || 
      (donation.next_due_date && isBefore(new Date(donation.next_due_date), new Date()));

    return (
      <Card key={donation.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {home?.image_url ? (
                <img src={home.image_url} alt={home.name} className="w-full h-full object-cover" />
              ) : (
                <Home className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{home?.name || 'Unknown Home'}</h3>
                  <p className="text-sm text-muted-foreground">{category?.label || 'General'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isDue && isRecurring && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Payment Due
                    </Badge>
                  )}
                  {getStatusBadge(donation.status)}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {isRecurring ? 'Started: ' : ''}{format(new Date(donation.start_date), 'MMM dd, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {getOccasionLabel(donation.occasion_type)}
                </span>
              </div>
              {donation.occasion_note && (
                <p className="text-sm italic mt-2">"{donation.occasion_note}"</p>
              )}
              
              {/* Recurring-specific info with progress */}
              {isRecurring && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex flex-wrap gap-4">
                    {donation.next_due_date && (
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${isDue ? 'text-destructive' : 'text-warning'}`} />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Next Due:</span>{' '}
                          <span className={`font-medium ${isDue ? 'text-destructive' : ''}`}>
                            {format(new Date(donation.next_due_date), 'MMM dd, yyyy')}
                          </span>
                        </span>
                      </div>
                    )}
                    {donation.last_paid_date && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Last Paid:</span>{' '}
                          <span className="font-medium">{format(new Date(donation.last_paid_date), 'MMM dd, yyyy')}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Pay Now Button for due donations */}
                  {isDue && donation.status !== 'CANCELLED' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        disabled={isProcessing}
                        onClick={(e) => {
                          e.stopPropagation();
                          initiatePayment({
                            amount: donation.amount_pledged,
                            donationId: donation.id,
                            donorName: user?.name || user?.email || 'Donor',
                            donorEmail: user?.email || '',
                            donorPhone: user?.phone || '',
                            description: `Payment for ${donation.homes?.name || 'Home'}`,
                            onSuccess: () => {
                              toast({
                                title: "Payment Successful! 🎉",
                                description: `₹${donation.amount_pledged.toLocaleString()} paid for ${donation.homes?.name || 'Home'}.`,
                              });
                            },
                            onFailure: (error) => {
                              if (error !== 'Payment cancelled by user') {
                                toast({
                                  title: "Payment Failed",
                                  description: error,
                                  variant: "destructive",
                                });
                              }
                            },
                          });
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Online
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDonation(donation);
                          setPaymentDialogOpen(true);
                        }}
                      >
                        <Wallet className="h-4 w-4 mr-1" />
                        Manual
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">₹{donation.amount_pledged.toLocaleString()}</p>
                {isRecurring && <p className="text-xs text-muted-foreground">per month</p>}
              </div>
              
              {/* View Details Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/donations/${donation.id}`)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
              
              {/* Actions for recurring donations */}
              {isRecurring && donation.status !== 'CANCELLED' && donation.status !== 'COMPLETED' && (
                <div className="flex gap-2">
                  {donation.status === 'ACTIVE' ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={updateDonation.isPending}>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Pause Recurring Donation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your donation will be paused until you resume it. No payments will be collected during this time.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handlePauseDonation(donation.id)}>
                            Pause Donation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleResumeDonation(donation.id)}
                      disabled={updateDonation.isPending}
                    >
                      {updateDonation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Resume
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={updateDonation.isPending}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Recurring Donation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently cancel your recurring donation. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Donation</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleCancelDonation(donation.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel Donation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-10 w-80 mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">My Donations</h1>
            <p className="text-muted-foreground mt-1">Track and manage your contributions</p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={donations.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Contributed</p>
                  <p className="text-2xl font-bold">₹{(totalOneTime + totalRecurring).toLocaleString()}</p>
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
                  <p className="text-sm text-muted-foreground">One-Time Donations</p>
                  <p className="text-2xl font-bold">{oneTimeDonations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <RefreshCcw className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Recurring</p>
                  <p className="text-2xl font-bold">{recurringDonations.filter(d => d.status === 'ACTIVE').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donations Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="one-time">One-Time ({oneTimeDonations.length})</TabsTrigger>
            <TabsTrigger value="recurring">Recurring ({recurringDonations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="one-time" className="space-y-4">
            {oneTimeDonations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No one-time donations yet</h3>
                  <p className="text-muted-foreground mb-4">Start making a difference by sponsoring a need</p>
                  <Button asChild>
                    <Link to="/sponsor">Browse Needs</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              oneTimeDonations.map(donation => renderDonationCard(donation, false))
            )}
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4">
            {recurringDonations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCcw className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No recurring donations yet</h3>
                  <p className="text-muted-foreground mb-4">Set up regular contributions to make a lasting impact</p>
                  <Button asChild>
                    <Link to="/sponsor">Browse Needs</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              recurringDonations.map(donation => renderDonationCard(donation, true))
            )}
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        {selectedDonation && (
          <RecordPaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            donationId={selectedDonation.id}
            amount={selectedDonation.amount_pledged}
            nextDueDate={selectedDonation.next_due_date}
            homeName={selectedDonation.homes?.name || 'Home'}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default MyDonations;
