import { apiFetch } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function parseApiError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error || res.statusText || 'Request failed';
}

/** Remove a social worker from a project (clears primary if applicable). */
export async function clearPrimarySocialWorkerFromHome(homeId: string, socialWorkerId: string) {
  const res = await apiFetch(`${API_BASE}/project-assignments/by-pair`, {
    method: 'DELETE',
    body: JSON.stringify({ home_id: homeId, user_id: socialWorkerId }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
}

/** Assign primary social worker to a project without removing their other assignments. */
export async function assignPrimarySocialWorker(params: {
  homeId: string;
  trustId: string;
  socialWorkerId: string;
  previousSocialWorkerId?: string | null;
}) {
  const { homeId, trustId, socialWorkerId, previousSocialWorkerId } = params;
  const res = await apiFetch(`${API_BASE}/project-assignments/assign-primary`, {
    method: 'POST',
    body: JSON.stringify({
      home_id: homeId,
      trust_id: trustId,
      social_worker_id: socialWorkerId,
      previous_social_worker_id: previousSocialWorkerId ?? null,
    }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
}

export async function assignSocialWorkerToProject(params: {
  homeId: string;
  socialWorkerId: string;
  isPrimary?: boolean;
}) {
  const res = await apiFetch(`${API_BASE}/project-assignments`, {
    method: 'POST',
    body: JSON.stringify({
      home_id: params.homeId,
      user_id: params.socialWorkerId,
      is_primary: Boolean(params.isPrimary),
    }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function listUserProjectAssignments(userId: string) {
  const res = await apiFetch(`${API_BASE}/project-assignments/users/${userId}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function listHomeSocialWorkers(homeId: string) {
  const res = await apiFetch(`${API_BASE}/project-assignments/homes/${homeId}/social-workers`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}
