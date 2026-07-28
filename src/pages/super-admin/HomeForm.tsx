import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Home, Save, MapPin, Users, Images, UserCheck, Plus, ExternalLink } from 'lucide-react';
import { useHome, useTrusts } from '@/hooks/useHomes';
import { useHomeTypes } from '@/hooks/useHomeTypes';
import { useUsers } from '@/hooks/useUsers';
import { PhotoGalleryManager } from '@/components/homes/PhotoGalleryManager';
import { StagedPhotoUploader } from '@/components/homes/StagedPhotoUploader';
import { HomeMainImageUpload } from '@/components/homes/HomeMainImageUpload';
import { AddSocialWorkerDialog } from '@/components/homes/AddSocialWorkerDialog';
import { assignPrimarySocialWorker } from '@/lib/assignPrimarySocialWorker';
import { uploadHomeImageFile, insertHomePhotoRecord } from '@/lib/homePhotoUpload';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

type HomeTypeEnum = Database['public']['Enums']['home_type'];

const homeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.string().min(1, 'Please select a project type'),
  trust_id: z.string().uuid('Please select a trust'),
  description: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().min(2, 'Country is required'),
  pincode: z.string().min(5, 'Valid pincode is required'),
  capacity_children_male: z.number().min(0, 'Must be 0 or greater'),
  capacity_children_female: z.number().min(0, 'Must be 0 or greater'),
  capacity_elderly_male: z.number().min(0, 'Must be 0 or greater'),
  capacity_elderly_female: z.number().min(0, 'Must be 0 or greater'),
  contact_details: z.string().optional(),
  supported_by: z.string().optional(),
});

type HomeFormData = z.infer<typeof homeSchema>;

const HomeForm = () => {
  const navigate = useNavigate();
  const { homeId } = useParams();
  const queryClient = useQueryClient();
  const isEditing = Boolean(homeId);

  const { data: existingHome, isLoading: loadingHome } = useHome(homeId || null);
  const { data: trusts, isLoading: loadingTrusts } = useTrusts();
  const { data: homeTypes, isLoading: loadingHomeTypes } = useHomeTypes();
  const { data: users = [], isLoading: loadingUsers } = useUsers();

  const [formData, setFormData] = useState<HomeFormData>({
    name: '',
    type: '',
    trust_id: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    capacity_children_male: 0,
    capacity_children_female: 0,
    capacity_elderly_male: 0,
    capacity_elderly_female: 0,
    contact_details: '',
    supported_by: '',
  });

  const [selectedSocialWorkerId, setSelectedSocialWorkerId] = useState('');
  const [socialWorkerError, setSocialWorkerError] = useState<string | undefined>();
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);

  useEffect(() => {
    if (!isEditing && homeTypes && homeTypes.length > 0 && !formData.type) {
      setFormData((prev) => ({ ...prev, type: homeTypes[0].key }));
    }
  }, [homeTypes, isEditing, formData.type]);

  const [errors, setErrors] = useState<Partial<Record<keyof HomeFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingMainImage, setPendingMainImage] = useState<File | null>(null);
  const [mainImageCleared, setMainImageCleared] = useState(false);

  useEffect(() => {
    if (!isEditing && trusts && trusts.length > 0 && !formData.trust_id) {
      setFormData((prev) => ({ ...prev, trust_id: trusts[0].id }));
    }
  }, [trusts, isEditing, formData.trust_id]);

  useEffect(() => {
    if (isEditing && existingHome) {
      setFormData({
        name: existingHome.name,
        type: existingHome.type,
        trust_id: existingHome.trust_id,
        description: existingHome.description || '',
        address: existingHome.address,
        city: existingHome.city,
        state: existingHome.state,
        country: existingHome.country,
        pincode: existingHome.pincode,
        capacity_children_male: existingHome.capacity_children_male || 0,
        capacity_children_female: existingHome.capacity_children_female || 0,
        capacity_elderly_male: existingHome.capacity_elderly_male || 0,
        capacity_elderly_female: existingHome.capacity_elderly_female || 0,
        contact_details: existingHome.contact_details || '',
        supported_by: existingHome.supported_by || '',
      });
      if (existingHome.primary_warden_id) {
        setSelectedSocialWorkerId(existingHome.primary_warden_id);
      }
      setMainImageCleared(false);
      setPendingMainImage(null);
    }
  }, [isEditing, existingHome]);

  const availableSocialWorkers = useMemo(() => {
    if (!formData.trust_id) return [];
    return users.filter((user) => {
      if (user.role !== 'warden') return false;
      if (user.trust_id && user.trust_id !== formData.trust_id) return false;
      return true;
    });
  }, [users, formData.trust_id]);

  const selectedSocialWorker = users.find((u) => u.id === selectedSocialWorkerId);
  const selectedTrust = trusts?.find((t) => t.id === formData.trust_id);

  const handleChange = (field: keyof HomeFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (field === 'trust_id' && typeof value === 'string') {
      const worker = users.find((u) => u.id === selectedSocialWorkerId);
      if (worker?.trust_id && worker.trust_id !== value) {
        setSelectedSocialWorkerId('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSocialWorkerError(undefined);

    try {
      if (!selectedSocialWorkerId) {
        setSocialWorkerError('Please select a social worker for this project');
        toast.error('Please select a social worker');
        setIsSubmitting(false);
        return;
      }

      const validated = homeSchema.parse(formData);

      let imageUrl: string | null = mainImageCleared ? null : existingHome?.image_url ?? null;
      if (pendingMainImage) {
        if (isEditing && homeId) {
          imageUrl = await uploadHomeImageFile(homeId, pendingMainImage, 'main');
        }
      }

      const homeData = {
        name: validated.name,
        type: validated.type as HomeTypeEnum,
        trust_id: validated.trust_id,
        description: validated.description || null,
        address: validated.address,
        city: validated.city,
        state: validated.state,
        country: validated.country,
        pincode: validated.pincode,
        capacity_children_male: validated.capacity_children_male,
        capacity_children_female: validated.capacity_children_female,
        capacity_elderly_male: validated.capacity_elderly_male,
        capacity_elderly_female: validated.capacity_elderly_female,
        image_url: imageUrl,
        contact_details: validated.contact_details || null,
        supported_by: validated.supported_by || null,
      };

      if (isEditing && homeId) {
        const { error } = await supabase.from('homes').update(homeData).eq('id', homeId);
        if (error) throw error;

        await assignPrimarySocialWorker({
          homeId,
          trustId: validated.trust_id,
          socialWorkerId: selectedSocialWorkerId,
          previousSocialWorkerId: existingHome?.primary_warden_id,
        });

        toast.success('Project updated successfully');
        queryClient.invalidateQueries({ queryKey: ['homes'] });
        queryClient.invalidateQueries({ queryKey: ['home', homeId] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        navigate('/super-admin/projects');
      } else {
        const { data, error } = await supabase.from('homes').insert(homeData).select('id').single();
        if (error) throw error;

        const newHomeId = data.id;

        if (pendingMainImage) {
          const mainUrl = await uploadHomeImageFile(newHomeId, pendingMainImage, 'main');
          await supabase.from('homes').update({ image_url: mainUrl }).eq('id', newHomeId);
        }

        if (pendingPhotos.length > 0) {
          toast.info(`Uploading ${pendingPhotos.length} photo(s)...`);
          for (let i = 0; i < pendingPhotos.length; i++) {
            try {
              const url = await uploadHomeImageFile(newHomeId, pendingPhotos[i]);
              await insertHomePhotoRecord(newHomeId, url, { displayOrder: i, isPrimary: i === 0 });
            } catch (uploadError) {
              console.error('Failed to upload photo:', uploadError);
            }
          }
        }

        await assignPrimarySocialWorker({
          homeId: newHomeId,
          trustId: validated.trust_id,
          socialWorkerId: selectedSocialWorkerId,
        });

        toast.success('Project created and social worker assigned');
        queryClient.invalidateQueries({ queryKey: ['homes'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        navigate('/super-admin/projects');
      }
    } catch (error: unknown) {
      console.error('Error saving home:', error);
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof HomeFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof HomeFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Please fix the form errors');
      } else if (error instanceof Error) {
        toast.error(error.message || 'An unexpected error occurred');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing && loadingHome) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 max-w-3xl">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{isEditing ? 'Edit Project' : 'Add New Project'}</h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Update project information' : 'Create a new project'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Project name, type, and trust assignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter project name"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Project Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleChange('type', value)}
                    disabled={loadingHomeTypes}
                  >
                    <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                      <SelectValue placeholder={loadingHomeTypes ? 'Loading...' : 'Select type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {homeTypes?.map((ht) => (
                        <SelectItem key={ht.id} value={ht.key}>
                          {ht.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trust_id">Assigned Trust *</Label>
                <Select
                  value={formData.trust_id}
                  onValueChange={(value) => handleChange('trust_id', value)}
                  disabled={loadingTrusts}
                >
                  <SelectTrigger className={errors.trust_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder={loadingTrusts ? 'Loading trusts...' : 'Select a trust'} />
                  </SelectTrigger>
                  <SelectContent>
                    {trusts?.map((trust) => (
                      <SelectItem key={trust.id} value={trust.id}>
                        {trust.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.trust_id && <p className="text-xs text-destructive">{errors.trust_id}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">About the Project</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the project's mission and activities..."
                  rows={4}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_details">Contact Details</Label>
                  <Input
                    id="contact_details"
                    value={formData.contact_details || ''}
                    onChange={(e) => handleChange('contact_details', e.target.value)}
                    placeholder="e.g., Phone: +91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supported_by">Supported By</Label>
                  <Input
                    id="supported_by"
                    value={formData.supported_by || ''}
                    onChange={(e) => handleChange('supported_by', e.target.value)}
                    placeholder="e.g., Lions Club"
                  />
                </div>
              </div>
              <HomeMainImageUpload
                previewUrl={mainImageCleared ? null : existingHome?.image_url}
                pendingFile={pendingMainImage}
                onPendingFileChange={(file) => {
                  setPendingMainImage(file);
                  setMainImageCleared(false);
                }}
                onClearExisting={() => setMainImageCleared(true)}
                label="Main image"
              />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Primary Social Worker
              </CardTitle>
              <CardDescription>
                Select the staff member who manages this home. Login credentials are managed in Staff.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!formData.trust_id ? (
                <p className="text-sm text-muted-foreground">Select a trust first to choose a social worker.</p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={selectedSocialWorkerId || undefined}
                      onValueChange={(value) => {
                        setSelectedSocialWorkerId(value);
                        setSocialWorkerError(undefined);
                      }}
                      disabled={loadingUsers}
                    >
                      <SelectTrigger className={`flex-1 ${socialWorkerError ? 'border-destructive' : ''}`}>
                        <SelectValue
                          placeholder={loadingUsers ? 'Loading social workers...' : 'Select social worker'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSocialWorkers.length === 0 ? (
                          <SelectItem value="__none__" disabled>
                            No available social workers — add one below
                          </SelectItem>
                        ) : (
                          availableSocialWorkers.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name} ({worker.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setAddWorkerOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Social Worker
                    </Button>
                  </div>
                  {socialWorkerError && <p className="text-xs text-destructive">{socialWorkerError}</p>}
                  {availableSocialWorkers.length === 0 && !loadingUsers && (
                    <p className="text-sm text-muted-foreground">
                      No social workers found for this trust. Use &quot;Add Social Worker&quot; to create one without leaving this form.
                    </p>
                  )}
                  {selectedSocialWorker && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                      <p className="font-medium">{selectedSocialWorker.name}</p>
                      <p className="text-muted-foreground">{selectedSocialWorker.email}</p>
                      {selectedSocialWorker.phone && (
                        <p className="text-muted-foreground">{selectedSocialWorker.phone}</p>
                      )}
                      <Button variant="link" className="h-auto p-0 text-xs" asChild>
                        <Link to={`/super-admin/staff/${selectedSocialWorker.id}/edit`}>
                          Manage credentials in Staff
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Capacity
              </CardTitle>
              <CardDescription>Number of residents the home can accommodate by gender</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Children Capacity</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity_children_male" className="text-sm text-muted-foreground">
                      Male
                    </Label>
                    <Input
                      id="capacity_children_male"
                      type="number"
                      min="0"
                      value={formData.capacity_children_male}
                      onChange={(e) => handleChange('capacity_children_male', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity_children_female" className="text-sm text-muted-foreground">
                      Female
                    </Label>
                    <Input
                      id="capacity_children_female"
                      type="number"
                      min="0"
                      value={formData.capacity_children_female}
                      onChange={(e) => handleChange('capacity_children_female', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-medium">Elderly Capacity</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity_elderly_male" className="text-sm text-muted-foreground">
                      Male
                    </Label>
                    <Input
                      id="capacity_elderly_male"
                      type="number"
                      min="0"
                      value={formData.capacity_elderly_male}
                      onChange={(e) => handleChange('capacity_elderly_male', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity_elderly_female" className="text-sm text-muted-foreground">
                      Female
                    </Label>
                    <Input
                      id="capacity_elderly_female"
                      type="number"
                      min="0"
                      value={formData.capacity_elderly_female}
                      onChange={(e) => handleChange('capacity_elderly_female', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
              <CardDescription>Project location details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Enter street address"
                  className={errors.address ? 'border-destructive' : ''}
                />
                {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className={errors.city ? 'border-destructive' : ''}
                  />
                  {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className={errors.state ? 'border-destructive' : ''}
                  />
                  {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className={errors.country ? 'border-destructive' : ''}
                  />
                  {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    className={errors.pincode ? 'border-destructive' : ''}
                  />
                  {errors.pincode && <p className="text-xs text-destructive">{errors.pincode}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Images className="h-5 w-5" />
                Photo Gallery
              </CardTitle>
              <CardDescription>Add multiple photos to showcase this home</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing && homeId ? (
                <PhotoGalleryManager homeId={homeId} />
              ) : (
                <StagedPhotoUploader files={pendingPhotos} onFilesChange={setPendingPhotos} />
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/super-admin/projects')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>

        {formData.trust_id && (
          <AddSocialWorkerDialog
            open={addWorkerOpen}
            onOpenChange={setAddWorkerOpen}
            trustId={formData.trust_id}
            trustName={selectedTrust?.name}
            onCreated={(userId) => {
              setSelectedSocialWorkerId(userId);
              setSocialWorkerError(undefined);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default HomeForm;
