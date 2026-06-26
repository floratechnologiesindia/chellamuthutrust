import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Tag } from 'lucide-react';
import { type DonorWithStats } from '@/hooks/useDonors';
import { useCategories } from '@/hooks/useCategories';
import { useTrusts } from '@/hooks/useHomes';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { cn } from '@/lib/utils';
import { FoodDistributionTableView } from '@/components/food-calendar/FoodDistributionTableView';
import { ImpactProgramsList } from '@/components/booking/ImpactProgramsList';
import { CorpusFundBookingList } from '@/components/booking/CorpusFundBookingList';
import { KindDonationBookingList } from '@/components/booking/KindDonationBookingList';

interface EventCreatorProps {
  donor: DonorWithStats;
  onShowCalendar: (category: string, categoryId: string, homeId: string, trustId: string, date: Date) => void;
  onBack: () => void;
}

export const EventCreator = ({ donor, onShowCalendar, onBack }: EventCreatorProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const { data: categories = [] } = useCategories();
  const { data: trusts = [] } = useTrusts();

  const activeCategories = categories.filter(c => c.is_active);

  const handleCategorySelect = (categoryKey: string, categoryId: string) => {
    setSelectedCategory(categoryKey);
    setSelectedCategoryId(categoryId);
  };

  // Get category label for dynamic titles
  const selectedCategoryLabel = activeCategories.find(c => c.id === selectedCategoryId)?.label;

  // Category detection
  const isFoodDistribution = selectedCategory === 'food_distribution';
  const isImpactPrograms = selectedCategory === 'impact_programs';
  const isNeedList = selectedCategory === 'need_list';
  const isTrustWelfare = selectedCategory === 'trust_welfare';
  const isCorpusFund = selectedCategory === 'corpus_fund';
  const isKindDonation = selectedCategory === 'kind_donation';

  // Categories that use the needs-based list (ImpactProgramsList)
  const isNeedsBased = isImpactPrograms || isNeedList || isTrustWelfare;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Donor Profile
        </Button>
        <div className="text-sm text-muted-foreground">
          Booking for: <span className="font-semibold text-foreground">{donor.name}</span>
        </div>
      </div>

      {/* Category Selection - Always visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Select Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeCategories.map((category) => {
              const IconComponent = getCategoryIcon(category.key);
              const isSelected = selectedCategory === category.key;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.key, category.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    isSelected 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <IconComponent className="h-6 w-6" />
                  <span className="text-sm font-medium text-center">{category.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conditional Content based on category */}
      {!selectedCategory ? (
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Select a category above</p>
          <p className="text-sm">Choose a donation category to view available requirements</p>
        </div>
      ) : isFoodDistribution ? (
        // Show Food Distribution Table View directly for eagle-eye view
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Click on any slot to book for <span className="font-semibold text-foreground">{donor.name}</span>
          </div>
          <FoodDistributionTableView preSelectedDonor={donor} />
        </div>
      ) : isNeedsBased ? (
        // Show all needs-based requirements directly (Impact Programs, Need List, Trust Welfare)
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Select a requirement to book for <span className="font-semibold text-foreground">{donor.name}</span>
          </div>
          <ImpactProgramsList 
            donor={donor}
            categoryId={selectedCategoryId}
            categoryLabel={selectedCategoryLabel}
            onBookingComplete={onBack}
          />
        </div>
      ) : isCorpusFund ? (
        // Show Corpus Fund contribution form
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Record corpus fund contribution for <span className="font-semibold text-foreground">{donor.name}</span>
          </div>
          <CorpusFundBookingList 
            donor={donor}
            onBookingComplete={onBack}
          />
        </div>
      ) : isKindDonation ? (
        // Show Kind Donation requirements list
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Select an in-kind requirement to pledge for <span className="font-semibold text-foreground">{donor.name}</span>
          </div>
          <KindDonationBookingList 
            donor={donor}
            onBookingComplete={onBack}
          />
        </div>
      ) : (
        // Fallback for any unhandled categories
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>This category doesn't have a dedicated booking view yet</p>
        </div>
      )}
    </div>
  );
};

export default EventCreator;
