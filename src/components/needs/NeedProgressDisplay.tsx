import { Progress } from '@/components/ui/progress';
import { IndianRupee, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NeedProgressDisplayProps {
  donationMode: 'MONEY_ONLY' | 'PRODUCT_ONLY' | 'BOTH';
  requiredAmount?: number;
  collectedAmount?: number;
  requiredProductQty?: number;
  fulfilledProductQty?: number;
  productName?: string;
  productUnit?: string;
  compact?: boolean;
}

export const NeedProgressDisplay = ({
  donationMode,
  requiredAmount = 0,
  collectedAmount = 0,
  requiredProductQty = 0,
  fulfilledProductQty = 0,
  productName = 'items',
  productUnit = 'pieces',
  compact = false,
}: NeedProgressDisplayProps) => {
  const moneyProgress = requiredAmount > 0 ? (collectedAmount / requiredAmount) * 100 : 0;
  const productProgress = requiredProductQty > 0 ? (fulfilledProductQty / requiredProductQty) * 100 : 0;
  
  const pendingAmount = Math.max(0, requiredAmount - collectedAmount);
  const pendingProducts = Math.max(0, requiredProductQty - fulfilledProductQty);

  const showMoney = donationMode === 'MONEY_ONLY' || donationMode === 'BOTH';
  const showProduct = donationMode === 'PRODUCT_ONLY' || donationMode === 'BOTH';

  if (compact) {
    return (
      <div className="space-y-2">
        {showMoney && requiredAmount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <IndianRupee className="h-3 w-3" /> Money
              </span>
              <span className="font-medium">
                ₹{collectedAmount.toLocaleString()}/₹{requiredAmount.toLocaleString()}
              </span>
            </div>
            <Progress value={moneyProgress} className="h-1.5" />
          </div>
        )}
        {showProduct && requiredProductQty > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Package className="h-3 w-3" /> {productName}
              </span>
              <span className="font-medium">
                {fulfilledProductQty}/{requiredProductQty} {productUnit}
              </span>
            </div>
            <Progress value={productProgress} className="h-1.5" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showMoney && requiredAmount > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <IndianRupee className="h-4 w-4 text-primary" />
              Monetary Support
            </span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              moneyProgress >= 100 ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
            )}>
              {Math.round(moneyProgress)}% funded
            </span>
          </div>
          <Progress value={moneyProgress} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Collected: <span className="text-foreground font-medium">₹{collectedAmount.toLocaleString()}</span>
            </span>
            <span className="text-muted-foreground">
              Pending: <span className="text-warning font-medium">₹{pendingAmount.toLocaleString()}</span>
            </span>
          </div>
        </div>
      )}

      {showProduct && requiredProductQty > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4 text-primary" />
              {productName} Support
            </span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              productProgress >= 100 ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
            )}>
              {Math.round(productProgress)}% fulfilled
            </span>
          </div>
          <Progress value={productProgress} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Fulfilled: <span className="text-foreground font-medium">{fulfilledProductQty} {productUnit}</span>
            </span>
            <span className="text-muted-foreground">
              Pending: <span className="text-warning font-medium">{pendingProducts} {productUnit}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
