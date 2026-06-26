import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Baby, Heart } from 'lucide-react';
import type { HomeType } from '@/types';
import type { HomeWithTrust } from '@/hooks/useHomes';
import { HomeCardCarousel } from './HomeCardCarousel';

interface HomeCardProps {
  home: HomeWithTrust;
}

const homeTypeLabels: Record<HomeType, string> = {
  'children_home': 'Children Home',
  'old_age_home': 'Old Age Home',
  'mixed': 'Mixed Care',
  'others': 'Other',
  'special_children': 'Special Children Home',
};

const homeTypeIcons: Record<HomeType, React.ReactNode> = {
  'children_home': <Baby className="h-4 w-4" />,
  'old_age_home': <Heart className="h-4 w-4" />,
  'mixed': <Users className="h-4 w-4" />,
  'others': <Users className="h-4 w-4" />,
  'special_children': <Baby className="h-4 w-4" />,
};

export const HomeCard = ({ home }: HomeCardProps) => {
  const trustName = home.trusts?.name;
  const childrenTotal = (home.capacity_children_male || 0) + (home.capacity_children_female || 0);
  const elderlyTotal = (home.capacity_elderly_male || 0) + (home.capacity_elderly_female || 0);
  const totalCapacity = childrenTotal + elderlyTotal;

  return (
    <Card className="group card-hover overflow-hidden h-full flex flex-col">
      <div className="h-48 overflow-hidden">
        <HomeCardCarousel homeId={home.id} fallbackImage={home.image_url} className="h-full" />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {homeTypeIcons[home.type]}
            {homeTypeLabels[home.type]}
          </Badge>
        </div>
        
        <h3 className="font-display text-xl font-semibold mt-2">{home.name}</h3>
        
        {trustName && (
          <p className="text-sm text-primary">{trustName}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2">{home.description}</p>
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {home.city}, {home.state}
          </span>
          {totalCapacity > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {totalCapacity} residents
            </span>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {childrenTotal > 0 && (
            <Badge variant="outline" className="text-xs">
              {childrenTotal} Children ({home.capacity_children_male || 0}M/{home.capacity_children_female || 0}F)
            </Badge>
          )}
          {elderlyTotal > 0 && (
            <Badge variant="outline" className="text-xs">
              {elderlyTotal} Elderly ({home.capacity_elderly_male || 0}M/{home.capacity_elderly_female || 0}F)
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2 mt-auto">
        <Button asChild variant="outline" className="flex-1">
          <Link to={`/homes/${home.id}`}>View Details</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link to={`/sponsor?home=${home.id}`}>Sponsor</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
