import { useQuery } from '@tanstack/react-query';
import { listUserProjectAssignments } from '@/lib/assignPrimarySocialWorker';

export type ProjectAssignment = {
  id: string;
  user_id: string;
  home_id: string;
  trust_id: string;
  is_primary: boolean;
  assigned_at?: string;
  home?: { id: string; name: string; city: string } | null;
  user?: { id: string; name: string; email?: string; phone?: string } | null;
};

export function useProjectAssignments(userId?: string | null) {
  return useQuery({
    queryKey: ['project-assignments', userId],
    queryFn: async (): Promise<ProjectAssignment[]> => {
      const data = await listUserProjectAssignments(userId!);
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}
