import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
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
import { TaskPriority } from '@/types';
import { format, addDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffUsers, useTask, useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Validation schema
const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  assigned_to: z.string().min(1, "Please select an assignee"),
  trust_id: z.string().optional(),
  home_id: z.string().optional(),
  related_need_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.date({ required_error: "Please select a due date" }),
});

type TaskFormData = z.infer<typeof taskSchema>;

const TaskForm = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!taskId;
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    assigned_to: '',
    trust_id: '',
    home_id: '',
    related_need_id: '',
    priority: 'medium',
    due_date: addDays(new Date(), 7),
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dateOpen, setDateOpen] = useState(false);

  // Fetch data
  const { data: staffUsers, isLoading: loadingStaff } = useStaffUsers();
  const { data: existingTask, isLoading: loadingTask } = useTask(taskId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // Fetch trusts
  const { data: trusts } = useQuery({
    queryKey: ['trusts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trusts').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch homes based on trust
  const { data: homes } = useQuery({
    queryKey: ['homes', formData.trust_id],
    queryFn: async () => {
      let query = supabase.from('homes').select('id, name, trust_id');
      if (formData.trust_id) {
        query = query.eq('trust_id', formData.trust_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch needs based on home
  const { data: needs } = useQuery({
    queryKey: ['needs', formData.home_id],
    queryFn: async () => {
      if (!formData.home_id) return [];
      const { data, error } = await supabase
        .from('needs')
        .select('id, description')
        .eq('home_id', formData.home_id);
      if (error) throw error;
      return data;
    },
    enabled: !!formData.home_id,
  });

  // Load existing task data if editing
  useEffect(() => {
    if (isEditing && existingTask) {
      setFormData({
        title: existingTask.title,
        description: existingTask.description || '',
        assigned_to: existingTask.assigned_to,
        trust_id: existingTask.trust_id || '',
        home_id: existingTask.home_id || '',
        related_need_id: existingTask.related_need_id || '',
        priority: existingTask.priority || 'medium',
        due_date: new Date(existingTask.due_date),
      });
    }
  }, [isEditing, existingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const result = taskSchema.safeParse(formData);
    
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

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create tasks',
        variant: 'destructive',
      });
      return;
    }

    const taskData = {
      title: formData.title,
      description: formData.description,
      assigned_to: formData.assigned_to,
      assigned_by: user.id,
      priority: formData.priority as TaskPriority,
      due_date: format(formData.due_date, 'yyyy-MM-dd'),
      trust_id: formData.trust_id || undefined,
      home_id: formData.home_id || undefined,
      related_need_id: formData.related_need_id || undefined,
    };

    if (isEditing && taskId) {
      updateTask.mutate(
        { taskId, updates: taskData },
        { onSuccess: () => navigate('/admin/tasks') }
      );
    } else {
      createTask.mutate(taskData, {
        onSuccess: () => navigate('/admin/tasks'),
      });
    }
  };

  const isSubmitting = createTask.isPending || updateTask.isPending;

  if (loadingTask && isEditing) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-3xl">
          <Skeleton className="h-10 w-64 mb-8" />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
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
            <Link to="/admin/tasks" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">Task Management</span>
          </div>
          <h1 className="text-3xl font-display font-bold">
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update the task details below' : 'Fill in the details to assign a new task'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Task Details */}
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
                <CardDescription>Basic information about the task</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Review donation receipts"
                  />
                  {formErrors.title && (
                    <p className="text-sm text-destructive">{formErrors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what needs to be done..."
                    rows={3}
                  />
                  {formErrors.description && (
                    <p className="text-sm text-destructive">{formErrors.description}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Priority *</Label>
                  <RadioGroup
                    value={formData.priority}
                    onValueChange={(value: TaskPriority) => setFormData(prev => ({ ...prev, priority: value }))}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low" className="font-normal cursor-pointer">Low</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="font-normal cursor-pointer">Medium</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high" className="font-normal cursor-pointer">High</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
                <CardDescription>Who should complete this task</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To *</Label>
                  <Select 
                    value={formData.assigned_to} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}
                    disabled={loadingStaff}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingStaff ? "Loading..." : "Select team member"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(staffUsers || []).map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.assigned_to && (
                    <p className="text-sm text-destructive">{formErrors.assigned_to}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? format(formData.due_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.due_date}
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ ...prev, due_date: date }));
                            setDateOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {formErrors.due_date && (
                    <p className="text-sm text-destructive">{formErrors.due_date}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Related Items (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle>Related Items</CardTitle>
                <CardDescription>Link this task to a trust, home, or need (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trust">Trust</Label>
                    <Select 
                      value={formData.trust_id} 
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        trust_id: value,
                        home_id: '',
                        related_need_id: ''
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trust (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {(trusts || []).map(trust => (
                          <SelectItem key={trust.id} value={trust.id}>
                            {trust.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="home">Home</Label>
                    <Select 
                      value={formData.home_id} 
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        home_id: value,
                        related_need_id: ''
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select home (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {(homes || []).map(home => (
                          <SelectItem key={home.id} value={home.id}>
                            {home.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.home_id && (needs || []).length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="need">Related Need</Label>
                    <Select 
                      value={formData.related_need_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, related_need_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select need (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {(needs || []).map(need => (
                          <SelectItem key={need.id} value={need.id}>
                            {(need.description || '').slice(0, 50)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/tasks')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default TaskForm;
