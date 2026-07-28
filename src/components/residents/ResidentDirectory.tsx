import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Plus, Search, Baby, Heart, Loader2 } from 'lucide-react';
import { ResidentCard } from '@/components/residents/ResidentCard';
import { useResidents, useCreateResident, useUpdateResident } from '@/hooks/useResidents';
import { Resident, ResidentCategory, ResidentStatus } from '@/types';
import { uploadResidentPhoto } from '@/lib/residentPhotoUpload';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const residentSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  age: z.number().min(0, 'Age must be positive').max(120, 'Please enter a valid age'),
  gender: z.enum(['male', 'female', 'other']),
  category: z.enum(['child', 'old_age', 'others']),
  special_needs: z.string().max(500, 'Special needs description must be less than 500 characters').optional(),
  status: z.enum(['active', 'moved_out', 'deceased']),
  admission_date: z.string().optional(),
  discharge_date: z.string().optional(),
  photo_url: z.string().optional(),
});

type ResidentFormData = z.infer<typeof residentSchema>;

type ResidentRow = Omit<Resident, 'gender' | 'special_needs' | 'photo_url' | 'admission_date' | 'discharge_date'> & {
  gender: string;
  special_needs?: string | null;
  photo_url?: string | null;
  admission_date?: string | null;
  discharge_date?: string | null;
};

const emptyForm = (): ResidentFormData => ({
  name: '',
  age: 0,
  gender: 'male',
  category: 'child',
  special_needs: '',
  status: 'active',
  admission_date: new Date().toISOString().slice(0, 10),
  discharge_date: '',
  photo_url: '',
});

export function ResidentDirectory({ homeId }: { homeId: string }) {
  const { data: residents = [], isLoading } = useResidents(homeId);
  const createResident = useCreateResident();
  const updateResident = useUpdateResident();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [deleteResident, setDeleteResident] = useState<Resident | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState<ResidentFormData>(emptyForm);

  const typedResidents: Resident[] = ((residents || []) as ResidentRow[]).map((r) => ({
    ...r,
    gender: r.gender as 'male' | 'female' | 'other',
    special_needs: r.special_needs ?? undefined,
    photo_url: r.photo_url ?? undefined,
    admission_date: r.admission_date ?? undefined,
    discharge_date: r.discharge_date ?? undefined,
  }));

  const filteredResidents = typedResidents.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalActive = typedResidents.filter((r) => r.status === 'active').length;
  const totalChildren = typedResidents.filter((r) => r.category === 'child' && r.status === 'active').length;
  const totalElderly = typedResidents.filter((r) => r.category === 'old_age' && r.status === 'active').length;

  const handleOpenAdd = () => {
    setFormData(emptyForm());
    setFormErrors({});
    setEditingResident(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (resident: Resident) => {
    setFormData({
      name: resident.name,
      age: resident.age,
      gender: resident.gender,
      category: resident.category,
      special_needs: resident.special_needs || '',
      status: resident.status,
      admission_date: resident.admission_date || '',
      discharge_date: resident.discharge_date || '',
      photo_url: resident.photo_url || '',
    });
    setEditingResident(resident);
    setFormErrors({});
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    const result = residentSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    const payload = {
      name: formData.name,
      age: formData.age,
      gender: formData.gender,
      category: formData.category,
      status: formData.status,
      special_needs: formData.special_needs || null,
      photo_url: formData.photo_url || null,
      admission_date: formData.admission_date || null,
      discharge_date: formData.discharge_date || null,
    };

    try {
      if (editingResident) {
        await updateResident.mutateAsync({ id: editingResident.id, ...payload });
        toast({ title: 'Resident updated', description: `${formData.name}'s profile has been updated.` });
      } else {
        await createResident.mutateAsync({ home_id: homeId, ...payload });
        toast({ title: 'Resident added', description: `${formData.name} has been added successfully.` });
      }
      setIsAddDialogOpen(false);
      setFormData(emptyForm());
      setFormErrors({});
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not save resident',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteResident) return;
    try {
      await updateResident.mutateAsync({ id: deleteResident.id, status: 'moved_out' });
      toast({ title: 'Resident removed', description: `${deleteResident.name} has been marked as moved out.` });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not update resident',
        variant: 'destructive',
      });
    }
    setDeleteResident(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Manage resident admission, photographs, and discharge updates.
        </p>
        <Button onClick={handleOpenAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add resident
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total active</p>
                <p className="text-2xl font-bold">{totalActive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Baby className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Children</p>
                <p className="text-2xl font-bold">{totalChildren}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Elderly</p>
                <p className="text-2xl font-bold">{totalElderly}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search residents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="child">Children</SelectItem>
                <SelectItem value="old_age">Elderly</SelectItem>
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="moved_out">Moved out</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Showing {filteredResidents.length} of {typedResidents.length} residents
      </p>

      {filteredResidents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No residents found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first resident to get started'}
            </p>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add resident
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResidents.map((resident) => (
            <ResidentCard
              key={resident.id}
              resident={resident}
              onEdit={handleOpenEdit}
              onDelete={setDeleteResident}
            />
          ))}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResident ? 'Edit resident' : 'Add new resident'}</DialogTitle>
            <DialogDescription>
              {editingResident
                ? 'Update the resident information below.'
                : 'Fill in the details to add a new resident.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
              />
              {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  min={0}
                  max={120}
                  value={formData.age || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, age: parseInt(e.target.value, 10) || 0 }))}
                  placeholder="Age"
                />
                {formErrors.age && <p className="text-sm text-destructive">{formErrors.age}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: 'male' | 'female' | 'other') =>
                    setFormData((prev) => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: ResidentCategory) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="old_age">Elderly</SelectItem>
                    <SelectItem value="others">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingResident && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: ResidentStatus) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="moved_out">Moved out</SelectItem>
                      <SelectItem value="deceased">Deceased</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admission_date">Admission date</Label>
                <Input
                  id="admission_date"
                  type="date"
                  value={formData.admission_date || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, admission_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discharge_date">Discharge date</Label>
                <Input
                  id="discharge_date"
                  type="date"
                  value={formData.discharge_date || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, discharge_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Photograph</Label>
              <div className="flex items-center gap-3">
                {formData.photo_url ? (
                  <img src={formData.photo_url} alt="" className="h-14 w-14 rounded-full object-cover border" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setUploadingPhoto(true);
                    try {
                      const url = await uploadResidentPhoto(homeId, file);
                      setFormData((prev) => ({ ...prev, photo_url: url }));
                      toast({ title: 'Photo uploaded' });
                    } catch (err: unknown) {
                      toast({
                        title: 'Upload failed',
                        description: err instanceof Error ? err.message : 'Could not upload photo',
                        variant: 'destructive',
                      });
                    } finally {
                      setUploadingPhoto(false);
                    }
                  }}
                />
              </div>
              {uploadingPhoto && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_needs">Special needs / notes</Label>
              <Textarea
                id="special_needs"
                value={formData.special_needs}
                onChange={(e) => setFormData((prev) => ({ ...prev, special_needs: e.target.value }))}
                placeholder="Any medical conditions, learning needs, dietary requirements..."
                rows={3}
              />
              {formErrors.special_needs && (
                <p className="text-sm text-destructive">{formErrors.special_needs}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createResident.isPending || updateResident.isPending || uploadingPhoto}
            >
              {(createResident.isPending || updateResident.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingResident ? 'Update resident' : 'Add resident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteResident} onOpenChange={() => setDeleteResident(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove resident?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {deleteResident?.name} as &quot;Moved out&quot;. You can reverse it by editing
              the resident&apos;s status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove resident</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
