import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HomeMainImageUpload } from '@/components/homes/HomeMainImageUpload';
import { PhotoGalleryManager } from '@/components/homes/PhotoGalleryManager';
import { uploadHomeImageFile } from '@/lib/homePhotoUpload';
import { useUpdateWardenHomeProfile } from '@/hooks/useWardenOps';
import type { HomeWithTrust } from '@/hooks/useHomes';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectProfileEditorProps {
  home: HomeWithTrust;
  onSaved?: () => void;
  onCancel?: () => void;
}

const numberOrNull = (value: string) => {
  if (value.trim() === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toInput = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value);

export function ProjectProfileEditor({ home, onSaved, onCancel }: ProjectProfileEditorProps) {
  const updateProfile = useUpdateWardenHomeProfile();
  const [pendingMainImage, setPendingMainImage] = useState<File | null>(null);
  const [mainImageCleared, setMainImageCleared] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    description: home.description || '',
    facilities: home.facilities || '',
    contact_details: home.contact_details || '',
    supported_by: home.supported_by || '',
    year_established: toInput(home.year_established),
    address: home.address || '',
    city: home.city || '',
    state: home.state || '',
    country: home.country || 'India',
    pincode: home.pincode || '',
    capacity_children_male: toInput(home.capacity_children_male),
    capacity_children_female: toInput(home.capacity_children_female),
    capacity_elderly_male: toInput(home.capacity_elderly_male),
    capacity_elderly_female: toInput(home.capacity_elderly_female),
  });

  const setField = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const updates: Record<string, unknown> = {
      description: form.description || null,
      facilities: form.facilities || null,
      contact_details: form.contact_details || null,
      supported_by: form.supported_by || null,
      year_established: numberOrNull(form.year_established),
      address: form.address,
      city: form.city,
      state: form.state,
      country: form.country,
      pincode: form.pincode,
      capacity_children_male: numberOrNull(form.capacity_children_male) ?? 0,
      capacity_children_female: numberOrNull(form.capacity_children_female) ?? 0,
      capacity_elderly_male: numberOrNull(form.capacity_elderly_male) ?? 0,
      capacity_elderly_female: numberOrNull(form.capacity_elderly_female) ?? 0,
    };

    try {
      if (pendingMainImage) {
        setUploading(true);
        updates.image_url = await uploadHomeImageFile(home.id, pendingMainImage, 'main');
      } else if (mainImageCleared) {
        updates.image_url = null;
      }
    } catch (error) {
      setUploading(false);
      toast.error(error instanceof Error ? error.message : 'Could not upload the main image');
      return;
    }
    setUploading(false);

    updateProfile.mutate(
      { homeId: home.id, updates },
      {
        onSuccess: () => {
          toast.success('Project profile updated');
          setPendingMainImage(null);
          setMainImageCleared(false);
          onSaved?.();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const saving = uploading || updateProfile.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About this project</CardTitle>
          <CardDescription>
            Shown to donors on the public project profile and in reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setField('description')(e.target.value)}
              rows={4}
              placeholder="What this project does, who it serves, and how donations help."
            />
          </div>
          <div className="space-y-2">
            <Label>Facilities</Label>
            <Textarea
              value={form.facilities}
              onChange={(e) => setField('facilities')(e.target.value)}
              rows={3}
              placeholder="Medical care, therapy rooms, dining hall, etc."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Supported by</Label>
              <Input
                value={form.supported_by}
                onChange={(e) => setField('supported_by')(e.target.value)}
                placeholder="Partner or funding body"
              />
            </div>
            <div className="space-y-2">
              <Label>Year established</Label>
              <Input
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                value={form.year_established}
                onChange={(e) => setField('year_established')(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contact details</Label>
            <Textarea
              value={form.contact_details}
              onChange={(e) => setField('contact_details')(e.target.value)}
              rows={2}
              placeholder="Phone number, email, or visiting hours"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Main image</CardTitle>
          <CardDescription>The banner photograph donors see first.</CardDescription>
        </CardHeader>
        <CardContent>
          <HomeMainImageUpload
            previewUrl={mainImageCleared ? null : home.image_url}
            pendingFile={pendingMainImage}
            onPendingFileChange={setPendingMainImage}
            onClearExisting={() => setMainImageCleared(true)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capacity</CardTitle>
          <CardDescription>Number of residents this project can support.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Children — male</Label>
            <Input
              type="number"
              min={0}
              value={form.capacity_children_male}
              onChange={(e) => setField('capacity_children_male')(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Children — female</Label>
            <Input
              type="number"
              min={0}
              value={form.capacity_children_female}
              onChange={(e) => setField('capacity_children_female')(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Elderly — male</Label>
            <Input
              type="number"
              min={0}
              value={form.capacity_elderly_male}
              onChange={(e) => setField('capacity_elderly_male')(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Elderly — female</Label>
            <Input
              type="number"
              min={0}
              value={form.capacity_elderly_female}
              onChange={(e) => setField('capacity_elderly_female')(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Street address</Label>
            <Input value={form.address} onChange={(e) => setField('address')(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setField('city')(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input value={form.state} onChange={(e) => setField('state')(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => setField('country')(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pincode</Label>
            <Input value={form.pincode} onChange={(e) => setField('pincode')(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photo gallery</CardTitle>
          <CardDescription>
            Gallery photographs save straight away — they do not wait for the button below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoGalleryManager homeId={home.id} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save profile
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
