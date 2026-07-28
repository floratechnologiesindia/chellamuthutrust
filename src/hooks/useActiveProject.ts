import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useHome } from '@/hooks/useHomes';
import { useHomePhotos } from '@/hooks/useHomePhotos';
import { useProjectAssignments } from '@/hooks/useProjectAssignments';
import {
  getStoredActiveProject,
  setStoredActiveProject,
  subscribeActiveProject,
} from '@/lib/activeProject';

export type { HomeWithTrust } from '@/hooks/useHomes';
import type { HomeWithTrust } from '@/hooks/useHomes';

export function useActiveProject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isWarden = user?.role === 'warden';
  const { data: assignments = [], isLoading: assignmentsLoading } = useProjectAssignments(
    isWarden ? user?.id : null,
  );

  const [activeRevision, bumpActiveRevision] = useState(0);
  useEffect(() => subscribeActiveProject(() => bumpActiveRevision((n) => n + 1)), []);

  const assignedProjectIds = useMemo(() => {
    if (assignments.length > 0) return assignments.map((a) => a.home_id);
    return user?.assigned_project_ids?.length ? user.assigned_project_ids : user?.home_id ? [user.home_id] : [];
  }, [assignments, user?.assigned_project_ids, user?.home_id]);

  const activeHomeId = useMemo(() => {
    if (!isWarden) return user?.home_id || null;
    if (assignedProjectIds.length === 0) return user?.home_id || null;

    const stored = user?.id ? getStoredActiveProject(user.id) : null;
    if (stored && assignedProjectIds.includes(stored)) return stored;

    const primary = assignments.find((a) => a.is_primary);
    if (primary) return primary.home_id;

    return assignedProjectIds[0] ?? user?.home_id ?? null;
  }, [isWarden, user?.id, user?.home_id, assignedProjectIds, assignments, activeRevision]);

  useEffect(() => {
    if (isWarden && user?.id && activeHomeId) {
      const stored = getStoredActiveProject(user.id);
      if (stored !== activeHomeId) {
        setStoredActiveProject(user.id, activeHomeId);
      }
    }
  }, [isWarden, user?.id, activeHomeId]);

  const invalidateProjectScopedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['needs'] });
    queryClient.invalidateQueries({ queryKey: ['home'] });
    queryClient.invalidateQueries({ queryKey: ['home-photos'] });
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['food-slots'] });
    queryClient.invalidateQueries({ queryKey: ['future-booked-food-slots'] });
    queryClient.invalidateQueries({ queryKey: ['completed-food-slots'] });
    queryClient.invalidateQueries({ queryKey: ['kind-donations'] });
    queryClient.invalidateQueries({ queryKey: ['donations-for-home'] });
    queryClient.invalidateQueries({ queryKey: ['pending-kind-donations'] });
  }, [queryClient]);

  const setActiveProjectId = useCallback(
    (homeId: string) => {
      if (!user?.id) return;
      if (!assignedProjectIds.includes(homeId)) return;
      setStoredActiveProject(user.id, homeId);
      invalidateProjectScopedQueries();
    },
    [user?.id, assignedProjectIds, invalidateProjectScopedQueries],
  );

  const { data: home, isLoading: homeLoading } = useHome(activeHomeId) as {
    data: HomeWithTrust | null | undefined;
    isLoading: boolean;
  };
  const { data: photos = [], isLoading: photosLoading } = useHomePhotos(activeHomeId);

  const assignedProjects = useMemo(
    () =>
      assignments.map((a) => ({
        id: a.home_id,
        name: a.home?.name || 'Project',
        city: a.home?.city || '',
        isPrimary: a.is_primary,
      })),
    [assignments],
  );

  return {
    homeId: activeHomeId,
    home: home ?? null,
    photos,
    trust: home?.trusts ?? null,
    isLoading: assignmentsLoading || homeLoading || photosLoading,
    assignedProjects,
    assignedProjectIds,
    hasAssignments: assignedProjectIds.length > 0,
    setActiveProjectId,
  };
}
