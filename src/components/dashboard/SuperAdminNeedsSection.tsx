import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Heart,
  Plus,
  Search,
  Calendar as CalendarIcon,
  ListChecks,
  MoreHorizontal,
  Edit,
  CheckCircle2,
  Eye,
  XCircle,
  LayoutGrid,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNeeds, useUpdateNeed, NeedWithRelations } from '@/hooks/useNeeds';
import { useHomes } from '@/hooks/useHomes';
import { useCategories } from '@/hooks/useCategories';
import { useTrusts } from '@/hooks/useHomes';
import { NeedsCalendar } from '@/components/needs/NeedsCalendar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCategoryIcon } from '@/lib/categoryIcons';

export const SuperAdminNeedsSection = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [trustFilter, setTrustFilter] = useState<string>('all');
  const [homeFilter, setHomeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');

  // Fetch data
  const { data: needs = [], isLoading: loadingNeeds } = useNeeds({
    trustId: trustFilter !== 'all' ? trustFilter : undefined,
    homeId: homeFilter !== 'all' ? homeFilter : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
  });
  const { data: homes = [], isLoading: loadingHomes } = useHomes(trustFilter !== 'all' ? trustFilter : undefined);
  const { data: categories = [] } = useCategories();
  const { data: trusts = [] } = useTrusts();
  const updateNeed = useUpdateNeed();

  // Filter by search
  const filteredNeeds = needs.filter(need => {
    const matchesSearch = 
      (need.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (need.categories?.label?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (need.homes?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Stats
  const openCount = needs.filter(n => n.status === 'OPEN').length;
  const partialCount = needs.filter(n => n.status === 'PARTIAL').length;
  const sponsoredCount = needs.filter(n => n.status === 'FULLY_SPONSORED').length;
  const completedCount = needs.filter(n => n.status === 'COMPLETED').length;

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Open</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Partial</Badge>;
      case 'FULLY_SPONSORED':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Sponsored</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-muted text-muted-foreground">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getHelpModeBadge = (mode: string) => {
    return mode === 'RECURRING' 
      ? <Badge variant="outline" className="text-accent border-accent">Recurring</Badge>
      : <Badge variant="outline">One-time</Badge>;
  };

  const handleMarkComplete = async (needId: string) => {
    try {
      await updateNeed.mutateAsync({ id: needId, status: 'COMPLETED' });
      toast.success('Requirement marked as completed');
    } catch (error) {
      toast.error('Failed to update requirement');
    }
  };

  const handleCancel = async (needId: string) => {
    try {
      await updateNeed.mutateAsync({ id: needId, status: 'CANCELLED' });
      toast.success('Requirement cancelled');
    } catch (error) {
      toast.error('Failed to cancel requirement');
    }
  };

  // Transform needs for calendar (adapting to expected type)
  const needsForCalendar = filteredNeeds.map(need => ({
    id: need.id,
    home_id: need.home_id,
    trust_id: need.trust_id,
    category_id: need.category_id,
    subcategory_id: need.subcategory_id,
    date: need.date,
    quantity: need.quantity,
    unit: need.unit,
    help_mode: need.help_mode,
    recurring_frequency: need.recurring_frequency || 'none',
    recurring_end_date: need.recurring_end_date,
    description: need.description || '',
    max_sponsors_allowed: need.max_sponsors_allowed || 1,
    current_sponsors_count: need.current_sponsors_count || 0,
    status: need.status || 'OPEN',
    // Include relation data for display
    categories: need.categories,
    homes: need.homes,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Requirements Management
        </CardTitle>
        <Button onClick={() => navigate('/admin/needs/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Requirement
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              {loadingNeeds ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-foreground">{needs.length}</p>
              )}
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              {loadingNeeds ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-green-600">{openCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              {loadingNeeds ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-amber-600">{partialCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Partial</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              {loadingNeeds ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-primary">{sponsoredCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Sponsored</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              {loadingNeeds ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                <p className="text-2xl font-bold text-muted-foreground">{completedCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'list' | 'calendar')}>
          <TabsList>
            <TabsTrigger value="list">
              <ListChecks className="h-4 w-4 mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="space-y-4">
          {/* Search and Trust/Home Filter Row */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={trustFilter} onValueChange={(v) => { setTrustFilter(v); setHomeFilter('all'); }}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Trusts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trusts</SelectItem>
                {trusts.map(trust => (
                  <SelectItem key={trust.id} value={trust.id}>{trust.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={homeFilter} onValueChange={setHomeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Homes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Homes</SelectItem>
                {homes.map(home => (
                  <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={categoryFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('all')}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                All
              </Button>
              {categories.map(cat => {
                const IconComponent = getCategoryIcon(cat.icon);
                return (
                  <Button
                    key={cat.id}
                    variant={categoryFilter === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(cat.id)}
                    className="gap-2"
                  >
                    <IconComponent className="h-4 w-4" />
                    {cat.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Status Filter Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'OPEN' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('OPEN')}
                className={statusFilter === 'OPEN' ? 'bg-green-600 hover:bg-green-700' : 'border-green-500/50 text-green-600 hover:bg-green-500/10'}
              >
                Open
              </Button>
              <Button
                variant={statusFilter === 'PARTIAL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('PARTIAL')}
                className={statusFilter === 'PARTIAL' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-500/50 text-amber-600 hover:bg-amber-500/10'}
              >
                Partial
              </Button>
              <Button
                variant={statusFilter === 'FULLY_SPONSORED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('FULLY_SPONSORED')}
                className={statusFilter === 'FULLY_SPONSORED' ? '' : 'border-primary/50 text-primary hover:bg-primary/10'}
              >
                Sponsored
              </Button>
              <Button
                variant={statusFilter === 'COMPLETED' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('COMPLETED')}
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === 'CANCELLED' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('CANCELLED')}
                className={statusFilter !== 'CANCELLED' ? 'border-destructive/50 text-destructive hover:bg-destructive/10' : ''}
              >
                Cancelled
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeView === 'list' ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Home</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Sponsors</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingNeeds ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredNeeds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No requirements found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNeeds.map(need => (
                    <TableRow key={need.id}>
                      <TableCell className="font-medium">
                        {format(new Date(need.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{need.homes?.name || 'Unknown'}</TableCell>
                      <TableCell>{need.categories?.label || 'Unknown'}</TableCell>
                      <TableCell className="max-w-xs truncate">{need.description}</TableCell>
                      <TableCell>{need.quantity} {need.unit}</TableCell>
                      <TableCell>
                        <span className={(need.current_sponsors_count || 0) >= (need.max_sponsors_allowed || 1) ? 'text-green-600' : ''}>
                          {need.current_sponsors_count || 0}/{need.max_sponsors_allowed || 1}
                        </span>
                      </TableCell>
                      <TableCell>{getHelpModeBadge(need.help_mode)}</TableCell>
                      <TableCell>{getStatusBadge(need.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/sponsor/${need.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/needs/${need.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {need.status !== 'COMPLETED' && need.status !== 'CANCELLED' && (
                              <DropdownMenuItem onClick={() => handleMarkComplete(need.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            {need.status === 'OPEN' && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleCancel(need.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <NeedsCalendar needs={needsForCalendar} />
        )}

        {/* View All Link */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => navigate('/admin/needs')}>
            View Full Requirements Management
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuperAdminNeedsSection;
