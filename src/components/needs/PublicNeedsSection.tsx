import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, ListChecks, Calendar, Heart, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useNeeds } from '@/hooks/useNeeds';
import { useHomes } from '@/hooks/useHomes';
import { useCategories } from '@/hooks/useCategories';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { NeedsCalendar } from './NeedsCalendar';

const PublicNeedsSection = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [homeFilter, setHomeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');

  const { data: needs, isLoading: needsLoading } = useNeeds();
  const { data: homes } = useHomes();
  const { data: categories } = useCategories();

  // Filter needs
  const filteredNeeds = useMemo(() => {
    if (!needs) return [];
    return needs.filter(need => {
      const matchesSearch = searchQuery === '' || 
        need.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        need.homes?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHome = homeFilter === 'all' || need.home_id === homeFilter;
      const matchesCategory = categoryFilter === 'all' || need.category_id === categoryFilter;
      const matchesStatus = statusFilter === 'all' || need.status === statusFilter;
      return matchesSearch && matchesHome && matchesCategory && matchesStatus;
    });
  }, [needs, searchQuery, homeFilter, categoryFilter, statusFilter]);

  // Stats calculations
  const stats = useMemo(() => {
    if (!needs) return { total: 0, open: 0, partial: 0, sponsored: 0 };
    return {
      total: needs.length,
      open: needs.filter(n => n.status === 'OPEN').length,
      partial: needs.filter(n => n.status === 'PARTIAL').length,
      sponsored: needs.filter(n => n.status === 'FULLY_SPONSORED').length,
    };
  }, [needs]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Open</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Partial</Badge>;
      case 'FULLY_SPONSORED':
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Sponsored</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHelpModeBadge = (helpMode: string) => {
    return helpMode === 'RECURRING' 
      ? <Badge variant="outline" className="text-xs">Recurring</Badge>
      : <Badge variant="outline" className="text-xs">One-time</Badge>;
  };

  // Prepare needs for calendar view - cast to expected type
  const needsForCalendar = filteredNeeds as Parameters<typeof NeedsCalendar>[0]['needs'];

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">Requirements Management</h2>
          <p className="text-muted-foreground">Browse and sponsor requirements from our projects</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Requirements</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.open}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.partial}</p>
                  <p className="text-xs text-muted-foreground">Partial</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.sponsored}</p>
                  <p className="text-xs text-muted-foreground">Sponsored</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'list' | 'calendar')}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="list" className="gap-2">
                    <ListChecks className="h-4 w-4" />
                    List View
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Calendar View
                  </TabsTrigger>
                </TabsList>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search requirements..." 
                      className="pl-9 w-full sm:w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={homeFilter} onValueChange={setHomeFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {homes?.map(home => (
                        <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category Filters */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">CATEGORY</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={categoryFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setCategoryFilter('all')}
                  >
                    All
                  </Button>
                  {categories?.map(category => {
                    const Icon = getCategoryIcon(category.icon);
                    return (
                      <Button
                        key={category.id}
                        size="sm"
                        variant={categoryFilter === category.id ? 'default' : 'outline'}
                        onClick={() => setCategoryFilter(category.id)}
                        className="gap-1"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {category.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Status Filters */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">STATUS</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'OPEN' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('OPEN')}
                    className={statusFilter !== 'OPEN' ? 'text-green-600 border-green-200 hover:bg-green-50' : ''}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'PARTIAL' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('PARTIAL')}
                    className={statusFilter !== 'PARTIAL' ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : ''}
                  >
                    Partial
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'FULLY_SPONSORED' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('FULLY_SPONSORED')}
                    className={statusFilter !== 'FULLY_SPONSORED' ? 'text-primary border-primary/20 hover:bg-primary/5' : ''}
                  >
                    Sponsored
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('COMPLETED')}
                  >
                    Completed
                  </Button>
                </div>
              </div>

              {/* List View */}
              <TabsContent value="list" className="mt-0">
                {needsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredNeeds.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No requirements found matching your filters.</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="hidden md:table-cell">Description</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-center hidden sm:table-cell">Sponsors</TableHead>
                          <TableHead className="hidden lg:table-cell">Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNeeds.slice(0, 20).map((need) => (
                          <TableRow 
                            key={need.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/sponsor/${need.id}`)}
                          >
                            <TableCell className="font-medium whitespace-nowrap">
                              {format(new Date(need.date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate">
                              {need.homes?.name || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {need.categories && (() => {
                                  const Icon = getCategoryIcon(need.categories.key);
                                  return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
                                })()}
                                <span className="hidden sm:inline">{need.categories?.label || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                              {need.description || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {need.quantity} {need.unit}
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
                              {need.current_sponsors_count || 0}/{need.max_sponsors_allowed || 1}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {getHelpModeBadge(need.help_mode)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(need.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {filteredNeeds.length > 20 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Showing 20 of {filteredNeeds.length} requirements. 
                    <Button variant="link" className="px-1" onClick={() => navigate('/sponsor')}>
                      View all
                    </Button>
                  </p>
                )}
              </TabsContent>

              {/* Calendar View */}
              <TabsContent value="calendar" className="mt-0">
                <NeedsCalendar needs={needsForCalendar} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default PublicNeedsSection;
