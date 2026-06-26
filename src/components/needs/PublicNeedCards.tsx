import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, MapPin } from 'lucide-react';
import { useNeeds, type NeedWithRelations } from '@/hooks/useNeeds';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { formatCurrency } from '@/lib/formatters';

const statusColors: Record<string, string> = {
  OPEN: 'bg-success/10 text-success border-success/20',
  PARTIAL: 'bg-warning/10 text-warning border-warning/20',
};

const NeedCard = ({ need }: { need: NeedWithRelations }) => {
  const Icon = getCategoryIcon(need.categories?.icon);
  const required = need.required_amount || 0;
  const collected = need.collected_amount || 0;
  const progress = required > 0 ? Math.min((collected / required) * 100, 100) : 0;

  return (
    <Card className="h-full card-hover overflow-hidden">
      <CardContent className="p-5 flex flex-col h-full gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <Badge variant="outline" className={statusColors[need.status || 'OPEN'] || ''}>
            {need.status === 'PARTIAL' ? 'Partially Funded' : 'Open'}
          </Badge>
        </div>

        <div className="flex-1">
          <h3 className="font-display font-semibold text-sm line-clamp-2 mb-1">
            {need.categories?.label}{need.subcategories ? ` — ${need.subcategories.label}` : ''}
          </h3>
          {need.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{need.description}</p>
          )}
        </div>

        {need.homes && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{need.homes.name}, {need.homes.city}</span>
          </div>
        )}

        {required > 0 && (
          <div className="space-y-1.5">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(collected)} raised</span>
              <span className="font-medium text-foreground">{formatCurrency(required)}</span>
            </div>
          </div>
        )}

        <Button size="sm" variant="outline" className="w-full mt-auto" asChild>
          <Link to={`/sponsor/${need.id}`}>
            Sponsor This
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

const PublicNeedCards = () => {
  const { data: needs, isLoading } = useNeeds();

  const openNeeds = needs
    ?.filter(n => n.status === 'OPEN' || n.status === 'PARTIAL')
    .slice(0, 6) || [];

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    );
  }

  if (openNeeds.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Urgent Needs
            </h2>
            <p className="text-muted-foreground">
              These homes need your support right now
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/sponsor">
              View All Needs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {openNeeds.map((need, i) => (
            <div key={need.id} className={`animate-slide-up-${i + 1}`}>
              <NeedCard need={need} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PublicNeedCards;
