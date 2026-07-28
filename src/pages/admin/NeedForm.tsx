import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Calendar as CalendarIcon, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useHomes, useTrusts } from '@/hooks/useHomes';
import { useCategories, useSubcategories, useSubSubcategories } from '@/hooks/useCategories';
import { useNeed, useCreateNeed, useUpdateNeed } from '@/hooks/useNeeds';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveProject } from '@/hooks/useActiveProject';
import { FoodDistributionTableView } from '@/components/food-calendar/FoodDistributionTableView';
import { NeedAttachmentUpload } from '@/components/needs/NeedAttachmentUpload';
import { CorpusFundForm } from '@/components/corpus-fund/CorpusFundForm';
import type { Database } from '@/integrations/supabase/types';

type HelpMode = Database['public']['Enums']['help_mode'];
type RecurringFrequency = Database['public']['Enums']['recurring_frequency'];

type DonationMode = 'MONEY_ONLY' | 'PRODUCT_ONLY' | 'BOTH';

// Validation schema
const needSchema = z.object({
  home_id: z.string().min(1, "Please select a project"),
  category_id: z.string().min(1, "Please select a category"),
  subcategory_id: z.string().optional(),
  sub_subcategory_id: z.string().optional(),
  date: z.date({ required_error: "Please select a date" }),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Please enter a unit"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  help_mode: z.enum(['ONE_TIME', 'RECURRING']),
  recurring_frequency: z.enum(['monthly', 'quarterly', 'yearly', 'none']),
  recurring_end_date: z.date().optional(),
  max_sponsors_allowed: z.number().min(1, "Must allow at least 1 sponsor").max(100, "Cannot exceed 100 sponsors"),
  // Donation mode fields
  donation_mode: z.enum(['MONEY_ONLY', 'PRODUCT_ONLY', 'BOTH']),
  required_amount: z.number().min(0).optional(),
  required_product_qty: z.number().min(0).optional(),
  product_name: z.string().optional(),
  product_unit: z.string().optional(),
  // Enhanced product details
  product_specification: z.string().optional(),
  product_link: z.string().url().optional().or(z.literal('')),
  estimated_unit_price: z.number().min(0).optional(),
  // Staff & submitter info
  staff_name: z.string().optional(),
  submitter_email: z.string().email().optional().or(z.literal('')),
  // File attachments
  photo_urls: z.array(z.string()).optional(),
  quotation_urls: z.array(z.string()).optional(),
  // Fulfillment details (for editing)
  fulfillment_details: z.string().optional(),
  // Approval fields (for editing)
  approval_status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  approval_notes: z.string().optional(),
});

type NeedFormData = z.infer<typeof needSchema>;

const NeedForm = () => {
  const { needId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { homeId, assignedProjectIds } = useActiveProject();
  const isEditing = !!needId;
  const isWarden = user?.role === 'warden';
  const needsListPath = isWarden ? '/warden/needs' : '/admin/needs';
  
  const [formData, setFormData] = useState<NeedFormData>({
    home_id: '',
    category_id: '',
    subcategory_id: '',
    sub_subcategory_id: '',
    date: new Date(),
    quantity: 1,
    unit: '',
    description: '',
    help_mode: 'ONE_TIME',
    recurring_frequency: 'none',
    recurring_end_date: undefined,
    max_sponsors_allowed: 1,
    // Donation mode fields
    donation_mode: 'MONEY_ONLY',
    required_amount: 0,
    required_product_qty: 0,
    product_name: '',
    product_unit: 'pieces',
    // Enhanced product details
    product_specification: '',
    product_link: '',
    estimated_unit_price: 0,
    // Staff & submitter info
    staff_name: '',
    submitter_email: '',
    // File attachments
    photo_urls: [],
    quotation_urls: [],
    // Fulfillment details
    fulfillment_details: '',
    // Approval fields
    approval_status: 'PENDING' as const,
    approval_notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dateOpen, setDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Fetch data from Supabase
  const { data: homes = [] } = useHomes();
  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories();
  const { data: subSubcategories = [] } = useSubSubcategories();
  const { data: existingNeed, isLoading: loadingNeed } = useNeed(needId || null);
  const createNeed = useCreateNeed();
  const updateNeed = useUpdateNeed();

  const wardenHomes = isWarden
    ? homes.filter((h) => assignedProjectIds.includes(h.id))
    : homes;

  // Pre-populate home_id for wardens (active project from switcher)
  useEffect(() => {
    if (!isEditing && isWarden && homeId) {
      setFormData(prev => ({ ...prev, home_id: homeId }));
    }
  }, [isWarden, homeId, isEditing]);

  // Load existing need data if editing
  useEffect(() => {
    if (isEditing && existingNeed) {
      setFormData({
        home_id: existingNeed.home_id,
        category_id: existingNeed.category_id,
        subcategory_id: existingNeed.subcategory_id || '',
        sub_subcategory_id: (existingNeed as any).sub_subcategory_id || '',
        date: new Date(existingNeed.date),
        quantity: existingNeed.quantity,
        unit: existingNeed.unit,
        description: existingNeed.description || '',
        help_mode: existingNeed.help_mode,
        recurring_frequency: existingNeed.recurring_frequency || 'none',
        recurring_end_date: existingNeed.recurring_end_date ? new Date(existingNeed.recurring_end_date) : undefined,
        max_sponsors_allowed: existingNeed.max_sponsors_allowed || 1,
        // Donation mode fields
        donation_mode: (existingNeed as any).donation_mode || 'MONEY_ONLY',
        required_amount: (existingNeed as any).required_amount || 0,
        required_product_qty: (existingNeed as any).required_product_qty || 0,
        product_name: (existingNeed as any).product_name || '',
        product_unit: (existingNeed as any).product_unit || 'pieces',
        // Enhanced product details
        product_specification: (existingNeed as any).product_specification || '',
        product_link: (existingNeed as any).product_link || '',
        estimated_unit_price: (existingNeed as any).estimated_unit_price || 0,
        // Staff & submitter info
        staff_name: (existingNeed as any).staff_name || '',
        submitter_email: (existingNeed as any).submitter_email || '',
        // File attachments
        photo_urls: (existingNeed as any).photo_urls || [],
        quotation_urls: (existingNeed as any).quotation_urls || [],
        // Fulfillment details
        fulfillment_details: (existingNeed as any).fulfillment_details || '',
        // Approval fields
        approval_status: (existingNeed as any).approval_status || 'PENDING',
        approval_notes: (existingNeed as any).approval_notes || '',
      });
    }
  }, [isEditing, existingNeed]);

  // Check if Food Distribution category is selected
  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === formData.category_id);
  }, [categories, formData.category_id]);

  const isFoodDistribution = selectedCategory?.key === 'FOOD_DISTRIBUTION' || 
                             selectedCategory?.label?.toLowerCase().includes('food distribution');

  const isCorpusFund = selectedCategory?.key === 'corpus_fund' || 
                       selectedCategory?.label?.toLowerCase().includes('corpus fund');

  // Get subcategories for selected category
  const availableSubcategories = subcategories.filter(
    s => s.category_id === formData.category_id && s.is_active
  );

  // Get sub-subcategories for selected subcategory
  const availableSubSubcategories = subSubcategories.filter(
    s => s.subcategory_id === formData.subcategory_id && s.is_active
  );

  // Common units based on category
  const getUnitSuggestions = () => {
    const category = categories.find(c => c.id === formData.category_id);
    switch (category?.key) {
      case 'FOOD_DISTRIBUTION':
        return ['meals', 'portions', 'kg', 'liters'];
      case 'NEED_LIST':
        return ['items', 'sets', 'INR', 'units'];
      case 'KIND_DONATION':
        return ['items', 'kg', 'units', 'boxes'];
      default:
        return ['items', 'units', 'INR', 'days'];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const result = needSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    // Get trust_id from selected home
    const selectedHome = homes.find(h => h.id === formData.home_id);
    if (!selectedHome) {
      toast.error('Please select a valid project');
      return;
    }

    try {
      if (isEditing && needId) {
        if (
          (formData.donation_mode === 'PRODUCT_ONLY' || formData.donation_mode === 'BOTH') &&
          !(formData.estimated_unit_price > 0)
        ) {
          toast.error('Product value (estimated unit price) is required');
          return;
        }
        if (
          (formData.donation_mode === 'MONEY_ONLY' || formData.donation_mode === 'BOTH') &&
          !(formData.required_amount > 0)
        ) {
          toast.error('Required amount (₹) is required');
          return;
        }
        await updateNeed.mutateAsync({
          id: needId,
          quantity: formData.quantity,
          unit: formData.unit,
          description: formData.description,
          max_sponsors_allowed: formData.max_sponsors_allowed,
          fulfillment_details: formData.fulfillment_details || null,
          approval_status: formData.approval_status,
          approval_notes: formData.approval_notes || null,
          donation_mode: formData.donation_mode as DonationMode,
          required_amount: formData.donation_mode !== 'PRODUCT_ONLY' ? formData.required_amount : 0,
          required_product_qty: formData.donation_mode !== 'MONEY_ONLY' ? formData.required_product_qty : 0,
          product_name: formData.donation_mode !== 'MONEY_ONLY' ? formData.product_name : null,
          product_unit: formData.donation_mode !== 'MONEY_ONLY' ? formData.product_unit : null,
          product_specification: formData.donation_mode !== 'MONEY_ONLY' ? formData.product_specification : null,
          product_link: formData.donation_mode !== 'MONEY_ONLY' && formData.product_link ? formData.product_link : null,
          estimated_unit_price: formData.donation_mode !== 'MONEY_ONLY' ? formData.estimated_unit_price : null,
          photo_urls: formData.photo_urls && formData.photo_urls.length > 0 ? formData.photo_urls : null,
          quotation_urls: formData.quotation_urls && formData.quotation_urls.length > 0 ? formData.quotation_urls : null,
        });
        toast.success('Requirement updated successfully');
      } else {
        if (
          (formData.donation_mode === 'PRODUCT_ONLY' || formData.donation_mode === 'BOTH') &&
          !(formData.estimated_unit_price > 0)
        ) {
          toast.error('Product value (estimated unit price) is required — uploading a quotation does not set the value');
          return;
        }
        if (
          (formData.donation_mode === 'MONEY_ONLY' || formData.donation_mode === 'BOTH') &&
          !(formData.required_amount > 0)
        ) {
          toast.error('Required amount (₹) is required');
          return;
        }
        await createNeed.mutateAsync({
          home_id: formData.home_id,
          trust_id: selectedHome.trust_id,
          category_id: formData.category_id,
          subcategory_id: formData.subcategory_id || null,
          sub_subcategory_id: formData.sub_subcategory_id || null,
          date: format(formData.date, 'yyyy-MM-dd'),
          quantity: formData.quantity,
          unit: formData.unit,
          help_mode: formData.help_mode as HelpMode,
          recurring_frequency: formData.help_mode === 'RECURRING' ? formData.recurring_frequency as RecurringFrequency : null,
          recurring_end_date: formData.recurring_end_date ? format(formData.recurring_end_date, 'yyyy-MM-dd') : null,
          description: formData.description,
          max_sponsors_allowed: formData.max_sponsors_allowed,
          // Donation mode fields
          donation_mode: formData.donation_mode as DonationMode,
          required_amount: formData.donation_mode !== 'PRODUCT_ONLY' ? formData.required_amount : 0,
          required_product_qty: formData.donation_mode !== 'MONEY_ONLY' ? formData.required_product_qty : 0,
          product_name: formData.donation_mode !== 'MONEY_ONLY' ? formData.product_name : null,
          product_unit: formData.donation_mode !== 'MONEY_ONLY' ? formData.product_unit : null,
          // Enhanced product details
          product_specification: formData.donation_mode !== 'MONEY_ONLY' ? formData.product_specification : null,
          product_link: formData.donation_mode !== 'MONEY_ONLY' && formData.product_link ? formData.product_link : null,
          estimated_unit_price: formData.donation_mode !== 'MONEY_ONLY' ? formData.estimated_unit_price : null,
          // Staff & submitter info
          staff_name: formData.staff_name || null,
          submitter_email: formData.submitter_email || null,
          // File attachments
          photo_urls: formData.photo_urls && formData.photo_urls.length > 0 ? formData.photo_urls : null,
          quotation_urls: formData.quotation_urls && formData.quotation_urls.length > 0 ? formData.quotation_urls : null,
        });
        toast.success('Requirement created successfully');
      }
      navigate(needsListPath);
    } catch (error) {
      console.error('Error saving need:', error);
      toast.error(isEditing ? 'Failed to update requirement' : 'Failed to create requirement');
    }
  };

  const isSubmitting = createNeed.isPending || updateNeed.isPending;

  if (isEditing && loadingNeed) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-3xl flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/admin/needs" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">Requirements Management</span>
          </div>
          <h1 className="text-3xl font-display font-bold">
            {isEditing ? 'Edit Requirement' : 'Create New Requirement'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update the requirement details below' : 'Fill in the details to create a new requirement'}
          </p>
        </div>

        {/* Category Selection - Always Show First */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Category Selection</CardTitle>
            <CardDescription>Select the type of requirement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  category_id: value,
                  subcategory_id: '',
                  sub_subcategory_id: ''
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.category_id && (
                <p className="text-sm text-destructive">{formErrors.category_id}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Show Food Distribution Table View, Corpus Fund Form, OR Regular Form */}
        {isFoodDistribution ? (
          <FoodDistributionTableView />
        ) : isCorpusFund ? (
          <Card>
            <CardHeader>
              <CardTitle>Corpus Fund Contribution</CardTitle>
              <CardDescription>
                Add a corpus fund contribution with donor declaration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CorpusFundForm 
                onSuccess={() => navigate(needsListPath)}
                onCancel={() => navigate(needsListPath)}
              />
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Project Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Selection</CardTitle>
                  <CardDescription>Select the project this need is for</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="home">Project *</Label>
                    <Select 
                      value={formData.home_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, home_id: value }))}
                      disabled={isWarden}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {(isWarden ? wardenHomes : homes).map(home => (
                          <SelectItem key={home.id} value={home.id}>
                            {home.name} ({home.city})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.home_id && (
                      <p className="text-sm text-destructive">{formErrors.home_id}</p>
                    )}
                    {isWarden && (
                      <p className="text-sm text-muted-foreground">
                        Requirements are created for your active project. Switch projects from the header if needed.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

            {/* Requirement Details */}
            <Card>
              <CardHeader>
                <CardTitle>Requirement Details</CardTitle>
                <CardDescription>Specify what is required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableSubcategories.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Subcategory</Label>
                    <Select 
                        value={formData.subcategory_id} 
                        onValueChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          subcategory_id: value,
                          sub_subcategory_id: ''
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubcategories.map(sub => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {availableSubSubcategories.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="subsubcategory">Item / Sub-subcategory</Label>
                      <Select 
                        value={formData.sub_subcategory_id} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, sub_subcategory_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubSubcategories.map(subSub => (
                            <SelectItem key={subSub.id} value={subSub.id}>
                              {subSub.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                    {formErrors.quantity && (
                      <p className="text-sm text-destructive">{formErrors.quantity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Select 
                      value={formData.unit} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUnitSuggestions().map(unit => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.unit && (
                      <p className="text-sm text-destructive">{formErrors.unit}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the need in detail..."
                    rows={3}
                  />
                  {formErrors.description && (
                    <p className="text-sm text-destructive">{formErrors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_sponsors">Maximum Sponsors Allowed *</Label>
                  <Input
                    id="max_sponsors"
                    type="number"
                    min={1}
                    max={100}
                    value={formData.max_sponsors_allowed}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_sponsors_allowed: parseInt(e.target.value) || 1 }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    How many sponsors can contribute to this need
                  </p>
                  {formErrors.max_sponsors_allowed && (
                    <p className="text-sm text-destructive">{formErrors.max_sponsors_allowed}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Donation Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Contribution Type</CardTitle>
                <CardDescription>Define how donors can contribute to this need</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>What type of contributions do you accept?</Label>
                  <RadioGroup
                    value={formData.donation_mode}
                    onValueChange={(value: DonationMode) => setFormData(prev => ({ 
                      ...prev, 
                      donation_mode: value 
                    }))}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                      <RadioGroupItem value="MONEY_ONLY" id="money_only" />
                      <Label htmlFor="money_only" className="flex-1 cursor-pointer">
                        <span className="font-medium">Money Only</span>
                        <p className="text-xs text-muted-foreground">Accept only monetary donations</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                      <RadioGroupItem value="PRODUCT_ONLY" id="product_only" />
                      <Label htmlFor="product_only" className="flex-1 cursor-pointer">
                        <span className="font-medium">Product Only</span>
                        <p className="text-xs text-muted-foreground">Accept only in-kind donations (items/products)</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                      <RadioGroupItem value="BOTH" id="both" />
                      <Label htmlFor="both" className="flex-1 cursor-pointer">
                        <span className="font-medium">Both Money & Products</span>
                        <p className="text-xs text-muted-foreground">Accept both monetary and in-kind donations</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Monetary fields */}
                {(formData.donation_mode === 'MONEY_ONLY' || formData.donation_mode === 'BOTH') && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <Label className="flex items-center gap-2">
                      💰 Monetary Requirement
                    </Label>
                    <div className="space-y-2">
                      <Label htmlFor="required_amount">Required Amount (₹)</Label>
                      <Input
                        id="required_amount"
                        type="number"
                        min={0}
                        value={formData.required_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, required_amount: parseFloat(e.target.value) || 0 }))}
                        placeholder="Enter total amount needed"
                      />
                    </div>
                  </div>
                )}

                {/* Product fields */}
                {(formData.donation_mode === 'PRODUCT_ONLY' || formData.donation_mode === 'BOTH') && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <Label className="flex items-center gap-2">
                      📦 Product Requirement
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="product_name">Product Name</Label>
                        <Input
                          id="product_name"
                          value={formData.product_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                          placeholder="e.g., Beds, Uniforms"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="required_product_qty">Required Quantity</Label>
                        <Input
                          id="required_product_qty"
                          type="number"
                          min={0}
                          value={formData.required_product_qty}
                          onChange={(e) => setFormData(prev => ({ ...prev, required_product_qty: parseInt(e.target.value) || 0 }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product_unit">Unit</Label>
                        <Select 
                          value={formData.product_unit} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, product_unit: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pieces">Pieces</SelectItem>
                            <SelectItem value="sets">Sets</SelectItem>
                            <SelectItem value="kg">Kg</SelectItem>
                            <SelectItem value="liters">Liters</SelectItem>
                            <SelectItem value="boxes">Boxes</SelectItem>
                            <SelectItem value="packets">Packets</SelectItem>
                            <SelectItem value="units">Units</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Enhanced product details */}
                    <div className="pt-3 border-t border-border/50 space-y-3">
                      <Label className="text-sm text-muted-foreground">Additional Product Details</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="estimated_unit_price">Estimated Unit Price (₹) *</Label>
                          <Input
                            id="estimated_unit_price"
                            type="number"
                            min={0}
                            value={formData.estimated_unit_price}
                            onChange={(e) => setFormData(prev => ({ ...prev, estimated_unit_price: parseFloat(e.target.value) || 0 }))}
                            placeholder="Price per unit"
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Required numeric value — uploading a quotation does not set this field.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="product_link">Product Link (URL)</Label>
                          <Input
                            id="product_link"
                            type="url"
                            value={formData.product_link}
                            onChange={(e) => setFormData(prev => ({ ...prev, product_link: e.target.value }))}
                            placeholder="https://example.com/product"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product_specification">Product Specification</Label>
                        <Textarea
                          id="product_specification"
                          value={formData.product_specification}
                          onChange={(e) => setFormData(prev => ({ ...prev, product_specification: e.target.value }))}
                          placeholder="Size, color, brand, model, or any other specifications..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Staff & Submitter Info */}
            <Card>
              <CardHeader>
                <CardTitle>Submitter Information</CardTitle>
                <CardDescription>Who is raising this requirement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff_name">Staff Name</Label>
                    <Input
                      id="staff_name"
                      value={formData.staff_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, staff_name: e.target.value }))}
                      placeholder="Name of staff raising this need"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submitter_email">Contact Email</Label>
                    <Input
                      id="submitter_email"
                      type="email"
                      value={formData.submitter_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, submitter_email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Attachments */}
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
                <CardDescription>Upload quotations and product photos for reference</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <NeedAttachmentUpload
                  type="quotation"
                  existingUrls={formData.quotation_urls || []}
                  onUrlsChange={(urls) => setFormData(prev => ({ ...prev, quotation_urls: urls }))}
                  label="Quotation Documents"
                  description="Upload quotations, invoices, or price documents (PDF, images)"
                  maxFiles={5}
                />
                
                <NeedAttachmentUpload
                  type="photo"
                  existingUrls={formData.photo_urls || []}
                  onUrlsChange={(urls) => setFormData(prev => ({ ...prev, photo_urls: urls }))}
                  label="Product Photos"
                  description="Upload product images for purchase reference"
                  maxFiles={10}
                />
              </CardContent>
            </Card>

            {/* Date & Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle>Scheduling</CardTitle>
                <CardDescription>Set when this need should be fulfilled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ ...prev, date }));
                            setDateOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {formErrors.date && (
                    <p className="text-sm text-destructive">{formErrors.date}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Help Mode *</Label>
                  <RadioGroup
                    value={formData.help_mode}
                    onValueChange={(value: HelpMode) => setFormData(prev => ({ 
                      ...prev, 
                      help_mode: value,
                      recurring_frequency: value === 'ONE_TIME' ? 'none' : prev.recurring_frequency === 'none' ? 'monthly' : prev.recurring_frequency
                    }))}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ONE_TIME" id="one_time" />
                      <Label htmlFor="one_time" className="font-normal cursor-pointer">One-time</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="RECURRING" id="recurring" />
                      <Label htmlFor="recurring" className="font-normal cursor-pointer">Recurring</Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.help_mode === 'RECURRING' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select 
                        value={formData.recurring_frequency} 
                        onValueChange={(value: RecurringFrequency) => setFormData(prev => ({ ...prev, recurring_frequency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>End Date (Optional)</Label>
                      <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.recurring_end_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.recurring_end_date 
                              ? format(formData.recurring_end_date, "PPP") 
                              : "No end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.recurring_end_date}
                            onSelect={(date) => {
                              setFormData(prev => ({ ...prev, recurring_end_date: date }));
                              setEndDateOpen(false);
                            }}
                            disabled={(date) => date < formData.date}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fulfillment Details (Needs Addressed) - Only show when editing */}
            {isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle>Approval Status</CardTitle>
                  <CardDescription>
                    Set the approval status for this requirement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Approval Status *</Label>
                    <RadioGroup
                      value={formData.approval_status}
                      onValueChange={(value: 'PENDING' | 'APPROVED' | 'REJECTED') => 
                        setFormData(prev => ({ ...prev, approval_status: value }))
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PENDING" id="pending" />
                        <Label htmlFor="pending" className="font-normal cursor-pointer text-amber-600">Pending</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="APPROVED" id="approved" />
                        <Label htmlFor="approved" className="font-normal cursor-pointer text-green-600">Approved</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="REJECTED" id="rejected" />
                        <Label htmlFor="rejected" className="font-normal cursor-pointer text-destructive">Not Approved</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="approval_notes">Approval Notes</Label>
                    <Textarea
                      id="approval_notes"
                      placeholder="Add any notes about the approval decision..."
                      value={formData.approval_notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, approval_notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fulfillment Details (Needs Addressed) - Only show when editing */}
            {isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle>Needs Addressed (Email/Payment Details)</CardTitle>
                  <CardDescription>
                    Record payment confirmations, email details, or other fulfillment information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="fulfillment_details">Fulfillment Details</Label>
                    <Textarea
                      id="fulfillment_details"
                      placeholder="e.g., 25.04.2025 - ₹53,751 paid via NEFT, Ref: TXN12345"
                      value={formData.fulfillment_details}
                      onChange={(e) => setFormData(prev => ({ ...prev, fulfillment_details: e.target.value }))}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      This field tracks how the need was addressed (payment details, email communications, etc.)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(needsListPath)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? 'Update Requirement' : 'Create Requirement'}
              </Button>
            </div>
          </div>
        </form>
        )}
      </div>
    </MainLayout>
  );
};

export default NeedForm;
