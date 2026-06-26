import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
import { 
  Users, 
  Plus, 
  Search, 
  ArrowLeft,
  Baby,
  Heart,
  Loader2
} from 'lucide-react';
import { ResidentCard } from '@/components/residents/ResidentCard';
import { useAuth } from '@/contexts/AuthContext';
import { useHome } from '@/hooks/useHomes';
import { useResidents, useCreateResident, useUpdateResident } from '@/hooks/useResidents';
import { Resident, ResidentCategory, ResidentStatus } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { z } from 'zod';

// Validation schema
const residentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  age: z.number().min(0, "Age must be positive").max(120, "Please enter a valid age"),
  gender: z.enum(['male', 'female', 'other']),
  category: z.enum(['child', 'old_age', 'others']),
  special_needs: z.string().max(500, "Special needs description must be less than 500 characters").optional(),
  status: z.enum(['active', 'moved_out', 'deceased']),
});

type ResidentFormData = z.infer<typeof residentSchema>;

const Residents = () => {
  const { user } = useAuth();
  const homeId = user?.home_id || null;
  
  const { data: assignedHome, isLoading: homeLoading } = useHome(homeId);
  const { data: residents = [], isLoading: residentsLoading } = useResidents(homeId);
  const createResident = useCreateResident();
  const updateResident = useUpdateResident();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [deleteResident, setDeleteResident] = useState<Resident | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<ResidentFormData>({
    name: '',
    age: 0,
    gender: 'male',
    category: 'child',
    special_needs: '',
    status: 'active',
  });

  if (homeLoading || residentsLoading) {
    return (
      <MainLayout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const typedResidents: Resident[] = residents.map(r => ({
    ...r,
    gender: r.gender as 'male' | 'female' | 'other',
    special_needs: r.special_needs ?? undefined,
    photo_url: r.photo_url ?? undefined,
  }));

  const filteredResidents = typedResidents.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalActive = typedResidents.filter(r => r.status === 'active').length;
  const totalChildren = typedResidents.filter(r => r.category === 'child' && r.status === 'active').length;
  const totalElderly = typedResidents.filter(r => r.category === 'old_age' && r.status === 'active').length;

  const resetForm = () => {
    setFormData({ name: '', age: 0, gender: 'male', category: 'child', special_needs: '', status: 'active' });
    setFormErrors({});
  };

  const handleOpenAdd = () => {
    resetForm();
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
    });
    setEditingResident(resident);
    setFormErrors({});
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    const result = residentSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    try {
      if (editingResident) {
        await updateResident.mutateAsync({
          id: editingResident.id,
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          category: formData.category,
          status: formData.status,
          special_needs: formData.special_needs || null,
        });
        toast({ title: "Resident Updated", description: `${formData.name}'s profile has been updated.` });
      } else {
        if (!homeId) return;
        await createResident.mutateAsync({
          home_id: homeId,
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          category: formData.category,
          status: formData.status as any,
          special_needs: formData.special_needs || null,
        });
        toast({ title: "Resident Added", description: `${formData.name} has been added successfully.` });
      }
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteResident) return;
    try {
      await updateResident.mutateAsync({
        id: deleteResident.id,
        status: 'moved_out',
      });
      toast({ title: "Resident Removed", description: `${deleteResident.name} has been marked as moved out.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setDeleteResident(null);
  };

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to="/warden" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">Social Worker Dashboard</span>
            </div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Users className="h-8 w-8" />
              Resident Management
            </h1>
            <p className="text-muted-foreground mt-1">{assignedHome?.name || 'Your Home'}</p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Resident
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Active</p>
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

        {/* Filters */}
        <Card className="mb-6">
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
                  <SelectItem value="all">All Categories</SelectItem>
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
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="moved_out">Moved Out</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredResidents.length} of {typedResidents.length} residents
          </p>
        </div>

        {/* Residents Grid */}
        {filteredResidents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No residents found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? "Try adjusting your filters"
                  : "Add your first resident to get started"}
              </p>
              <Button onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Resident
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredResidents.map(resident => (
              <ResidentCard
                key={resident.id}
                resident={resident}
                onEdit={handleOpenEdit}
                onDelete={setDeleteResident}
              />
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingResident ? 'Edit Resident' : 'Add New Resident'}
              </DialogTitle>
              <DialogDescription>
                {editingResident 
                  ? 'Update the resident information below.'
                  : 'Fill in the details to add a new resident.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                    placeholder="Age"
                  />
                  {formErrors.age && <p className="text-sm text-destructive">{formErrors.age}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(value: 'male' | 'female' | 'other') => 
                      setFormData(prev => ({ ...prev, gender: value }))
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
                      setFormData(prev => ({ ...prev, category: value }))
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
                        setFormData(prev => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="moved_out">Moved Out</SelectItem>
                        <SelectItem value="deceased">Deceased</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="special_needs">Special Needs / Notes</Label>
                <Textarea
                  id="special_needs"
                  value={formData.special_needs}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_needs: e.target.value }))}
                  placeholder="Any medical conditions, learning needs, dietary requirements..."
                  rows={3}
                />
                {formErrors.special_needs && <p className="text-sm text-destructive">{formErrors.special_needs}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createResident.isPending || updateResident.isPending}>
                {(createResident.isPending || updateResident.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingResident ? 'Update Resident' : 'Add Resident'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteResident} onOpenChange={() => setDeleteResident(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Resident?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark {deleteResident?.name} as "Moved Out". This action can be reversed by editing the resident's status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Remove Resident</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Residents;
