import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { ArrowLeft, Home, Save, MapPin, Users, Images, LogIn, KeyRound, Copy, Eye, EyeOff } from 'lucide-react';
import { useHome, useTrusts } from '@/hooks/useHomes';
import { useHomeTypes } from '@/hooks/useHomeTypes';
import { PhotoGalleryManager } from '@/components/homes/PhotoGalleryManager';
import { StagedPhotoUploader } from '@/components/homes/StagedPhotoUploader';
import { CredentialsModal } from '@/components/users/CredentialsModal';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

type HomeTypeEnum = Database['public']['Enums']['home_type'];

const homeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.string().min(1, 'Please select a home type'),
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
  image_url: z.string().url().optional().or(z.literal('')),
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
    image_url: '',
    contact_details: '',
    supported_by: '',
  });

  // Set default home type when loaded (for new homes)
  useEffect(() => {
    if (!isEditing && homeTypes && homeTypes.length > 0 && !formData.type) {
      setFormData(prev => ({ ...prev, type: homeTypes[0].key }));
    }
  }, [homeTypes, isEditing, formData.type]);
  
  const [errors, setErrors] = useState<Partial<Record<keyof HomeFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [credentialsModal, setCredentialsModal] = useState<{ open: boolean; email: string; password: string } | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCreatingLogin, setIsCreatingLogin] = useState(false);
  const [homeLoginEmail, setHomeLoginEmail] = useState('');
  const [homeLoginPassword, setHomeLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginFieldsInitialized, setLoginFieldsInitialized] = useState(false);
  const [editLoginEmail, setEditLoginEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [originalLoginEmail, setOriginalLoginEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showCustomPassword, setShowCustomPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Initialize login fields for homes without credentials (both new and edit)
  useEffect(() => {
    if (!loginFieldsInitialized && formData.name) {
      const shouldInit = !isEditing || (isEditing && existingHome && !existingHome.primary_warden_id);
      if (shouldInit) {
        setHomeLoginEmail(`${formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}@chellamuthu.home`);
        setHomeLoginPassword(generatePassword());
        setLoginFieldsInitialized(true);
      }
    }
  }, [isEditing, existingHome, loginFieldsInitialized, formData.name]);

  // Keep email in sync with home name for new homes (before first manual edit)
  useEffect(() => {
    if (!isEditing && formData.name && loginFieldsInitialized) {
      setHomeLoginEmail(`${formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}@chellamuthu.home`);
    }
  }, [formData.name, isEditing]);

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleResetPassword = async () => {
    if (!existingHome?.primary_warden_id) return;
    setIsResettingPassword(true);
    try {
      const newPassword = generatePassword();
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: existingHome.primary_warden_id, newPassword },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      const wardenEmail = (existingHome as any).profiles?.email || 'Unknown';
      setCredentialsModal({ open: true, email: wardenEmail, password: newPassword });
      toast.success('Password reset successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleUpdateCustomPassword = async () => {
    if (!existingHome?.primary_warden_id || customPassword.length < 8) return;
    setIsUpdatingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: existingHome.primary_warden_id, newPassword: customPassword },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      const wardenEmail = (existingHome as any).profiles?.email || editLoginEmail || 'Unknown';
      setCredentialsModal({ open: true, email: wardenEmail, password: customPassword });
      setCustomPassword('');
      toast.success('Password updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Initialize editLoginEmail when existing home loads
  useEffect(() => {
    if (isEditing && existingHome?.primary_warden_id) {
      const email = (existingHome as any).profiles?.email || '';
      setEditLoginEmail(email);
      setOriginalLoginEmail(email);
    }
  }, [isEditing, existingHome]);

  const handleUpdateEmail = async () => {
    if (!existingHome?.primary_warden_id || !editLoginEmail.trim()) return;
    if (editLoginEmail === originalLoginEmail) {
      toast.info('Email has not changed');
      return;
    }
    setIsUpdatingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: existingHome.primary_warden_id, newEmail: editLoginEmail.trim() },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOriginalLoginEmail(editLoginEmail.trim());
      queryClient.invalidateQueries({ queryKey: ['home'] });
      toast.success('Login email updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };
  useEffect(() => {
    if (!isEditing && trusts && trusts.length > 0 && !formData.trust_id) {
      setFormData(prev => ({ ...prev, trust_id: trusts[0].id }));
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
        image_url: existingHome.image_url || '',
        contact_details: existingHome.contact_details || '',
        supported_by: existingHome.supported_by || '',
      });
    }
  }, [isEditing, existingHome]);

  const handleChange = (field: keyof HomeFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = homeSchema.parse(formData);
      
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
        image_url: validated.image_url || null,
        contact_details: validated.contact_details || null,
        supported_by: validated.supported_by || null,
      };

      if (isEditing && homeId) {
        const { error } = await supabase
          .from('homes')
          .update(homeData)
          .eq('id', homeId);

        if (error) throw error;
        toast.success('Home updated successfully');
        queryClient.invalidateQueries({ queryKey: ['homes'] });
        navigate('/super-admin/homes');
      } else {
        const { data, error } = await supabase
          .from('homes')
          .insert(homeData)
          .select('id')
          .single();

        if (error) throw error;
        
        const newHomeId = data.id;
        
        // Upload pending photos if any
        if (pendingPhotos.length > 0) {
          toast.info(`Uploading ${pendingPhotos.length} photo(s)...`);
          
          for (let i = 0; i < pendingPhotos.length; i++) {
            const file = pendingPhotos[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${i}.${fileExt}`;
            const filePath = `${newHomeId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('home-photos')
              .upload(filePath, file);

            if (uploadError) {
              console.error('Failed to upload photo:', uploadError);
              continue;
            }

            const { data: urlData } = supabase.storage
              .from('home-photos')
              .getPublicUrl(filePath);

            await supabase.from('home_photos').insert({
              home_id: newHomeId,
              url: urlData.publicUrl,
              display_order: i,
              is_primary: i === 0,
            });
          }
        }
        
        // Create login credentials using the user-entered email/password
        const finalEmail = homeLoginEmail || `${slugify(validated.name)}@chellamuthu.home`;
        const finalPassword = homeLoginPassword || generatePassword();
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const { data: userData, error: userError } = await supabase.functions.invoke('create-user', {
            body: {
              name: validated.name,
              email: finalEmail,
              password: finalPassword,
              role: 'warden',
              home_id: newHomeId,
              trust_id: validated.trust_id,
            },
            headers: { Authorization: `Bearer ${session?.access_token}` },
          });
          
          if (userError) throw userError;
          
          // Update home with primary_warden_id
          await supabase
            .from('homes')
            .update({ primary_warden_id: userData.user_id })
            .eq('id', newHomeId);
          
          setCredentialsModal({ open: true, email: finalEmail, password: finalPassword });
        } catch (credError: any) {
          console.error('Failed to create home login:', credError);
          toast.error('Home created but login creation failed: ' + (credError.message || 'Unknown error'));
        }
        
        toast.success('Home created successfully!');
        queryClient.invalidateQueries({ queryKey: ['homes'] });
      }
    } catch (error: any) {
      console.error('Error saving home:', error);
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof HomeFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof HomeFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Please fix the form errors');
      } else {
        const message = error?.message || error?.error?.message || 'An unexpected error occurred';
        toast.error(message);
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/homes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? 'Edit Home' : 'Add New Home'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Update home information' : 'Create a new care home'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Home name, type, and trust assignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Home Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter home name"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Home Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => handleChange('type', value)}
                    disabled={loadingHomeTypes}
                  >
                    <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                      <SelectValue placeholder={loadingHomeTypes ? 'Loading...' : 'Select type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {homeTypes?.map(ht => (
                        <SelectItem key={ht.id} value={ht.key}>{ht.label}</SelectItem>
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
                    {trusts?.map(trust => (
                      <SelectItem key={trust.id} value={trust.id}>{trust.name}</SelectItem>
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
                  placeholder="Describe the home's mission and activities..."
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
                    placeholder="e.g., Phone: +91 98765 43210, Email: contact@home.org"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supported_by">Supported By</Label>
                  <Input
                    id="supported_by"
                    value={formData.supported_by || ''}
                    onChange={(e) => handleChange('supported_by', e.target.value)}
                    placeholder="e.g., Lions Club, Corporate sponsors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Capacity */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Capacity
              </CardTitle>
              <CardDescription>Number of residents the home can accommodate by gender</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Children Capacity */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Children Capacity</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity_children_male" className="text-sm text-muted-foreground">Male</Label>
                    <Input
                      id="capacity_children_male"
                      type="number"
                      min="0"
                      value={formData.capacity_children_male}
                      onChange={(e) => handleChange('capacity_children_male', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={errors.capacity_children_male ? 'border-destructive' : ''}
                    />
                    {errors.capacity_children_male && <p className="text-xs text-destructive">{errors.capacity_children_male}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity_children_female" className="text-sm text-muted-foreground">Female</Label>
                    <Input
                      id="capacity_children_female"
                      type="number"
                      min="0"
                      value={formData.capacity_children_female}
                      onChange={(e) => handleChange('capacity_children_female', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={errors.capacity_children_female ? 'border-destructive' : ''}
                    />
                    {errors.capacity_children_female && <p className="text-xs text-destructive">{errors.capacity_children_female}</p>}
                  </div>
                </div>
              </div>

              {/* Elderly Capacity */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Elderly Capacity</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity_elderly_male" className="text-sm text-muted-foreground">Male</Label>
                    <Input
                      id="capacity_elderly_male"
                      type="number"
                      min="0"
                      value={formData.capacity_elderly_male}
                      onChange={(e) => handleChange('capacity_elderly_male', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={errors.capacity_elderly_male ? 'border-destructive' : ''}
                    />
                    {errors.capacity_elderly_male && <p className="text-xs text-destructive">{errors.capacity_elderly_male}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity_elderly_female" className="text-sm text-muted-foreground">Female</Label>
                    <Input
                      id="capacity_elderly_female"
                      type="number"
                      min="0"
                      value={formData.capacity_elderly_female}
                      onChange={(e) => handleChange('capacity_elderly_female', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={errors.capacity_elderly_female ? 'border-destructive' : ''}
                    />
                    {errors.capacity_elderly_female && <p className="text-xs text-destructive">{errors.capacity_elderly_female}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
              <CardDescription>Home location details</CardDescription>
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
                    placeholder="Enter city"
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
                    placeholder="Enter state"
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
                    placeholder="Enter country"
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
                    placeholder="Enter pincode"
                    className={errors.pincode ? 'border-destructive' : ''}
                  />
                  {errors.pincode && <p className="text-xs text-destructive">{errors.pincode}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Gallery */}
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
                <StagedPhotoUploader 
                  files={pendingPhotos} 
                  onFilesChange={setPendingPhotos} 
                />
              )}
            </CardContent>
          </Card>

          {/* Home Login Credentials */}
          <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  Home Login Credentials
                </CardTitle>
                <CardDescription>Login credentials for accessing this home's dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingHome?.primary_warden_id ? (
                  <>
                    <div className="space-y-2">
                      <Label>Login Email</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={editLoginEmail} 
                          onChange={(e) => setEditLoginEmail(e.target.value)}
                          className="font-mono" 
                          placeholder="Login email"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (editLoginEmail) {
                              navigator.clipboard.writeText(editLoginEmail);
                              toast.success('Email copied!');
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {editLoginEmail !== originalLoginEmail && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleUpdateEmail}
                          disabled={isUpdatingEmail}
                          className="mt-1"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isUpdatingEmail ? 'Updating...' : 'Update Email'}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Set Custom Password</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showCustomPassword ? 'text' : 'password'}
                            value={customPassword}
                            onChange={(e) => setCustomPassword(e.target.value)}
                            placeholder="Enter new password (min 8 chars)"
                            className="font-mono pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowCustomPassword(!showCustomPassword)}
                          >
                            {showCustomPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleUpdateCustomPassword}
                          disabled={isUpdatingPassword || customPassword.length < 8}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                      {customPassword.length > 0 && customPassword.length < 8 && (
                        <p className="text-xs text-destructive">Password must be at least 8 characters</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetPassword}
                      disabled={isResettingPassword}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      {isResettingPassword ? 'Resetting...' : 'Auto-Generate New Password'}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {isEditing ? 'No login credentials have been created for this home yet. Enter or customize the email and password below.' : 'These credentials will be created when you save the home. You can customize them below.'}
                    </p>
                    <div className="space-y-2">
                      <Label>Login Email</Label>
                      <Input
                        value={homeLoginEmail}
                        onChange={(e) => setHomeLoginEmail(e.target.value)}
                        placeholder="e.g. home-name@chellamuthu.home"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Login Password</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={homeLoginPassword}
                            onChange={(e) => setHomeLoginPassword(e.target.value)}
                            placeholder="Enter password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setHomeLoginPassword(generatePassword())}
                        >
                          Generate
                        </Button>
                      </div>
                    </div>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="default"
                        onClick={async () => {
                          if (!homeId || !homeLoginEmail || !homeLoginPassword) {
                            toast.error('Please enter both email and password');
                            return;
                          }
                          if (homeLoginPassword.length < 8) {
                            toast.error('Password must be at least 8 characters');
                            return;
                          }
                          setIsCreatingLogin(true);
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const { data: userData, error: userError } = await supabase.functions.invoke('create-user', {
                              body: {
                                name: formData.name,
                                email: homeLoginEmail,
                                password: homeLoginPassword,
                                role: 'warden',
                                home_id: homeId,
                                trust_id: formData.trust_id,
                              },
                              headers: { Authorization: `Bearer ${session?.access_token}` },
                            });
                            if (userError) throw userError;
                            await supabase
                              .from('homes')
                              .update({ primary_warden_id: userData.user_id })
                              .eq('id', homeId);
                            setCredentialsModal({ open: true, email: homeLoginEmail, password: homeLoginPassword });
                            queryClient.invalidateQueries({ queryKey: ['home', homeId] });
                            toast.success('Home login created successfully!');
                          } catch (err: any) {
                            toast.error(err.message || 'Failed to create home login');
                          } finally {
                            setIsCreatingLogin(false);
                          }
                        }}
                        disabled={isCreatingLogin}
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        {isCreatingLogin ? 'Creating...' : 'Create Home Login'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/super-admin/homes')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Home' : 'Create Home'}
            </Button>
          </div>
        </form>

        {credentialsModal && (
          <CredentialsModal
            open={credentialsModal.open}
            onClose={() => {
              setCredentialsModal(null);
              if (!isEditing) {
                navigate('/super-admin/homes');
              }
            }}
            email={credentialsModal.email}
            password={credentialsModal.password}
            userName={formData.name}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default HomeForm;
