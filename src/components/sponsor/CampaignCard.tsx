import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { NeedWithRelations } from '@/hooks/useNeeds';
import { NeedProgressDisplay } from '@/components/needs/NeedProgressDisplay';
import { cn } from '@/lib/utils';

interface CampaignCardProps {
  need: NeedWithRelations;
}

export const CampaignCard = ({ need }: CampaignCardProps) => {
  const home = need.homes;
  const category = need.categories;
  const photoUrl =
    (need.photo_urls && need.photo_urls[0]) || home?.image_url || null;

  const donationMode = need.donation_mode || 'MONEY_ONLY';
  const requiredAmount = need.required_amount || 0;
  const collectedAmount = need.collected_amount || 0;
  const requiredProductQty = need.required_product_qty || 0;
  const fulfilledProductQty = need.fulfilled_product_qty || 0;
  const productName = need.product_name || 'Items';
  const productUnit = need.product_unit || 'pieces';

  const isAvailable =
    need.status !== 'FULLY_SPONSORED' &&
    need.status !== 'COMPLETED' &&
    need.status !== 'CANCELLED';

  const formattedDate = new Date(need.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const title =
    need.description?.split(/[.!?]/)[0]?.trim().slice(0, 72) ||
    category?.label ||
    'Support this campaign';

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md',
        !isAvailable && 'opacity-80',
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 px-6 text-center">
            <p className="font-display text-lg font-semibold text-primary">{title}</p>
          </div>
        )}
        {category && (
          <Badge className="absolute left-3 top-3 bg-background/90 text-foreground backdrop-blur">
            {category.label}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug line-clamp-2">
            {title}
          </h3>
          {need.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {need.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
          {home && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {home.name}
              {home.city ? `, ${home.city}` : ''}
            </span>
          )}
        </div>

        <NeedProgressDisplay
          donationMode={donationMode}
          requiredAmount={requiredAmount}
          collectedAmount={collectedAmount}
          requiredProductQty={requiredProductQty}
          fulfilledProductQty={fulfilledProductQty}
          productName={productName}
          productUnit={productUnit}
          compact
        />

        {isAvailable ? (
          <Button asChild className="mt-auto w-full">
            <Link to={`/sponsor/${need.id}`}>
              Support this campaign
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button disabled variant="secondary" className="mt-auto w-full">
            Campaign closed
          </Button>
        )}
      </div>
    </article>
  );
};
