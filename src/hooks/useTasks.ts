import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatUserDisplayName } from '@/lib/roleLabels';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { toast } from '@/hooks/use-toast';

// Types for Supabase responses
interface TaskWithRelations {
  id: string;
  title: string;
  description: string | null;
  assigned_by: string;
  assigned_to: string;
  trust_id: string | null;
  home_id: string | null;
  related_need_id: string | null;
  related_donor_id: string | null;
  priority: TaskPriority | null;
  status: TaskStatus | null;
  due_date: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  assigned_to_profile?: { id: string; name: string; email: string } | null;
  assigned_by_profile?: { id: string; name: string; email: string } | null;
  home?: { id: string; name: string } | null;
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Fetch all tasks (for admins/super admins)
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, name, email),
          assigned_by_profile:profiles!tasks_assigned_by_fkey(id, name, email),
          home:homes(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskWithRelations[];
    },
  });
}

// Fetch tasks assigned to current user
export function useMyTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-tasks', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, name, email),
          assigned_by_profile:profiles!tasks_assigned_by_fkey(id, name, email),
          home:homes(id, name)
        `)
        .eq('assigned_to', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as TaskWithRelations[];
    },
    enabled: !!userId,
  });
}

// Fetch staff users (for assignee dropdown)
export function useStaffUsers() {
  return useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;

      const staffRoles = new Set(['admin', 'employee', 'warden', 'super_admin', 'finance']);
      return ((data || []) as Array<{
        id: string;
        name?: string;
        email?: string;
        role?: string;
      }>)
        .filter((u) => u.role && staffRoles.has(u.role))
        .map((u) => ({
          id: u.id,
          name: formatUserDisplayName(u.name || 'Unknown'),
          email: u.email || '',
          role: u.role as StaffUser['role'],
        })) as StaffUser[];
    },
  });
}

// Create a new task
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      assigned_to: string;
      assigned_by: string;
      priority: TaskPriority;
      due_date: string;
      trust_id?: string;
      home_id?: string;
      related_need_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description || null,
          assigned_to: task.assigned_to,
          assigned_by: task.assigned_by,
          priority: task.priority,
          due_date: task.due_date,
          trust_id: task.trust_id || null,
          home_id: task.home_id || null,
          related_need_id: task.related_need_id || null,
          status: 'OPEN',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({
        title: 'Task Created',
        description: 'The task has been assigned successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    },
  });
}

// Update task status
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'IN_PROGRESS') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'COMPLETED') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({
        title: 'Task Updated',
        description: 'Task status has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });
}

// Update task (full update)
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, updates }: { 
      taskId: string; 
      updates: {
        title?: string;
        description?: string;
        assigned_to?: string;
        priority?: TaskPriority;
        due_date?: string;
        trust_id?: string | null;
        home_id?: string | null;
        related_need_id?: string | null;
      }
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({
        title: 'Task Updated',
        description: 'Task has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });
}

// Fetch single task by ID
export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, name, email),
          assigned_by_profile:profiles!tasks_assigned_by_fkey(id, name, email),
          home:homes(id, name)
        `)
        .eq('id', taskId)
        .maybeSingle();

      if (error) throw error;
      return data as TaskWithRelations | null;
    },
    enabled: !!taskId,
  });
}

// Helper to convert Supabase task to frontend Task type
export function toTask(dbTask: TaskWithRelations): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || '',
    assigned_by: dbTask.assigned_by,
    assigned_to: dbTask.assigned_to,
    trust_id: dbTask.trust_id || undefined,
    home_id: dbTask.home_id || undefined,
    related_need_id: dbTask.related_need_id || undefined,
    related_donor_id: dbTask.related_donor_id || undefined,
    priority: dbTask.priority || 'medium',
    status: dbTask.status || 'OPEN',
    due_date: dbTask.due_date,
    started_at: dbTask.started_at || undefined,
    completed_at: dbTask.completed_at || undefined,
    created_at: dbTask.created_at || new Date().toISOString(),
    updated_at: dbTask.updated_at || new Date().toISOString(),
  };
}
