import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ListChecks,
  Plus,
  Search,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Edit,
  XCircle,
  CheckCircle2,
  Eye,
  LayoutDashboard,
  Home,
  LayoutGrid,
  FileText,
  Image,
  ExternalLink,
  User,
  Mail,
  IndianRupee,
  Package,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { NeedsCalendar } from '@/components/needs/NeedsCalendar';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNeeds, useUpdateNeed } from '@/hooks/useNeeds';
import { useHomes } from '@/hooks/useHomes';
import { useCategories } from '@/hooks/useCategories';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';
import { getCategoryIcon } from '@/lib/categoryIcons';

const NeedsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isWarden = user?.role === 'warden';
  const [searchQuery, setSearchQuery] = useState('');
  const [homeFilter, setHomeFilter] = useState<string>(() => {
    // Auto-set home filter for wardens
    if (user?.role === 'warden' && user?.home_id) {
      return user.home_id;
    }
    return 'all';
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');
  const [typeFilter, setTypeFilter] = useState<'all' | 'requirement' | 'received'>('all');

  const dashboardPath = user?.role === 'super_admin' ? '/super-admin' : 
                        user?.role === 'warden' ? '/warden' : '/admin';

  // Fetch data from Supabase
  const { data: needs = [], isLoading: loadingNeeds } = useNeeds({
    homeId: homeFilter !== 'all' ? homeFilter : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
  });
  const { data: homes = [] } = useHomes();
  const { data: categories = [] } = useCategories();
  const updateNeed = useUpdateNeed();

  // Filter needs by search - include new fields
  const filteredNeeds = needs.filter(need => {
    const matchesSearch = 
      (need.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (need.categories?.label?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (need.homes?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      ((need as any).staff_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      ((need as any).product_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      ((need as any).submitter_email?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    // Type filter: requirement vs received
    if (typeFilter === 'requirement') {
      if (!['OPEN', 'PARTIAL', 'FULLY_SPONSORED'].includes(need.status || '')) return false;
    } else if (typeFilter === 'received') {
      if (need.status !== 'COMPLETED') return false;
    }

    return matchesSearch;
  });

  // Helper to format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  // Helper to count attachments
  const getAttachmentCount = (need: any) => {
    const photos = (need.photo_urls || []).length;
    const quotations = (need.quotation_urls || []).length;
    return { photos, quotations, total: photos + quotations };
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Open</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Partial</Badge>;
      case 'FULLY_SPONSORED':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Fully Sponsored</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-muted text-muted-foreground">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getApprovalBadge = (approvalStatus: string | null | undefined) => {
    switch (approvalStatus) {
      case 'APPROVED':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Not Approved</Badge>;
      case 'PENDING':
      default:
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Pending</Badge>;
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

  const handleApprove = async (needId: string) => {
    try {
      await updateNeed.mutateAsync({ id: needId, approval_status: 'APPROVED' });
      toast.success('Requirement approved');
    } catch (error) {
      toast.error('Failed to approve requirement');
    }
  };

  const handleReject = async (needId: string) => {
    try {
      await updateNeed.mutateAsync({ id: needId, approval_status: 'REJECTED' });
      toast.success('Requirement rejected');
    } catch (error) {
      toast.error('Failed to reject requirement');
    }
  };

  // Stats
  const openCount = needs.filter(n => n.status === 'OPEN').length;
  const partialCount = needs.filter(n => n.status === 'PARTIAL').length;
  const sponsoredCount = needs.filter(n => n.status === 'FULLY_SPONSORED').length;

  // Transform needs for calendar
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
    categories: need.categories,
    homes: need.homes,
  }));

  return (
    <MainLayout>
      <div className="container py-8 px-4">
        {/* Super Admin Navigation */}
        {user?.role === 'super_admin' && <SuperAdminNav />}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <ListChecks className="h-8 w-8" />
              Requirements Management
            </h1>
            <p className="text-muted-foreground mt-1">Create and manage requirements for homes</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link to={dashboardPath}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/homes">
                <Home className="h-4 w-4 mr-2" />
                Homes
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/needs/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Requirement
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {loadingNeeds ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                  <p className="text-3xl font-bold">{needs.length}</p>
                )}
                <p className="text-sm text-muted-foreground">Total Requirements</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {loadingNeeds ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                  <p className="text-3xl font-bold text-green-600">{openCount}</p>
                )}
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {loadingNeeds ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                  <p className="text-3xl font-bold text-amber-600">{partialCount}</p>
                )}
                <p className="text-sm text-muted-foreground">Partially Sponsored</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {loadingNeeds ? <Skeleton className="h-8 w-12 mx-auto" /> : (
                  <p className="text-3xl font-bold text-primary">{sponsoredCount}</p>
                )}
                <p className="text-sm text-muted-foreground">Fully Sponsored</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle & Filters */}
        <div className="flex flex-col gap-4 mb-6">
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

          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Type Filter: Requirement vs Received */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</span>
                <ToggleGroup
                  type="single"
                  value={typeFilter}
                  onValueChange={(v) => { if (v) setTypeFilter(v as 'all' | 'requirement' | 'received'); }}
                  className="justify-start"
                >
                  <ToggleGroupItem value="all" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <LayoutGrid className="h-4 w-4" />
                    All
                  </ToggleGroupItem>
                  <ToggleGroupItem value="requirement" className="gap-2 data-[state=on]:bg-amber-600 data-[state=on]:text-white">
                    <Package className="h-4 w-4" />
                    Requirement
                  </ToggleGroupItem>
                  <ToggleGroupItem value="received" className="gap-2 data-[state=on]:bg-green-600 data-[state=on]:text-white">
                    <CheckCircle2 className="h-4 w-4" />
                    Received
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Search and Home Filter Row */}
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
                {!isWarden && (
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
                )}
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
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        {activeView === 'list' ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Unit/Home</TableHead>
                    <TableHead className="whitespace-nowrap">Staff Name</TableHead>
                    <TableHead className="whitespace-nowrap">Item Required</TableHead>
                    <TableHead className="whitespace-nowrap">Qty</TableHead>
                    <TableHead className="whitespace-nowrap">Est. Value</TableHead>
                    <TableHead className="whitespace-nowrap">Attachments</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Approval</TableHead>
                    <TableHead className="whitespace-nowrap">Needs Addressed</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
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
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredNeeds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        No requirements found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNeeds.map(need => {
                      const attachments = getAttachmentCount(need);
                      const needData = need as any;
                      
                      return (
                        <TableRow key={need.id} className="group">
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(need.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {need.homes?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {needData.staff_name ? (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span>{needData.staff_name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <div className="font-medium truncate">
                                {needData.product_name || need.categories?.label || 'N/A'}
                              </div>
                              {needData.product_specification && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {needData.product_specification}
                                </div>
                              )}
                              {needData.product_link && (
                                <a 
                                  href={needData.product_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Link
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {need.quantity} {need.unit}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {needData.estimated_unit_price ? (
                              <div className="flex items-center gap-1">
                                <IndianRupee className="h-3 w-3 text-muted-foreground" />
                                <span>{formatCurrency(needData.estimated_unit_price)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {attachments.total > 0 ? (
                              <div className="flex items-center gap-2">
                                {attachments.quotations > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <FileText className="h-3 w-3" />
                                        {attachments.quotations}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {attachments.quotations} quotation(s)
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {attachments.photos > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Image className="h-3 w-3" />
                                        {attachments.photos}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {attachments.photos} photo(s)
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {needData.submitter_email ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a 
                                    href={`mailto:${needData.submitter_email}`}
                                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <Mail className="h-3 w-3" />
                                    <span className="max-w-[100px] truncate">{needData.submitter_email}</span>
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>{needData.submitter_email}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getApprovalBadge(needData.approval_status)}</TableCell>
                          <TableCell>
                            {needData.fulfillment_details ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm max-w-[120px] truncate block cursor-help">
                                    {needData.fulfillment_details}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  {needData.fulfillment_details}
                                </TooltipContent>
                              </Tooltip>
                            ) : needData.approval_status === 'REJECTED' ? (
                              <span className="text-xs text-muted-foreground">Not Approved</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(need.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/admin/needs/${need.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/sponsor/${need.id}`)}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Public View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/admin/needs/${need.id}/edit`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {user?.role === 'super_admin' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {(need as any).approval_status !== 'APPROVED' && (
                                      <DropdownMenuItem onClick={() => handleApprove(need.id)}>
                                        <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                                        Approve
                                      </DropdownMenuItem>
                                    )}
                                    {(need as any).approval_status !== 'REJECTED' && (
                                      <DropdownMenuItem onClick={() => handleReject(need.id)}>
                                        <ShieldX className="h-4 w-4 mr-2 text-destructive" />
                                        Reject
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                                <DropdownMenuSeparator />
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <NeedsCalendar needs={needsForCalendar} />
        )}
      </div>
    </MainLayout>
  );
};

export default NeedsList;
