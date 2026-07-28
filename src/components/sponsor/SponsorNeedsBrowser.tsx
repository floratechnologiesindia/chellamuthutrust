import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NeedCard } from '@/components/needs/NeedCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNeeds } from '@/hooks/useNeeds';
import { useCategories } from '@/hooks/useCategories';
import { useHomes } from '@/hooks/useHomes';
import {
  Filter,
  X,
  Utensils,
  Heart,
  List,
  HandHelping,
  PiggyBank,
  Gift,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, React.ElementType> = {
  utensils: Utensils,
  heart: Heart,
  list: List,
  'hand-helping': HandHelping,
  'piggy-bank': PiggyBank,
  gift: Gift,
};

interface SponsorNeedsBrowserProps {
  /** Hide page title — used when embedded in donor portal tab */
  embedded?: boolean;
  /** Exclude food-category needs (donor portal has a dedicated food tab) */
  excludeFoodCategory?: boolean;
}

export const SponsorNeedsBrowser = ({
  embedded = false,
  excludeFoodCategory = false,
}: SponsorNeedsBrowserProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedHome, setSelectedHome] = useState<string>(searchParams.get('home') || 'all');
  const [selectedHelpMode, setSelectedHelpMode] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: needs = [], isLoading: needsLoading } = useNeeds();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: homes = [], isLoading: homesLoading } = useHomes();

  const isLoading = needsLoading || categoriesLoading || homesLoading;

  const foodCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.key === 'food').map((c) => c.id)),
    [categories],
  );

  const availableNeeds = useMemo(
    () =>
      needs.filter((need) => {
        if (need.status === 'COMPLETED' || need.status === 'CANCELLED') return false;
        if (excludeFoodCategory && foodCategoryIds.has(need.category_id)) return false;
        return true;
      }),
    [needs, excludeFoodCategory, foodCategoryIds],
  );

  const visibleCategories = useMemo(
    () =>
      excludeFoodCategory
        ? categories.filter((c) => c.key !== 'food')
        : categories,
    [categories, excludeFoodCategory],
  );

  const filteredNeeds = useMemo(() => {
    return availableNeeds.filter((need) => {
      if (selectedCategory !== 'all' && need.category_id !== selectedCategory) return false;
      if (selectedHome !== 'all' && need.home_id !== selectedHome) return false;
      if (selectedHelpMode !== 'all' && need.help_mode !== selectedHelpMode) return false;
      return true;
    });
  }, [availableNeeds, selectedCategory, selectedHome, selectedHelpMode]);

  const categoryNeedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableNeeds.forEach((need) => {
      counts[need.category_id] = (counts[need.category_id] || 0) + 1;
    });
    return counts;
  }, [availableNeeds]);

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedHome('all');
    setSelectedHelpMode('all');
    const tab = searchParams.get('tab');
    setSearchParams(tab ? { tab } : {});
  };

  const hasActiveFilters =
    selectedCategory !== 'all' || selectedHome !== 'all' || selectedHelpMode !== 'all';

  if (isLoading) {
    return (
      <div className={embedded ? '' : 'container py-8'}>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />
        <Skeleton className="h-8 w-48 mb-3" />
        <div className="flex gap-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-28" />
          ))}
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'container py-8'}>
      {!embedded && (
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Sponsor a Need</h1>
          <p className="text-muted-foreground">
            Filter by category or project and find a need to sponsor
          </p>
        </div>
      )}

      {/* Category filter bar */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
          Filter by Category
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-w-[100px]',
              selectedCategory === 'all'
                ? 'border-primary bg-primary/10 text-primary shadow-md'
                : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50',
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
            >
              <LayoutGrid className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-center">All</span>
            <Badge variant="secondary" className="text-xs">
              {availableNeeds.length}
            </Badge>
          </button>

          {visibleCategories.map((category) => {
            const IconComponent = categoryIcons[category.icon || ''] || Heart;
            const count = categoryNeedCounts[category.id] || 0;
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-w-[100px]',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-md'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50',
                  count === 0 && 'opacity-50',
                )}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                >
                  <IconComponent className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-center leading-tight">{category.label}</span>
                <Badge variant={isSelected ? 'default' : 'secondary'} className="text-xs">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">More Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={selectedHome} onValueChange={setSelectedHome}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {homes.map((home) => (
                      <SelectItem key={home.id} value={home.id}>
                        {home.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Help Type</Label>
                <Select value={selectedHelpMode} onValueChange={setSelectedHelpMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ONE_TIME">One-time Help</SelectItem>
                    <SelectItem value="RECURRING">Recurring Help</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </aside>

        <div className="lg:hidden flex items-center gap-2 mb-4 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            More Filters
            {(selectedHome !== 'all' || selectedHelpMode !== 'all') && (
              <Badge className="ml-2" variant="secondary">
                Active
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="lg:hidden bg-card border border-border rounded-lg p-4 space-y-4 mb-4 w-full">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedHome} onValueChange={setSelectedHome}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {homes.map((home) => (
                    <SelectItem key={home.id} value={home.id}>
                      {home.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Help Type</Label>
              <Select value={selectedHelpMode} onValueChange={setSelectedHelpMode}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ONE_TIME">One-time Help</SelectItem>
                  <SelectItem value="RECURRING">Recurring Help</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredNeeds.length} need{filteredNeeds.length !== 1 ? 's' : ''} found
              {selectedCategory !== 'all' && (
                <span className="ml-1">
                  in{' '}
                  <span className="font-medium text-foreground">
                    {visibleCategories.find((c) => c.id === selectedCategory)?.label}
                  </span>
                </span>
              )}
            </p>
          </div>

          {filteredNeeds.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredNeeds.map((need) => (
                <NeedCard key={need.id} need={need} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No requirements found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or browsing another category
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
