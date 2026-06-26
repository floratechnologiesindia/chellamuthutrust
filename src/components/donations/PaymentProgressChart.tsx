import { useMemo } from 'react';
import { format, addMonths, differenceInMonths, isBefore, isAfter, isSameMonth } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import { DonationPayment } from '@/hooks/useDonations';

interface PaymentProgressChartProps {
  startDate: string;
  endDate?: string | null;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  payments: DonationPayment[];
  monthlyAmount: number;
}

interface MonthStatus {
  date: Date;
  status: 'paid' | 'due' | 'overdue' | 'future';
  payment?: DonationPayment;
}

export function PaymentProgressChart({
  startDate,
  endDate,
  frequency,
  payments,
  monthlyAmount,
}: PaymentProgressChartProps) {
  const monthStatuses = useMemo(() => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : addMonths(start, 24); // Default 2 years
    const today = new Date();
    
    const months: MonthStatus[] = [];
    let currentDate = new Date(start);
    
    // Calculate interval based on frequency
    const intervalMonths = frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1;
    
    while (isBefore(currentDate, end) || isSameMonth(currentDate, end)) {
      // Find if this month has a payment
      const payment = payments.find(p => {
        const paymentDate = new Date(p.payment_date);
        if (frequency === 'monthly') {
          return isSameMonth(paymentDate, currentDate);
        }
        // For quarterly/yearly, check if payment is within the period
        const periodEnd = addMonths(currentDate, intervalMonths);
        return !isBefore(paymentDate, currentDate) && isBefore(paymentDate, periodEnd);
      });
      
      let status: MonthStatus['status'];
      if (payment) {
        status = 'paid';
      } else if (isAfter(currentDate, today)) {
        status = 'future';
      } else if (isSameMonth(currentDate, today)) {
        status = 'due';
      } else {
        status = 'overdue';
      }
      
      months.push({ date: new Date(currentDate), status, payment });
      currentDate = addMonths(currentDate, intervalMonths);
    }
    
    return months;
  }, [startDate, endDate, frequency, payments]);

  const paidCount = monthStatuses.filter(m => m.status === 'paid').length;
  const totalCount = monthStatuses.length;
  const progressPercent = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = totalCount * monthlyAmount;

  const getStatusIcon = (status: MonthStatus['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case 'due':
        return <Clock className="h-3 w-3 text-warning" />;
      case 'overdue':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Circle className="h-3 w-3 text-muted-foreground/40" />;
    }
  };

  const getStatusColor = (status: MonthStatus['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-success/20 border-success/30 text-success';
      case 'due':
        return 'bg-warning/20 border-warning/30 text-warning';
      case 'overdue':
        return 'bg-destructive/20 border-destructive/30 text-destructive';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Progress: <span className="font-medium text-foreground">{paidCount}/{totalCount}</span> payments ({Math.round(progressPercent)}%)
        </span>
        <span className="text-muted-foreground">
          ₹{totalPaid.toLocaleString()} / ₹{totalExpected.toLocaleString()}
        </span>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} className="h-2" />

      {/* Month Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
        {monthStatuses.map((month, idx) => (
          <div
            key={idx}
            className={cn(
              "flex flex-col items-center p-1.5 rounded border text-xs transition-colors",
              getStatusColor(month.status)
            )}
            title={`${format(month.date, 'MMM yyyy')} - ${month.status.toUpperCase()}`}
          >
            {getStatusIcon(month.status)}
            <span className="mt-0.5 text-[10px] font-medium">
              {format(month.date, 'MMM')}
            </span>
            <span className="text-[9px] opacity-70">
              {format(month.date, 'yy')}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-success" />
          <span className="text-muted-foreground">Paid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-warning" />
          <span className="text-muted-foreground">Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-muted-foreground">Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="h-3 w-3 text-muted-foreground/40" />
          <span className="text-muted-foreground">Future</span>
        </div>
      </div>
    </div>
  );
}