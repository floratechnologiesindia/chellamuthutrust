import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRecordPayment, useUpdateDonation } from '@/hooks/useDonations';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, CreditCard, Wallet } from 'lucide-react';
import { addMonths } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

const sendPaymentConfirmationEmail = async (
  donorEmail: string,
  donorName: string,
  amount: number,
  homeName: string,
  paymentDate: string,
  nextDueDate?: string | null,
) => {
  try {
    const nextDueText = nextDueDate
      ? `\n\nYour next payment is due on ${format(new Date(nextDueDate), 'MMMM dd, yyyy')}.`
      : '';

    await supabase.functions.invoke('send-donor-report', {
      body: {
        donor_email: donorEmail,
        donor_name: donorName,
        subject: `Payment Confirmation - ₹${amount.toLocaleString()} to ${homeName}`,
        message_body: `Your payment of ₹${amount.toLocaleString()} to ${homeName} has been successfully recorded on ${format(new Date(paymentDate), 'MMMM dd, yyyy')}.\n\nThank you for your generous contribution!${nextDueText}\n\nWarm regards,\nMS Chellamuthu Trust`,
      },
    });
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
  }
};

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donationId: string;
  amount: number;
  nextDueDate: string | null;
  homeName: string;
  frequency?: 'monthly' | 'quarterly' | 'yearly';
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  donationId,
  amount,
  nextDueDate,
  homeName,
  frequency = 'monthly',
}: RecordPaymentDialogProps) {
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentTab, setPaymentTab] = useState<string>('online');

  const { user } = useAuth();
  const recordPayment = useRecordPayment();
  const updateDonation = useUpdateDonation();
  const { initiatePayment, isProcessing } = useRazorpay();

  const handleAdvanceDueDate = async () => {
    const currentDue = nextDueDate ? new Date(nextDueDate) : new Date();
    const intervalMonths = frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1;
    const newNextDueDate = addMonths(currentDue, intervalMonths);

    await updateDonation.mutateAsync({
      id: donationId,
      next_due_date: format(newNextDueDate, 'yyyy-MM-dd'),
      last_paid_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'ACTIVE',
    });
  };

  const handlePayOnline = () => {
    initiatePayment({
      amount,
      donationId,
      donorName: user?.name || 'Donor',
      donorEmail: user?.email || '',
      donorPhone: user?.phone || '',
      description: `Payment for ${homeName}`,
      onSuccess: async () => {
        await handleAdvanceDueDate();
        setIsSuccess(true);
        toast({
          title: "Payment Successful! 🎉",
          description: `₹${amount.toLocaleString()} paid online for ${homeName}.`,
        });

        // Fire-and-forget email
        const currentDue = nextDueDate ? new Date(nextDueDate) : new Date();
        const intervalMonths = frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1;
        const newNext = format(addMonths(currentDue, intervalMonths), 'yyyy-MM-dd');
        sendPaymentConfirmationEmail(
          user?.email || '',
          user?.name || 'Donor',
          amount,
          homeName,
          format(new Date(), 'yyyy-MM-dd'),
          newNext,
        );

        setTimeout(() => {
          setIsSuccess(false);
          onOpenChange(false);
        }, 2000);
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
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await recordPayment.mutateAsync({
        donation_id: donationId,
        amount,
        payment_date: paymentDate,
        payment_reference: paymentReference || null,
        notes: notes || null,
      });

      await handleAdvanceDueDate();

      // Fire-and-forget email
      const currentDue = nextDueDate ? new Date(nextDueDate) : new Date();
      const intervalMonths = frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1;
      const newNext = format(addMonths(currentDue, intervalMonths), 'yyyy-MM-dd');
      sendPaymentConfirmationEmail(
        user?.email || '',
        user?.name || 'Donor',
        amount,
        homeName,
        paymentDate,
        newNext,
      );

      setIsSuccess(true);
      toast({
        title: "Payment Recorded Successfully! 🎉",
        description: `Thank you for your contribution of ₹${amount.toLocaleString()} to ${homeName}.`,
      });

      setTimeout(() => {
        setIsSuccess(false);
        setPaymentReference('');
        setNotes('');
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Could not record payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mb-4 animate-in zoom-in">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">
              Your payment of ₹{amount.toLocaleString()} has been recorded.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record your recurring payment for {homeName}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount Due</span>
            <span className="text-2xl font-bold text-primary">₹{amount.toLocaleString()}</span>
          </div>
          {nextDueDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Due: {format(new Date(nextDueDate), 'MMMM dd, yyyy')}
            </p>
          )}
        </div>

        <Tabs value={paymentTab} onValueChange={setPaymentTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="online" className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Pay Online
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Record Manually
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Pay securely using UPI, Debit Card, Credit Card, or Net Banking via Razorpay.
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={handlePayOnline}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{amount.toLocaleString()} Online
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleSubmitManual} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
                <Input
                  id="paymentReference"
                  placeholder="Transaction ID, UPI Ref, etc."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={recordPayment.isPending || updateDonation.isPending}>
                  {(recordPayment.isPending || updateDonation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
