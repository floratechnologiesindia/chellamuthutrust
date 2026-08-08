import { format } from 'date-fns';
import type { ApprovalStatus } from '@/hooks/useNeeds';

export function buildNeedApprovalUpdate(
  approvalStatus: ApprovalStatus,
  options?: {
    approvedBy?: string | null;
    approvedAt?: Date | null;
  },
): {
  approval_status: ApprovalStatus;
  approved_at: string | null;
  approved_by: string | null;
} {
  if (approvalStatus === 'APPROVED') {
    const approvedAt = options?.approvedAt ?? new Date();
    return {
      approval_status: 'APPROVED',
      approved_at: format(approvedAt, 'yyyy-MM-dd'),
      approved_by: options?.approvedBy?.trim() || null,
    };
  }

  if (approvalStatus === 'REJECTED') {
    return {
      approval_status: 'REJECTED',
      approved_at: null,
      approved_by: null,
    };
  }

  return {
    approval_status: 'PENDING',
    approved_at: null,
    approved_by: null,
  };
}
