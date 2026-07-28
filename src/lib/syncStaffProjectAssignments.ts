import {
  assignPrimarySocialWorker,
  assignSocialWorkerToProject,
  clearPrimarySocialWorkerFromHome,
  listUserProjectAssignments,
} from '@/lib/assignPrimarySocialWorker';

export async function syncStaffProjectAssignments(params: {
  staffId: string;
  trustId: string;
  homeIds: string[];
  primaryHomeId: string | null;
}) {
  const { staffId, trustId, homeIds, primaryHomeId } = params;
  const existing = await listUserProjectAssignments(staffId);
  const existingIds = new Set(existing.map((a: { home_id: string }) => a.home_id));
  const targetIds = new Set(homeIds);

  for (const id of existingIds) {
    if (!targetIds.has(id)) {
      await clearPrimarySocialWorkerFromHome(id, staffId);
    }
  }

  for (const id of homeIds) {
    if (!existingIds.has(id)) {
      await assignSocialWorkerToProject({
        homeId: id,
        socialWorkerId: staffId,
        isPrimary: id === primaryHomeId,
      });
    }
  }

  if (primaryHomeId && homeIds.includes(primaryHomeId)) {
    await assignPrimarySocialWorker({
      homeId: primaryHomeId,
      trustId,
      socialWorkerId: staffId,
    });
  }
}

export async function clearAllStaffProjectAssignments(staffId: string) {
  const existing = await listUserProjectAssignments(staffId);
  for (const row of existing) {
    await clearPrimarySocialWorkerFromHome(row.home_id, staffId);
  }
}
