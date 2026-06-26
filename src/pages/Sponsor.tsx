import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { NeedCard } from '@/components/needs/NeedCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNeeds } from '@/hooks/useNeeds';
import { useCategories } from '@/hooks/useCategories';
import { useHomes } from '@/hooks/useHomes';
import { 
  Calendar as CalendarIcon, 
  Filter, 
  X, 
  Utensils, 
  Heart, 
  List,
  HandHelping,
  PiggyBank,
  Gift,
  LayoutGrid
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Map database icon names to Lucide components
const categoryIcons: Record<string, React.ElementType> = {
  'utensils': Utensils,
  'heart': Heart,
  'list': List,
  'hand-helping': HandHelping,
  'piggy-bank': PiggyBank,
  'gift': Gift,
};

const Sponsor = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    searchParams.get('date') ? new Date(searchParams.get('date')!) : undefined
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedHome, setSelectedHome] = useState<string>(searchParams.get('home') || 'all');
  const [selectedHelpMode, setSelectedHelpMode] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data from Supabase
  const { data: needs = [], isLoading: needsLoading } = useNeeds();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: homes = [], isLoading: homesLoading } = useHomes();

  const isLoading = needsLoading || categoriesLoading || homesLoading;

  const filteredNeeds = useMemo(() => {
    return needs.filter(need => {
      // Filter by status (only show available needs)
      if (need.status === 'COMPLETED' || need.status === 'CANCELLED') return false;

      // Filter by date
      if (selectedDate && need.date !== format(selectedDate, 'yyyy-MM-dd')) return false;

      // Filter by category
      if (selectedCategory !== 'all' && need.category_id !== selectedCategory) return false;

      // Filter by home
      if (selectedHome !== 'all' && need.home_id !== selectedHome) return false;

      // Filter by help mode
      if (selectedHelpMode !== 'all' && need.help_mode !== selectedHelpMode) return false;

      return true;
    });
  }, [needs, selectedDate, selectedCategory, selectedHome, selectedHelpMode]);

  // Count needs per category
  const categoryNeedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    needs.forEach(need => {
      if (need.status !== 'COMPLETED' && need.status !== 'CANCELLED') {
        counts[need.category_id] = (counts[need.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [needs]);

  const clearFilters = () => {
    setSelectedDate(undefined);
    setSelectedCategory('all');
    setSelectedHome('all');
    setSelectedHelpMode('all');
    setSearchParams({});
  };

  const hasActiveFilters = selectedDate || selectedCategory !== 'all' || selectedHome !== 'all' || selectedHelpMode !== 'all';

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <Skeleton className="h-40 w-full mb-6" />
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
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Sponsor a Need</h1>
          <p className="text-muted-foreground">
            Choose a date that matters to you and find a need to sponsor
          </p>
        </div>

        {/* Date Selection - Prominent */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Select a Date to Sponsor
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full md:w-[280px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <div className="text-sm text-muted-foreground">
              <p>Pick a special date like:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Your birthday or anniversary</li>
                <li>In memory of a loved one</li>
                <li>A festival or special occasion</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Category Filter Bar - Prominent with Icons */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
            Filter by Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {/* All Categories Button */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-w-[100px]",
                selectedCategory === 'all'
                  ? "border-primary bg-primary/10 text-primary shadow-md"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                selectedCategory === 'all' ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <LayoutGrid className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-center">All</span>
              <Badge variant="secondary" className="text-xs">
                {Object.values(categoryNeedCounts).reduce((a, b) => a + b, 0)}
              </Badge>
            </button>

            {/* Category Buttons */}
            {categories.map(category => {
              const IconComponent = categoryIcons[category.icon || ''] || Heart;
              const count = categoryNeedCounts[category.id] || 0;
              const isSelected = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-w-[100px]",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-md"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                    count === 0 && "opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center leading-tight">
                    {category.label}
                  </span>
                  <Badge 
                    variant={isSelected ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Additional Filters */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter Sidebar - Desktop */}
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
                  <Label>Home</Label>
                  <Select value={selectedHome} onValueChange={setSelectedHome}>
                    <SelectTrigger>
                      <SelectValue placeholder="All homes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Homes</SelectItem>
                      {homes.map(home => (
                        <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
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

          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              More Filters
              {(selectedHome !== 'all' || selectedHelpMode !== 'all') && (
                <Badge className="ml-2" variant="secondary">Active</Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="lg:hidden bg-card border border-border rounded-lg p-4 space-y-4 mb-4">
              <div className="space-y-2">
                <Label>Home</Label>
                <Select value={selectedHome} onValueChange={setSelectedHome}>
                  <SelectTrigger>
                    <SelectValue placeholder="All homes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Homes</SelectItem>
                    {homes.map(home => (
                      <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
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

          {/* Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredNeeds.length} need{filteredNeeds.length !== 1 ? 's' : ''} found
                {selectedCategory !== 'all' && (
                  <span className="ml-1">
                    in <span className="font-medium text-foreground">
                      {categories.find(c => c.id === selectedCategory)?.label}
                    </span>
                  </span>
                )}
              </p>
            </div>

            {filteredNeeds.length > 0 ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredNeeds.map(need => (
                  <NeedCard key={need.id} need={need} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No requirements found</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedDate 
                    ? `No requirements are available for ${format(selectedDate, 'MMMM d, yyyy')}`
                    : 'Try adjusting your filters or selecting a different date'
                  }
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Sponsor;
