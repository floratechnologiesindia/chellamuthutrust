import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Home, 
  Calendar, 
  Heart, 
  CreditCard,
  Clock,
  CheckCircle2,
  RefreshCcw,
  MapPin
} from 'lucide-react';
import { useDonation, useDonationPayments } from '@/hooks/useDonations';
import { PaymentProgressChart } from '@/components/donations/PaymentProgressChart';
import { RecordPaymentDialog } from '@/components/donations/RecordPaymentDialog';
import { format } from 'date-fns';

const DonationDetail = () => {
  const { donationId } = useParams<{ donationId: string }>();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  const { data: donation, isLoading: loadingDonation } = useDonation(donationId || null);
  const { data: payments = [], isLoading: loadingPayments } = useDonationPayments(donationId || null);

  const isRecurring = donation?.sponsorship_type === 'RECURRING';
  const home = donation?.homes;
  const need = donation?.needs;

  const getStatusBadge = (status: string | null) => {
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

  if (loadingDonation) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!donation) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-medium mb-2">Donation not found</h3>
              <p className="text-muted-foreground mb-4">This donation doesn't exist or you don't have access to it.</p>
              <Button asChild>
                <Link to="/donations">Back to My Donations</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isDue = donation.status === 'OVERDUE' || 
    (donation.next_due_date && new Date(donation.next_due_date) <= new Date());

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/donations">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Donation Details</h1>
            <p className="text-muted-foreground">
              {isRecurring ? 'Recurring' : 'One-time'} donation to {home?.name}
            </p>
          </div>
          {getStatusBadge(donation.status)}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Home Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {home?.image_url ? (
                      <img src={home.image_url} alt={home.name} className="h-full w-full object-cover" />
                    ) : (
                      <Home className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-foreground">{home?.name}</h2>
                    <div className="flex items-center gap-1 text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{home?.city}</span>
                    </div>
                    {need?.categories && (
                      <Badge variant="outline" className="mt-2">
                        {need.categories.label}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">₹{donation.amount_pledged.toLocaleString()}</p>
                    {isRecurring && <p className="text-sm text-muted-foreground">per month</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Progress (for recurring) */}
            {isRecurring && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCcw className="h-5 w-5" />
                    Payment Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingPayments ? (
                    <Skeleton className="h-32" />
                  ) : (
                    <PaymentProgressChart
                      startDate={donation.start_date}
                      endDate={null} // Could add end date from need if available
                      frequency="monthly"
                      payments={payments}
                      monthlyAmount={donation.amount_pledged}
                    />
                  )}
                  
                  {isDue && donation.status !== 'CANCELLED' && (
                    <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">Payment Due</p>
                          <p className="text-sm text-muted-foreground">
                            {donation.next_due_date 
                              ? `Due on ${format(new Date(donation.next_due_date), 'MMMM dd, yyyy')}`
                              : 'Payment is due'}
                          </p>
                        </div>
                        <Button onClick={() => setPaymentDialogOpen(true)}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPayments ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div 
                        key={payment.id} 
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              ₹{payment.amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.payment_date), 'MMMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        {payment.payment_reference && (
                          <span className="text-xs text-muted-foreground">
                            Ref: {payment.payment_reference}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Donation Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Donation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="outline">
                    {isRecurring ? 'Recurring' : 'One-Time'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Start Date</span>
                  <span className="text-sm font-medium">
                    {format(new Date(donation.start_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                {donation.last_paid_date && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Paid</span>
                      <span className="text-sm font-medium">
                        {format(new Date(donation.last_paid_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </>
                )}
                {isRecurring && donation.next_due_date && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Next Due</span>
                      <span className="text-sm font-medium">
                        {format(new Date(donation.next_due_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </>
                )}
                {donation.occasion_type && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Occasion</span>
                      <Badge variant="secondary" className="capitalize">
                        <Heart className="h-3 w-3 mr-1" />
                        {donation.occasion_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </>
                )}
                {donation.occasion_note && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">Note</span>
                      <p className="text-sm italic mt-1">"{donation.occasion_note}"</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Paid</span>
                  <span className="text-lg font-bold text-success">
                    ₹{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payments Made</span>
                  <span className="text-sm font-medium">{payments.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment Dialog */}
        {isRecurring && (
          <RecordPaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            donationId={donation.id}
            amount={donation.amount_pledged}
            nextDueDate={donation.next_due_date}
            homeName={home?.name || 'Home'}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default DonationDetail;