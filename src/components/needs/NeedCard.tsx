import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Utensils, Heart, List, HandHelping, PiggyBank, Gift, IndianRupee, Package } from 'lucide-react';
import { NeedWithRelations } from '@/hooks/useNeeds';
import { cn } from '@/lib/utils';
import { NeedProgressDisplay } from './NeedProgressDisplay';
import type { Database } from '@/integrations/supabase/types';

type NeedStatus = Database['public']['Enums']['need_status'];
type DonationMode = 'MONEY_ONLY' | 'PRODUCT_ONLY' | 'BOTH';

// Base need interface that works with both mock data and Supabase data
interface BaseNeed {
  id: string;
  home_id: string;
  category_id: string;
  subcategory_id?: string | null;
  date: string;
  quantity: number;
  unit: string;
  help_mode: 'ONE_TIME' | 'RECURRING';
  description?: string | null;
  max_sponsors_allowed?: number;
  current_sponsors_count?: number;
  status?: NeedStatus | null;
  // Donation mode fields
  donation_mode?: DonationMode;
  required_amount?: number;
  collected_amount?: number;
  required_product_qty?: number;
  fulfilled_product_qty?: number;
  product_name?: string | null;
  product_unit?: string | null;
  // Optional relations (from Supabase joins)
  homes?: { id: string; name: string; city: string; image_url: string | null } | null;
  categories?: { id: string; key: string; label: string; icon: string | null } | null;
  subcategories?: { id: string; label: string } | null;
}

interface NeedCardProps {
  need: BaseNeed | NeedWithRelations;
  showHome?: boolean;
}

// Map database icon keys to React nodes
const categoryIcons: Record<string, React.ReactNode> = {
  'utensils': <Utensils className="h-4 w-4" />,
  'heart': <Heart className="h-4 w-4" />,
  'list': <List className="h-4 w-4" />,
  'hand-helping': <HandHelping className="h-4 w-4" />,
  'piggy-bank': <PiggyBank className="h-4 w-4" />,
  'gift': <Gift className="h-4 w-4" />,
};

const statusStyles: Record<NeedStatus, string> = {
  'OPEN': 'status-open',
  'PARTIAL': 'status-partial',
  'FULLY_SPONSORED': 'status-sponsored',
  'COMPLETED': 'status-completed',
  'CANCELLED': 'bg-muted text-muted-foreground',
};

const statusLabels: Record<NeedStatus, string> = {
  'OPEN': 'Open',
  'PARTIAL': 'Partially Sponsored',
  'FULLY_SPONSORED': 'Fully Sponsored',
  'COMPLETED': 'Completed',
  'CANCELLED': 'Cancelled',
};

export const NeedCard = ({ need, showHome = true }: NeedCardProps) => {
  // Use joined relations directly from the need object
  const home = need.homes;
  const category = need.categories;
  const subcategory = need.subcategories;
  
  const donationMode = (need as any).donation_mode || 'MONEY_ONLY';
  const requiredAmount = (need as any).required_amount || 0;
  const collectedAmount = (need as any).collected_amount || 0;
  const requiredProductQty = (need as any).required_product_qty || 0;
  const fulfilledProductQty = (need as any).fulfilled_product_qty || 0;
  const productName = (need as any).product_name || 'Items';
  const productUnit = (need as any).product_unit || 'pieces';
  
  const isAvailable = need.status !== 'FULLY_SPONSORED' && need.status !== 'COMPLETED' && need.status !== 'CANCELLED';

  const formattedDate = new Date(need.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Determine what contribution options are available
  const showMoneyOption = donationMode === 'MONEY_ONLY' || donationMode === 'BOTH';
  const showProductOption = donationMode === 'PRODUCT_ONLY' || donationMode === 'BOTH';

  return (
    <Card className={cn(
      "card-hover overflow-hidden",
      !isAvailable && "opacity-75"
    )}>
      {showHome && home?.image_url && (
        <div className="h-40 overflow-hidden">
          <img 
            src={home.image_url} 
            alt={home.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={statusStyles[need.status ?? 'OPEN']}>
            {statusLabels[need.status ?? 'OPEN']}
          </Badge>
          <div className="flex gap-1">
            {need.help_mode === 'RECURRING' && (
              <Badge variant="secondary">Recurring</Badge>
            )}
            {showMoneyOption && showProductOption && (
              <Badge variant="outline" className="text-xs">
                Money + Items
              </Badge>
            )}
          </div>
        </div>
        
        {showHome && home && (
          <h3 className="font-display text-lg font-semibold mt-2">{home.name}</h3>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {category && (
            <span className="flex items-center gap-1">
              {categoryIcons[category.icon || ''] || <Heart className="h-4 w-4" />}
              {category.label}
            </span>
          )}
          {subcategory && (
            <>
              <span>•</span>
              <span>{subcategory.label}</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-foreground line-clamp-2">{need.description}</p>
        
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formattedDate}
          </span>
          {showHome && home && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {home.city}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {need.quantity} {need.unit}
          </span>
        </div>

        {/* Dual Progress Display */}
        <NeedProgressDisplay
          donationMode={donationMode}
          requiredAmount={requiredAmount}
          collectedAmount={collectedAmount}
          requiredProductQty={requiredProductQty}
          fulfilledProductQty={fulfilledProductQty}
          productName={productName}
          productUnit={productUnit}
          compact={true}
        />
      </CardContent>

      <CardFooter className="flex gap-2">
        {isAvailable ? (
          <>
            {showMoneyOption && (
              <Button asChild className="flex-1 hover-lift" size="sm">
                <Link to={`/sponsor/${need.id}?mode=money`}>
                  <IndianRupee className="h-4 w-4 mr-1" />
                  Contribute
                </Link>
              </Button>
            )}
            {showProductOption && (
              <Button asChild variant={showMoneyOption ? "outline" : "default"} className="flex-1 hover-lift" size="sm">
                <Link to={`/sponsor/${need.id}?mode=product`}>
                  <Package className="h-4 w-4 mr-1" />
                  Provide Items
                </Link>
              </Button>
            )}
          </>
        ) : (
          <Button disabled className="w-full" variant="secondary">
            {need.status === 'FULLY_SPONSORED' ? 'Fully Sponsored' : 'Not Available'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
