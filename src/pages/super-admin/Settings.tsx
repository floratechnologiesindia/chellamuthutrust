import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Plus, Pencil, Trash2, Home, UtensilsCrossed, Sun, Cloud, Moon, Cookie, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFoodSlotPricing, useUpdateFoodSlotPricing, FoodSlotPricing } from '@/hooks/useFoodSlotPricing';
import {
  useAllHomeTypes,
  useCreateHomeType,
  useUpdateHomeType,
  useDeleteHomeType,
  HomeType,
} from '@/hooks/useHomeTypes';
import {
  useAllReligions,
  useCreateReligion,
  useUpdateReligion,
  useDeleteReligion,
  Religion,
} from '@/hooks/useReligions';
import {
  useAllDonorCategories,
  useCreateDonorCategory,
  useUpdateDonorCategory,
  useDeleteDonorCategory,
  DonorCategory,
} from '@/hooks/useDonorCategories';
import { EnhancedCategoriesSection } from '@/components/settings/EnhancedCategoriesSection';

const Settings = () => {
  return (
    <MainLayout>
      <div className="container py-8">
        <SuperAdminNav />
        
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage categories, home types, and subcategories</p>
          </div>
        </div>

        <div className="space-y-6">
          <FoodDistributionPricingSection />
          <HomeTypesSection />
          <ReligionsSection />
          <DonorCategoriesSection />
          <EnhancedCategoriesSection />
        </div>
      </div>
    </MainLayout>
  );
};

// Time slot icons mapping
const TIME_SLOT_ICONS: Record<string, React.ReactNode> = {
  MORNING: <Sun className="h-5 w-5 text-amber-500" />,
  AFTERNOON: <Cloud className="h-5 w-5 text-orange-500" />,
  EVENING: <Moon className="h-5 w-5 text-indigo-500" />,
  REFRESHMENTS: <Cookie className="h-5 w-5 text-pink-500" />,
};

// Food Distribution Pricing Section
const FoodDistributionPricingSection = () => {
  const { data: pricing, isLoading } = useFoodSlotPricing();
  const updatePricing = useUpdateFoodSlotPricing();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<FoodSlotPricing | null>(null);
  const [formData, setFormData] = useState({ price: 0, label: '', description: '' });

  const handleOpenDialog = (item: FoodSlotPricing) => {
    setEditingPricing(item);
    setFormData({
      price: item.price,
      label: item.label,
      description: item.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingPricing) return;
    
    if (formData.price < 0) {
      toast.error('Price cannot be negative');
      return;
    }

    try {
      await updatePricing.mutateAsync({
        id: editingPricing.id,
        price: formData.price,
        label: formData.label,
        description: formData.description || undefined,
      });
      toast.success('Pricing updated successfully');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to update pricing');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Food Distribution Pricing
            </CardTitle>
            <CardDescription>Set prices for each food distribution time slot</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {pricing?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    {TIME_SLOT_ICONS[item.time_slot] || <UtensilsCrossed className="h-5 w-5" />}
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.time_slot}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                      {formatCurrency(item.price)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!pricing || pricing.length === 0) && (
                <p className="text-center py-8 text-muted-foreground">
                  No pricing data found. Please contact support.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingPricing && TIME_SLOT_ICONS[editingPricing.time_slot]}
              Edit {editingPricing?.label} Pricing
            </DialogTitle>
            <DialogDescription>
              Update the price for this food distribution slot
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pricing-label">Label</Label>
              <Input
                id="pricing-label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Breakfast"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing-price">Price (₹) *</Label>
              <Input
                id="pricing-price"
                type="number"
                min={0}
                step={100}
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="e.g., 500"
              />
              <p className="text-xs text-muted-foreground">Price per sponsorship in Indian Rupees</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing-description">Description</Label>
              <Textarea
                id="pricing-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description (optional)"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={updatePricing.isPending}>
              {updatePricing.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Home Types Management Section
const HomeTypesSection = () => {
  const { data: homeTypes, isLoading } = useAllHomeTypes();
  const createHomeType = useCreateHomeType();
  const updateHomeType = useUpdateHomeType();
  const deleteHomeType = useDeleteHomeType();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHomeType, setEditingHomeType] = useState<HomeType | null>(null);
  const [formData, setFormData] = useState({ key: '', label: '', description: '', icon: '' });

  const generateKey = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  };

  const handleOpenDialog = (homeType?: HomeType) => {
    if (homeType) {
      setEditingHomeType(homeType);
      setFormData({
        key: homeType.key,
        label: homeType.label,
        description: homeType.description || '',
        icon: homeType.icon || '',
      });
    } else {
      setEditingHomeType(null);
      setFormData({ key: '', label: '', description: '', icon: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.label || !formData.key) {
      toast.error('Label and Key are required');
      return;
    }

    try {
      if (editingHomeType) {
        await updateHomeType.mutateAsync({
          id: editingHomeType.id,
          key: formData.key,
          label: formData.label,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
        });
        toast.success('Home type updated successfully');
      } else {
        await createHomeType.mutateAsync({
          key: formData.key,
          label: formData.label,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
        });
        toast.success('Home type created successfully');
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save home type');
    }
  };

  const handleToggleActive = async (homeType: HomeType) => {
    try {
      await updateHomeType.mutateAsync({
        id: homeType.id,
        is_active: !homeType.is_active,
      });
      toast.success(`Home type ${homeType.is_active ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to update home type');
    }
  };

  const handleDelete = async (homeType: HomeType) => {
    if (!confirm(`Are you sure you want to delete "${homeType.label}"?`)) return;

    try {
      await deleteHomeType.mutateAsync(homeType.id);
      toast.success('Home type deleted');
    } catch (error) {
      toast.error('Failed to delete home type');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Home Types
            </CardTitle>
            <CardDescription>Manage the types of homes available in the system</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Home Type
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-2">
              {homeTypes?.map((homeType) => (
                <div
                  key={homeType.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <Home className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{homeType.label}</p>
                      <p className="text-sm text-muted-foreground">{homeType.key}</p>
                      {homeType.description && (
                        <p className="text-xs text-muted-foreground mt-1">{homeType.description}</p>
                      )}
                    </div>
                    <Badge variant={homeType.is_active ? 'default' : 'secondary'}>
                      {homeType.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={homeType.is_active ?? false}
                      onCheckedChange={() => handleToggleActive(homeType)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(homeType)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(homeType)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!homeTypes || homeTypes.length === 0) && (
                <p className="text-center py-8 text-muted-foreground">
                  No home types found. Click "Add Home Type" to create one.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Home Type Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHomeType ? 'Edit Home Type' : 'Add Home Type'}</DialogTitle>
            <DialogDescription>
              {editingHomeType ? 'Update home type details' : 'Create a new home type'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ht-label">Label *</Label>
              <Input
                id="ht-label"
                value={formData.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    label,
                    key: editingHomeType ? prev.key : generateKey(label),
                  }));
                }}
                placeholder="e.g., Children Home"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ht-key">Key *</Label>
              <Input
                id="ht-key"
                value={formData.key}
                readOnly
                className="bg-muted"
                placeholder="e.g., children_home"
              />
              <p className="text-xs text-muted-foreground">Auto-generated from label (snake_case)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ht-description">Description</Label>
              <Textarea
                id="ht-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the home type"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createHomeType.isPending || updateHomeType.isPending}>
              {editingHomeType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Religions Management Section
const ReligionsSection = () => {
  const { data: religions, isLoading } = useAllReligions();
  const createReligion = useCreateReligion();
  const updateReligion = useUpdateReligion();
  const deleteReligion = useDeleteReligion();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReligion, setEditingReligion] = useState<Religion | null>(null);
  const [formData, setFormData] = useState({ key: '', label: '', description: '' });

  const generateKey = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  };

  const handleOpenDialog = (religion?: Religion) => {
    if (religion) {
      setEditingReligion(religion);
      setFormData({
        key: religion.key,
        label: religion.label,
        description: religion.description || '',
      });
    } else {
      setEditingReligion(null);
      setFormData({ key: '', label: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.label || !formData.key) {
      toast.error('Label and Key are required');
      return;
    }

    try {
      if (editingReligion) {
        await updateReligion.mutateAsync({
          id: editingReligion.id,
          key: formData.key,
          label: formData.label,
          description: formData.description || undefined,
        });
        toast.success('Religion updated successfully');
      } else {
        await createReligion.mutateAsync({
          key: formData.key,
          label: formData.label,
          description: formData.description || undefined,
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save religion');
    }
  };

  const handleToggleActive = async (religion: Religion) => {
    try {
      await updateReligion.mutateAsync({
        id: religion.id,
        is_active: !religion.is_active,
      });
      toast.success(`Religion ${religion.is_active ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to update religion');
    }
  };

  const handleDelete = async (religion: Religion) => {
    if (!confirm(`Are you sure you want to delete "${religion.label}"?`)) return;

    try {
      await deleteReligion.mutateAsync(religion.id);
    } catch (error) {
      toast.error('Failed to delete religion');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Religions
            </CardTitle>
            <CardDescription>Manage religion options for donor profiles</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Religion
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-2">
              {religions?.map((religion) => (
                <div
                  key={religion.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{religion.label}</p>
                      <p className="text-sm text-muted-foreground">{religion.key}</p>
                      {religion.description && (
                        <p className="text-xs text-muted-foreground mt-1">{religion.description}</p>
                      )}
                    </div>
                    <Badge variant={religion.is_active ? 'default' : 'secondary'}>
                      {religion.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={religion.is_active ?? false}
                      onCheckedChange={() => handleToggleActive(religion)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(religion)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(religion)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!religions || religions.length === 0) && (
                <p className="text-center py-8 text-muted-foreground">
                  No religions found. Click "Add Religion" to create one.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Religion Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReligion ? 'Edit Religion' : 'Add Religion'}</DialogTitle>
            <DialogDescription>
              {editingReligion ? 'Update religion details' : 'Create a new religion option'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="religion-label">Label *</Label>
              <Input
                id="religion-label"
                value={formData.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    label,
                    key: editingReligion ? prev.key : generateKey(label),
                  }));
                }}
                placeholder="e.g., Hinduism"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion-key">Key *</Label>
              <Input
                id="religion-key"
                value={formData.key}
                readOnly
                className="bg-muted"
                placeholder="e.g., hinduism"
              />
              <p className="text-xs text-muted-foreground">Auto-generated from label (snake_case)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion-description">Description</Label>
              <Textarea
                id="religion-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description (optional)"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createReligion.isPending || updateReligion.isPending}>
              {editingReligion ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Badge color options for donor categories
const BADGE_COLORS = [
  { value: 'green', label: 'Green', className: 'bg-green-100 text-green-800' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-100 text-purple-800' },
  { value: 'orange', label: 'Orange', className: 'bg-orange-100 text-orange-800' },
  { value: 'red', label: 'Red', className: 'bg-red-100 text-red-800' },
  { value: 'blue', label: 'Blue', className: 'bg-blue-100 text-blue-800' },
  { value: 'yellow', label: 'Yellow', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'gray', label: 'Gray', className: 'bg-gray-100 text-gray-800' },
];

// Donor Categories Management Section
const DonorCategoriesSection = () => {
  const { data: donorCategories, isLoading } = useAllDonorCategories();
  const createDonorCategory = useCreateDonorCategory();
  const updateDonorCategory = useUpdateDonorCategory();
  const deleteDonorCategory = useDeleteDonorCategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DonorCategory | null>(null);
  const [formData, setFormData] = useState({ key: '', label: '', description: '', color: 'gray' });

  const generateKey = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  };

  const handleOpenDialog = (category?: DonorCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        key: category.key,
        label: category.label,
        description: category.description || '',
        color: category.color || 'gray',
      });
    } else {
      setEditingCategory(null);
      setFormData({ key: '', label: '', description: '', color: 'gray' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.label || !formData.key) {
      toast.error('Label and Key are required');
      return;
    }

    try {
      if (editingCategory) {
        await updateDonorCategory.mutateAsync({
          id: editingCategory.id,
          key: formData.key,
          label: formData.label,
          description: formData.description || undefined,
          color: formData.color || 'gray',
        });
        toast.success('Donor category updated successfully');
      } else {
        await createDonorCategory.mutateAsync({
          key: formData.key,
          label: formData.label,
          description: formData.description || undefined,
          color: formData.color || 'gray',
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save donor category');
    }
  };

  const handleToggleActive = async (category: DonorCategory) => {
    try {
      await updateDonorCategory.mutateAsync({
        id: category.id,
        is_active: !category.is_active,
      });
      toast.success(`Donor category ${category.is_active ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to update donor category');
    }
  };

  const handleDelete = async (category: DonorCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.label}"?`)) return;

    try {
      await deleteDonorCategory.mutateAsync(category.id);
    } catch (error) {
      toast.error('Failed to delete donor category');
    }
  };

  const getColorBadgeClass = (color: string | null) => {
    return BADGE_COLORS.find(c => c.value === color)?.className || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Donor Categories
            </CardTitle>
            <CardDescription>Manage donor category options for donor profiles</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-2">
              {donorCategories?.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{category.label}</p>
                        <Badge className={getColorBadgeClass(category.color)}>
                          {category.color}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{category.key}</p>
                      {category.description && (
                        <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                      )}
                    </div>
                    <Badge variant={category.is_active ? 'default' : 'secondary'}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={category.is_active ?? false}
                      onCheckedChange={() => handleToggleActive(category)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!donorCategories || donorCategories.length === 0) && (
                <p className="text-center py-8 text-muted-foreground">
                  No donor categories found. Click "Add Category" to create one.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donor Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Donor Category' : 'Add Donor Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update donor category details' : 'Create a new donor category option'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dc-label">Label *</Label>
              <Input
                id="dc-label"
                value={formData.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    label,
                    key: editingCategory ? prev.key : generateKey(label),
                  }));
                }}
                placeholder="e.g., Monthly Donor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc-key">Key *</Label>
              <Input
                id="dc-key"
                value={formData.key}
                readOnly
                className="bg-muted"
                placeholder="e.g., monthly"
              />
              <p className="text-xs text-muted-foreground">Auto-generated from label (snake_case)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc-color">Badge Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {BADGE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${color.className.split(' ')[0]}`}></span>
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc-description">Description</Label>
              <Textarea
                id="dc-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description (optional)"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createDonorCategory.isPending || updateDonorCategory.isPending}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Settings;