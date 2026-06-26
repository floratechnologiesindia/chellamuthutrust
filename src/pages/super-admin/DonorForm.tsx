import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import SuperAdminNav from '@/components/layout/SuperAdminNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw, Heart, User, MapPin, FileText } from 'lucide-react';
import { useCreateDonor, useDonor, useUpdateDonor } from '@/hooks/useDonors';
import { useActiveReligions } from '@/hooks/useReligions';
import { useActiveDonorCategories } from '@/hooks/useDonorCategories';
import { useAuth } from '@/contexts/AuthContext';
import { CredentialsModal } from '@/components/users/CredentialsModal';
import { toast } from 'sonner';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const DonorForm = () => {
  const navigate = useNavigate();
  const { donorId } = useParams<{ donorId: string }>();
  const isEditMode = !!donorId;
  
  const { user } = useAuth();
  const createDonor = useCreateDonor();
  const updateDonor = useUpdateDonor();
  const { data: existingDonor, isLoading: isLoadingDonor } = useDonor(donorId);
  const { data: religions } = useActiveReligions();
  const { data: donorCategories } = useActiveDonorCategories();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    organization: '',
    donor_category: '' as 'monthly' | 'yearly' | 'public' | 'csr' | '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    pan_number: '',
    aadhar_number: '',
    requires_80g: false,
    notes: '',
    working_sector: '' as 'private' | 'govt' | 'others' | '',
    designation: '',
    donor_type: '' as 'indian' | 'nri' | 'foreigner' | '',
    religion: '',
    referred_by: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState({ email: '', password: '', name: '' });
  const [showReferredOther, setShowReferredOther] = useState(false);

  // Check if existing referred_by value is a custom one (not in predefined list)
  const predefinedReferrals = ['Existing Donor', 'Social Media', 'Website', 'Event/Program', 'Staff/Employee', 'Word of Mouth', 'Newspaper/Media', 'Corporate Partnership'];

  // Pre-fill form data when editing
  useEffect(() => {
    if (isEditMode && existingDonor) {
      setFormData({
        name: existingDonor.name || '',
        email: existingDonor.email || '',
        phone: existingDonor.phone || '',
        password: '', // Don't pre-fill password in edit mode
        organization: existingDonor.organization || '',
        donor_category: (existingDonor.donor_category as 'monthly' | 'yearly' | 'public' | 'csr') || '',
        address: existingDonor.address || '',
        city: existingDonor.city || '',
        state: existingDonor.state || '',
        pincode: existingDonor.pincode || '',
        pan_number: existingDonor.pan_number || '',
        aadhar_number: existingDonor.aadhar_number || '',
        requires_80g: existingDonor.requires_80g || false,
        notes: existingDonor.notes || '',
        working_sector: (existingDonor.working_sector as 'private' | 'govt' | 'others') || '',
        designation: existingDonor.designation || '',
        donor_type: (existingDonor.donor_type as 'indian' | 'nri' | 'foreigner') || '',
        religion: (existingDonor as any).religion || '',
        referred_by: (existingDonor as any).referred_by || ''
      });
    }
  }, [isEditMode, existingDonor]);

  if (user?.role !== 'super_admin') {
    return (
      <MainLayout>
        <div className="text-center py-8 text-destructive">
          You don't have permission to access this page.
        </div>
      </MainLayout>
    );
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }
    
    // Password only required in create mode
    if (!isEditMode) {
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
    }
    
    if (!formData.donor_category) newErrors.donor_category = 'Donor category is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^[0-9]{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }
    // Validate PAN format if provided
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      newErrors.pan_number = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    // Validate Aadhaar format if provided
    if (formData.aadhar_number && !/^\d{12}$/.test(formData.aadhar_number)) {
      newErrors.aadhar_number = 'Aadhaar must be 12 digits';
    }

    // If 80G is required, both PAN and Aadhaar are mandatory
    if (formData.requires_80g) {
      if (!formData.pan_number.trim()) {
        newErrors.pan_number = 'PAN is required for 80G certificate';
      }
      if (!formData.aadhar_number.trim()) {
        newErrors.aadhar_number = 'Aadhaar is required for 80G certificate';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      if (isEditMode && donorId) {
        // Update existing donor
        await updateDonor.mutateAsync({
          id: donorId,
          data: {
            name: formData.name,
            phone: formData.phone,
            organization: formData.organization || undefined,
            donor_category: formData.donor_category as 'monthly' | 'yearly' | 'public' | 'csr',
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            pan_number: formData.pan_number?.toUpperCase() || undefined,
            aadhar_number: formData.aadhar_number || undefined,
            requires_80g: formData.requires_80g,
            notes: formData.notes || undefined,
            working_sector: formData.working_sector || undefined,
            designation: formData.designation || undefined,
            donor_type: formData.donor_type || undefined,
            religion: formData.religion || undefined,
            referred_by: formData.referred_by || undefined
          }
        });
        navigate('/super-admin/donors');
      } else {
        // Create new donor
        await createDonor.mutateAsync({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          organization: formData.organization || undefined,
          donor_category: formData.donor_category as 'monthly' | 'yearly' | 'public' | 'csr',
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          pan_number: formData.pan_number?.toUpperCase() || undefined,
          aadhar_number: formData.aadhar_number || undefined,
          requires_80g: formData.requires_80g,
          notes: formData.notes || undefined,
          working_sector: formData.working_sector || undefined,
          designation: formData.designation || undefined,
          donor_type: formData.donor_type || undefined,
          religion: formData.religion || undefined,
          referred_by: formData.referred_by || undefined
        });

        setCreatedCredentials({ email: formData.email, password: formData.password, name: formData.name });
        setShowCredentials(true);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCredentialsClose = () => {
    setShowCredentials(false);
    navigate('/super-admin/donors');
  };

  if (isEditMode && isLoadingDonor) {
    return (
      <MainLayout>
        <SuperAdminNav />
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SuperAdminNav />
      
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/donors')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              {isEditMode ? 'Edit Donor' : 'Add New Donor'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Update donor information' : 'Create a new donor account'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Personal details of the donor</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter full name"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@example.com"
                  className={errors.email ? 'border-destructive' : ''}
                  disabled={isEditMode} // Can't change email in edit mode
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                {isEditMode && (
                  <p className="text-xs text-muted-foreground">Email cannot be changed after creation</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization (Optional)</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => handleChange('organization', e.target.value)}
                  placeholder="Company or organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referred_by">Referred Through (Optional)</Label>
                <Select
                  value={formData.referred_by || '__none__'}
                  onValueChange={(value) => {
                    if (value === '__none__') {
                      handleChange('referred_by', '');
                    } else if (value === '__other__') {
                      handleChange('referred_by', '');
                      setShowReferredOther(true);
                    } else {
                      handleChange('referred_by', value);
                      setShowReferredOther(false);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select referral source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    <SelectItem value="Existing Donor">Existing Donor</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Event/Program">Event/Program</SelectItem>
                    <SelectItem value="Staff/Employee">Staff/Employee</SelectItem>
                    <SelectItem value="Word of Mouth">Word of Mouth</SelectItem>
                    <SelectItem value="Newspaper/Media">Newspaper/Media</SelectItem>
                    <SelectItem value="Corporate Partnership">Corporate Partnership</SelectItem>
                    <SelectItem value="__other__">Other</SelectItem>
                  </SelectContent>
                </Select>
                {showReferredOther && (
                  <Input
                    value={formData.referred_by}
                    onChange={(e) => handleChange('referred_by', e.target.value)}
                    placeholder="Please specify referral source"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">Designation (Optional)</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => handleChange('designation', e.target.value)}
                  placeholder="e.g., Manager, Director"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="working_sector">Working Sector (Optional)</Label>
                <Select 
                  value={formData.working_sector} 
                  onValueChange={(value) => handleChange('working_sector', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="govt">Government</SelectItem>
                    <SelectItem value="others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="donor_type">Donor Type (Optional)</Label>
                <Select 
                  value={formData.donor_type} 
                  onValueChange={(value) => handleChange('donor_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indian">Indian</SelectItem>
                    <SelectItem value="nri">NRI</SelectItem>
                    <SelectItem value="foreigner">Foreigner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="religion">Religion (Optional)</Label>
                <Select 
                  value={formData.religion} 
                  onValueChange={(value) => handleChange('religion', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select religion" />
                  </SelectTrigger>
                  <SelectContent>
                    {religions?.map((religion) => (
                      <SelectItem key={religion.id} value={religion.key}>
                        {religion.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Password field only in create mode */}
              {!isEditMode && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Enter password"
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Donor Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5" />
                Donor Category
              </CardTitle>
              <CardDescription>Select the type of donor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="donor_category">Category *</Label>
                <Select 
                  value={formData.donor_category} 
                  onValueChange={(value) => handleChange('donor_category', value)}
                >
                  <SelectTrigger className={errors.donor_category ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select donor category" />
                  </SelectTrigger>
                  <SelectContent>
                    {donorCategories?.map((category) => (
                      <SelectItem key={category.id} value={category.key}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.donor_category && <p className="text-sm text-destructive">{errors.donor_category}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
              <CardDescription>Donor's address details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Enter full address"
                  rows={3}
                  className={errors.address ? 'border-destructive' : ''}
                />
                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Enter city"
                  className={errors.city ? 'border-destructive' : ''}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select 
                  value={formData.state} 
                  onValueChange={(value) => handleChange('state', value)}
                >
                  <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="600001"
                  maxLength={6}
                  className={errors.pincode ? 'border-destructive' : ''}
                />
                {errors.pincode && <p className="text-sm text-destructive">{errors.pincode}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Additional Information
              </CardTitle>
              <CardDescription>Tax and identification details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {/* 80G Checkbox */}
              <div className="sm:col-span-2 flex items-center space-x-3 p-4 border border-border rounded-lg bg-muted/30">
                <Checkbox
                  id="requires_80g"
                  checked={formData.requires_80g}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_80g: checked === true }))}
                />
                <div className="flex-1">
                  <Label htmlFor="requires_80g" className="font-medium cursor-pointer">
                    80G Certificate Required
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    If checked, PAN and Aadhaar become mandatory for tax exemption certificate
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan_number">
                  PAN Number {formData.requires_80g ? '*' : '(Optional)'}
                </Label>
                <Input
                  id="pan_number"
                  value={formData.pan_number}
                  onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className={errors.pan_number ? 'border-destructive' : ''}
                />
                {errors.pan_number && <p className="text-sm text-destructive">{errors.pan_number}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="aadhar_number">
                  Aadhaar Number {formData.requires_80g ? '*' : '(Optional)'}
                </Label>
                <Input
                  id="aadhar_number"
                  value={formData.aadhar_number}
                  onChange={(e) => handleChange('aadhar_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="123456789012"
                  maxLength={12}
                  className={errors.aadhar_number ? 'border-destructive' : ''}
                />
                {errors.aadhar_number && <p className="text-sm text-destructive">{errors.aadhar_number}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any additional notes about the donor"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/super-admin/donors')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createDonor.isPending || updateDonor.isPending}
            >
              {(createDonor.isPending || updateDonor.isPending) ? 'Saving...' : isEditMode ? 'Update Donor' : 'Create Donor'}
            </Button>
          </div>
        </form>

        {/* Credentials Modal - only for create mode */}
        <CredentialsModal
          open={showCredentials}
          onClose={handleCredentialsClose}
          email={createdCredentials.email}
          password={createdCredentials.password}
          userName={createdCredentials.name}
        />
      </div>
    </MainLayout>
  );
};

export default DonorForm;