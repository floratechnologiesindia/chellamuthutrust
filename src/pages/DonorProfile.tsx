import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateDonorProfile } from '@/hooks/useDonors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, User, MapPin, FileText, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
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

const DONOR_CATEGORIES = [
  { value: 'monthly', label: 'Monthly Donor', color: 'bg-green-500' },
  { value: 'yearly', label: 'Yearly Donor', color: 'bg-purple-500' },
  { value: 'public', label: 'Public Donor', color: 'bg-orange-500' },
  { value: 'csr', label: 'CSR Partner', color: 'bg-red-500' },
];

const DonorProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateProfile = useUpdateDonorProfile();
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    organization: (user as any)?.organization || '',
    donor_category: (user as any)?.donor_category || '',
    address: (user as any)?.address || '',
    city: (user as any)?.city || '',
    state: (user as any)?.state || '',
    pincode: (user as any)?.pincode || '',
    pan_number: (user as any)?.pan_number || '',
    aadhar_number: (user as any)?.aadhar_number || '',
    requires_80g: (user as any)?.requires_80g || false,
    notes: (user as any)?.notes || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validate PAN if provided
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)) {
      toast.error('Invalid PAN format. Expected format: ABCDE1234F');
      return;
    }

    // Validate Aadhaar if provided
    if (formData.aadhar_number && !/^\d{12}$/.test(formData.aadhar_number)) {
      toast.error('Invalid Aadhaar format. Must be 12 digits.');
      return;
    }

    // Validate pincode if provided
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      toast.error('Invalid pincode. Must be 6 digits.');
      return;
    }

    // If 80G is required, both PAN and Aadhaar are mandatory
    if (formData.requires_80g) {
      if (!formData.pan_number.trim()) {
        toast.error('PAN is required for 80G certificate');
        return;
      }
      if (!formData.aadhar_number.trim()) {
        toast.error('Aadhaar is required for 80G certificate');
        return;
      }
    }

    try {
      await updateProfile.mutateAsync(formData);
      setIsEditOpen(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      // Error handled in mutation
    }
  };

  const getCategoryBadge = (category: string | null) => {
    const cat = DONOR_CATEGORIES.find(c => c.value === category);
    if (!cat) return null;
    return (
      <Badge className={`${cat.color} text-white`}>
        {cat.label}
      </Badge>
    );
  };

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground sm:w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value || '-'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">My Profile</h1>
              <p className="text-muted-foreground text-sm">View and manage your account details</p>
            </div>
          </div>
          <Button onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* Profile Header Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{user?.name}</h2>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  {getCategoryBadge((user as any)?.donor_category)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Full Name" value={user?.name} />
            <InfoRow label="Email" value={user?.email} />
            <InfoRow label="Phone" value={user?.phone} />
            <InfoRow label="Organization" value={(user as any)?.organization} />
            <div className="flex flex-col sm:flex-row sm:items-center py-2">
              <span className="text-sm text-muted-foreground sm:w-40 shrink-0">Donor Category</span>
              <span>{getCategoryBadge((user as any)?.donor_category) || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Address" value={(user as any)?.address} />
            <InfoRow label="City" value={(user as any)?.city} />
            <InfoRow label="State" value={(user as any)?.state} />
            <InfoRow label="Pincode" value={(user as any)?.pincode} />
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="80G Required" value={(user as any)?.requires_80g ? 'Yes' : 'No'} />
            <InfoRow label="PAN Number" value={(user as any)?.pan_number} />
            <InfoRow label="Aadhaar Number" value={(user as any)?.aadhar_number} />
            <InfoRow label="Notes" value={(user as any)?.notes} />
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Personal Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) => handleInputChange('organization', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donor_category">Donor Category</Label>
                    <Select
                      value={formData.donor_category}
                      onValueChange={(value) => handleInputChange('donor_category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {DONOR_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Address Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => handleInputChange('state', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(state => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => handleInputChange('pincode', e.target.value)}
                      placeholder="600001"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Additional Information</h3>
                
                {/* 80G Checkbox */}
                <div className="flex items-center space-x-3 p-4 border border-border rounded-lg bg-muted/30">
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
                      If checked, PAN and Aadhaar are required for tax exemption
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pan_number">
                      PAN Number {formData.requires_80g ? '*' : ''}
                    </Label>
                    <Input
                      id="pan_number"
                      value={formData.pan_number}
                      onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aadhar_number">
                      Aadhaar Number {formData.requires_80g ? '*' : ''}
                    </Label>
                    <Input
                      id="aadhar_number"
                      value={formData.aadhar_number}
                      onChange={(e) => handleInputChange('aadhar_number', e.target.value.replace(/\D/g, ''))}
                      placeholder="123456789012"
                      maxLength={12}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    placeholder="Any additional information..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DonorProfile;
