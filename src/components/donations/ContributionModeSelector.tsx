import { Button } from '@/components/ui/button';
import { IndianRupee, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContributionModeSelectorProps {
  donationMode: 'MONEY_ONLY' | 'PRODUCT_ONLY' | 'BOTH';
  selectedMode: 'money' | 'product';
  onModeChange: (mode: 'money' | 'product') => void;
  productName?: string;
  moneyAvailable?: boolean;
  productAvailable?: boolean;
}

export const ContributionModeSelector = ({
  donationMode,
  selectedMode,
  onModeChange,
  productName = 'Items',
  moneyAvailable = true,
  productAvailable = true,
}: ContributionModeSelectorProps) => {
  const showMoneyOption = (donationMode === 'MONEY_ONLY' || donationMode === 'BOTH') && moneyAvailable;
  const showProductOption = (donationMode === 'PRODUCT_ONLY' || donationMode === 'BOTH') && productAvailable;

  // If only one option is available, don't show selector
  if (!showMoneyOption && showProductOption) {
    onModeChange('product');
    return null;
  }
  if (showMoneyOption && !showProductOption) {
    onModeChange('money');
    return null;
  }
  if (!showMoneyOption && !showProductOption) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">How would you like to help?</p>
      <div className="grid grid-cols-2 gap-3">
        {showMoneyOption && (
          <Button
            type="button"
            variant={selectedMode === 'money' ? 'default' : 'outline'}
            className={cn(
              "h-auto py-4 flex flex-col gap-2",
              selectedMode === 'money' && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => onModeChange('money')}
          >
            <IndianRupee className="h-6 w-6" />
            <span>Contribute Money</span>
          </Button>
        )}
        {showProductOption && (
          <Button
            type="button"
            variant={selectedMode === 'product' ? 'default' : 'outline'}
            className={cn(
              "h-auto py-4 flex flex-col gap-2",
              selectedMode === 'product' && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => onModeChange('product')}
          >
            <Package className="h-6 w-6" />
            <span>Provide {productName}</span>
          </Button>
        )}
      </div>
    </div>
  );
};
