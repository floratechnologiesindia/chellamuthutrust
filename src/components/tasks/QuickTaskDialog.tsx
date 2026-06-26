import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, Zap, Loader2 } from 'lucide-react';
import { TaskPriority } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffUsers, useCreateTask } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface QuickTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreate: () => void;
}

export function QuickTaskDialog({ open, onOpenChange, onTaskCreate }: QuickTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date>();
  const [trustId, setTrustId] = useState('');
  const [homeId, setHomeId] = useState('');
  const [relatedNeedId, setRelatedNeedId] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data: staffUsers, isLoading: loadingStaff } = useStaffUsers();
  const createTask = useCreateTask();

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
    queryKey: ['homes', trustId],
    queryFn: async () => {
      let query = supabase.from('homes').select('id, name, trust_id');
      if (trustId) {
        query = query.eq('trust_id', trustId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch needs based on home
  const { data: needs } = useQuery({
    queryKey: ['needs', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      const { data, error } = await supabase
        .from('needs')
        .select('id, description')
        .eq('home_id', homeId);
      if (error) throw error;
      return data;
    },
    enabled: !!homeId,
  });

  const handleSubmit = () => {
    if (!title || !assignee || !dueDate) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
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

    createTask.mutate(
      {
        title,
        description,
        assigned_to: assignee,
        assigned_by: user.id,
        priority,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        trust_id: trustId || undefined,
        home_id: homeId || undefined,
        related_need_id: relatedNeedId || undefined,
      },
      {
        onSuccess: () => {
          onTaskCreate();
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssignee('');
    setPriority('medium');
    setDueDate(undefined);
    setTrustId('');
    setHomeId('');
    setRelatedNeedId('');
  };

  const handleNeedSelect = (needId: string) => {
    setRelatedNeedId(needId);
    const need = needs?.find(n => n.id === needId);
    if (need) {
      setTitle(`Follow up: ${(need.description || '').substring(0, 50)}...`);
      setDescription(`Task related to need: ${need.description}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Task Creation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>Assign To *</Label>
            <Select value={assignee} onValueChange={setAssignee} disabled={loadingStaff}>
              <SelectTrigger>
                <SelectValue placeholder={loadingStaff ? "Loading..." : "Select assignee"} />
              </SelectTrigger>
              <SelectContent>
                {(staffUsers || []).map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority *</Label>
            <RadioGroup
              value={priority}
              onValueChange={(value) => setPriority(value as TaskPriority)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="quick-low" />
                <Label htmlFor="quick-low" className="text-success cursor-pointer">Low</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="quick-medium" />
                <Label htmlFor="quick-medium" className="text-warning cursor-pointer">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="quick-high" />
                <Label htmlFor="quick-high" className="text-destructive cursor-pointer">High</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Select due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => {
                    setDueDate(date);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Trust & Home (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trust</Label>
              <Select value={trustId} onValueChange={(value) => {
                setTrustId(value);
                setHomeId('');
                setRelatedNeedId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trust" />
                </SelectTrigger>
                <SelectContent>
                  {(trusts || []).map(trust => (
                    <SelectItem key={trust.id} value={trust.id}>
                      {trust.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Home</Label>
              <Select value={homeId} onValueChange={(value) => {
                setHomeId(value);
                setRelatedNeedId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select home" />
                </SelectTrigger>
                <SelectContent>
                  {(homes || []).map(home => (
                    <SelectItem key={home.id} value={home.id}>
                      {home.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Link to Need */}
          {homeId && (needs || []).length > 0 && (
            <div className="space-y-2">
              <Label>Link to Need (Optional)</Label>
              <Select value={relatedNeedId} onValueChange={handleNeedSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a need to link" />
                </SelectTrigger>
                <SelectContent>
                  {(needs || []).map(need => (
                    <SelectItem key={need.id} value={need.id}>
                      {(need.description || '').substring(0, 40)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createTask.isPending}>
            {createTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
