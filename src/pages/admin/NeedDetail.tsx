import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Calendar,
  Home,
  User,
  Mail,
  IndianRupee,
  Package,
  FileText,
  Image,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNeed, useUpdateNeed } from '@/hooks/useNeeds';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';

const NeedDetail = () => {
  const { needId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: need, isLoading } = useNeed(needId || null);
  const updateNeed = useUpdateNeed();

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

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const handleMarkComplete = async () => {
    if (!needId) return;
    try {
      await updateNeed.mutateAsync({ id: needId, status: 'COMPLETED' });
      toast.success('Requirement marked as completed');
    } catch (error) {
      toast.error('Failed to update requirement');
    }
  };

  const handleCancel = async () => {
    if (!needId) return;
    try {
      await updateNeed.mutateAsync({ id: needId, status: 'CANCELLED' });
      toast.success('Requirement cancelled');
    } catch (error) {
      toast.error('Failed to cancel requirement');
    }
  };

  const handleApprove = async () => {
    if (!needId) return;
    try {
      await updateNeed.mutateAsync({ id: needId, approval_status: 'APPROVED' });
      toast.success('Requirement approved');
    } catch (error) {
      toast.error('Failed to approve requirement');
    }
  };

  const handleReject = async () => {
    if (!needId) return;
    try {
      await updateNeed.mutateAsync({ id: needId, approval_status: 'REJECTED' });
      toast.success('Requirement rejected');
    } catch (error) {
      toast.error('Failed to reject requirement');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!need) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-4xl">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Requirement Not Found</h2>
            <p className="text-muted-foreground mb-4">The requirement you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/admin/needs">Back to Requirements</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const needData = need as any;

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        {user?.role === 'super_admin' && <SuperAdminNav />}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/admin/needs" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">Requirements</span>
            <span className="text-muted-foreground">/</span>
            <span>Details</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-display font-bold">
                  {needData.product_name || need.categories?.label || 'Requirement'}
                </h1>
                {getStatusBadge(need.status)}
              </div>
              <p className="text-muted-foreground">
                {need.homes?.name} • {format(new Date(need.date), 'PPP')}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" asChild>
                <Link to={`/admin/needs/${needId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/sponsor/${needId}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Public View
                </Link>
              </Button>
              {need.status !== 'COMPLETED' && need.status !== 'CANCELLED' && (
                <Button onClick={handleMarkComplete}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Requirement Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{need.categories?.label || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subcategory</p>
                    <p className="font-medium">{need.subcategories?.label || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity Required</p>
                    <p className="font-medium">{need.quantity} {need.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Help Mode</p>
                    <div className="flex items-center gap-2">
                      {need.help_mode === 'RECURRING' ? (
                        <RefreshCw className="h-4 w-4 text-accent" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {need.help_mode === 'RECURRING' 
                          ? `Recurring (${need.recurring_frequency})` 
                          : 'One-time'}
                      </span>
                    </div>
                  </div>
                </div>

                {need.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description / Remarks</p>
                      <p className="whitespace-pre-wrap">{need.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Product Details */}
            {(needData.product_name || needData.product_specification || needData.estimated_unit_price) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {needData.product_name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Item Name</p>
                        <p className="font-medium">{needData.product_name}</p>
                      </div>
                    )}
                    {needData.required_product_qty && (
                      <div>
                        <p className="text-sm text-muted-foreground">Required Quantity</p>
                        <p className="font-medium">{needData.required_product_qty} {needData.product_unit}</p>
                      </div>
                    )}
                    {needData.estimated_unit_price && (
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Unit Price</p>
                        <p className="font-medium flex items-center gap-1">
                          <IndianRupee className="h-4 w-4" />
                          {formatCurrency(needData.estimated_unit_price)}
                        </p>
                      </div>
                    )}
                    {needData.required_amount && (
                      <div>
                        <p className="text-sm text-muted-foreground">Required Amount</p>
                        <p className="font-medium flex items-center gap-1">
                          <IndianRupee className="h-4 w-4" />
                          {formatCurrency(needData.required_amount)}
                        </p>
                      </div>
                    )}
                  </div>

                  {needData.product_specification && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Product Specification</p>
                        <p className="whitespace-pre-wrap">{needData.product_specification}</p>
                      </div>
                    </>
                  )}

                  {needData.product_link && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Product Link</p>
                      <a 
                        href={needData.product_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {needData.product_link}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {((needData.quotation_urls?.length > 0) || (needData.photo_urls?.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quotations */}
                  {needData.quotation_urls?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Quotation Documents ({needData.quotation_urls.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {needData.quotation_urls.map((url: string, index: number) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                          return (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block border rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                            >
                              {isImage ? (
                                <img src={url} alt={`Quotation ${index + 1}`} className="w-full h-24 object-cover" />
                              ) : (
                                <div className="flex flex-col items-center justify-center h-24 bg-muted">
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground mt-1">Document {index + 1}</span>
                                </div>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Photos */}
                  {needData.photo_urls?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Product Photos ({needData.photo_urls.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {needData.photo_urls.map((url: string, index: number) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                          >
                            <img src={url} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fulfillment Details */}
            {needData.fulfillment_details && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Fulfillment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{needData.fulfillment_details}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Approval Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Approval Status
                  {getApprovalBadge(needData.approval_status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {needData.approval_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{needData.approval_notes}</p>
                  </div>
                )}
                {needData.approved_at && (
                  <div className="text-sm text-muted-foreground">
                    {needData.approval_status === 'APPROVED' ? 'Approved' : 'Updated'} on {format(new Date(needData.approved_at), 'PPp')}
                  </div>
                )}
                {user?.role === 'super_admin' && needData.approval_status !== 'APPROVED' && needData.approval_status !== 'REJECTED' && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={handleApprove} className="flex-1">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleReject} className="flex-1">
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submitter Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submitter Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {needData.staff_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{needData.staff_name}</span>
                  </div>
                )}
                {needData.submitter_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${needData.submitter_email}`} className="text-primary hover:underline">
                      {needData.submitter_email}
                    </a>
                  </div>
                )}
                {!needData.staff_name && !needData.submitter_email && (
                  <p className="text-muted-foreground text-sm">No submitter information</p>
                )}
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{need.homes?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{need.homes?.city}</span>
                </div>
                {need.homes?.description && (
                  <p className="text-sm text-muted-foreground">{need.homes.description}</p>
                )}
              </CardContent>
            </Card>

            {/* Sponsorship Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sponsorship Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sponsors</span>
                  <span className="font-medium">
                    {need.current_sponsors_count || 0} / {need.max_sponsors_allowed || 1}
                  </span>
                </div>
                {needData.collected_amount !== undefined && needData.required_amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Collected</span>
                    <span className="font-medium">
                      {formatCurrency(needData.collected_amount)} / {formatCurrency(needData.required_amount)}
                    </span>
                  </div>
                )}
                {needData.fulfilled_product_qty !== undefined && needData.required_product_qty && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Product Fulfilled</span>
                    <span className="font-medium">
                      {needData.fulfilled_product_qty} / {needData.required_product_qty} {needData.product_unit}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{need.created_at ? format(new Date(need.created_at), 'PPp') : 'N/A'}</span>
                </div>
                {need.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{format(new Date(need.updated_at), 'PPp')}</span>
                  </div>
                )}
                {needData.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved</span>
                    <span>{format(new Date(needData.approved_at), 'PPp')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {need.status !== 'COMPLETED' && need.status !== 'CANCELLED' && (
              <Card className="border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive border-destructive/50 hover:bg-destructive/10"
                    onClick={handleCancel}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Requirement
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default NeedDetail;
