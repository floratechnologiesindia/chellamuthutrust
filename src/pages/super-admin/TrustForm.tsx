import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';

const trustSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  registration_number: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().min(2, 'Country is required'),
  pincode: z.string().min(5, 'Valid pincode is required'),
  contact_phone: z.string().min(10, 'Valid phone number is required'),
  contact_email: z.string().email('Valid email is required'),
  image_url: z.string().url().optional().or(z.literal('')),
});

type TrustFormData = z.infer<typeof trustSchema>;

const TrustForm = () => {
  const navigate = useNavigate();
  const { trustId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = Boolean(trustId);

  const [formData, setFormData] = useState<TrustFormData>({
    name: '',
    registration_number: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    contact_phone: '',
    contact_email: '',
    image_url: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TrustFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTrust, setIsLoadingTrust] = useState(false);

  useEffect(() => {
    if (isEditing && trustId) {
      setIsLoadingTrust(true);
      supabase
        .from('trusts')
        .select('*')
        .eq('id', trustId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            toast.error('Failed to load trust');
            navigate('/super-admin/trusts');
            return;
          }
          if (data) {
            setFormData({
              name: data.name,
              registration_number: data.registration_number || '',
              description: data.description || '',
              address: data.address,
              city: data.city,
              state: data.state,
              country: data.country,
              pincode: data.pincode,
              contact_phone: data.contact_phone,
              contact_email: data.contact_email,
              image_url: data.image_url || '',
            });
          }
          setIsLoadingTrust(false);
        });
    }
  }, [isEditing, trustId, navigate]);

  const handleChange = (field: keyof TrustFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = trustSchema.parse(formData);
      
      const payload = {
        name: validated.name,
        registration_number: validated.registration_number || null,
        description: validated.description,
        address: validated.address,
        city: validated.city,
        state: validated.state,
        country: validated.country,
        pincode: validated.pincode,
        contact_phone: validated.contact_phone,
        contact_email: validated.contact_email,
        image_url: validated.image_url || null,
      };

      if (isEditing && trustId) {
        const { error } = await supabase
          .from('trusts')
          .update(payload)
          .eq('id', trustId);
        if (error) throw error;
        toast.success('Trust updated successfully');
      } else {
        const { error } = await supabase
          .from('trusts')
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast.success('Trust created successfully');
      }
      
      queryClient.invalidateQueries({ queryKey: ['trusts'] });
      navigate('/super-admin/trusts');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof TrustFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof TrustFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Please fix the form errors');
      } else {
        toast.error(error.message || 'Failed to save trust');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/trusts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? 'Edit Trust' : 'Add New Trust'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Update trust information' : 'Create a new trust on the platform'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Trust name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Trust Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter trust name"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Registration Number</Label>
                  <Input
                    id="registration_number"
                    value={formData.registration_number}
                    onChange={(e) => handleChange('registration_number', e.target.value)}
                    placeholder="e.g., CT-2024-001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the trust's mission and activities..."
                  rows={4}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
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

          {/* Address */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>Trust location details</CardDescription>
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

          {/* Contact Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How to reach the trust</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    placeholder="trust@example.org"
                    className={errors.contact_email ? 'border-destructive' : ''}
                  />
                  {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone *</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                    placeholder="+91 9876543210"
                    className={errors.contact_phone ? 'border-destructive' : ''}
                  />
                  {errors.contact_phone && <p className="text-xs text-destructive">{errors.contact_phone}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/super-admin/trusts')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingTrust}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Trust' : 'Create Trust'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default TrustForm;
