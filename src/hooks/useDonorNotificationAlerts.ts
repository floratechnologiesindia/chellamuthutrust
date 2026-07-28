import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { showDonorNotificationToast } from '@/components/donor/DonorNotificationToast';
import { useNotifications } from '@/hooks/useNotifications';
import { receiptPathFromDedupeKey } from '@/lib/donorReceipt';

/** Polls notifications and shows a toast when new ones arrive (donor portal). */
export function useDonorNotificationAlerts(userId?: string | null) {
  const navigate = useNavigate();
  const sessionStartRef = useRef(Date.now());
  const seenIdsRef = useRef<Set<string> | null>(null);
  const { data, isSuccess } = useNotifications(userId, { poll: true });
  const notifications = Array.isArray(data) ? data : [];

  useEffect(() => {
    if (!userId || !isSuccess) return;

    if (seenIdsRef.current === null) {
      const cutoff = sessionStartRef.current - 2_000;
      seenIdsRef.current = new Set(
        notifications
          .filter((n) => new Date(n.created_at).getTime() < cutoff)
          .map((n) => n.id),
      );
    }

    const unseen = notifications.filter((n) => !seenIdsRef.current!.has(n.id));
    if (!unseen.length) return;

    for (const notification of unseen.reverse()) {
      seenIdsRef.current!.add(notification.id);
      const receiptPath =
        notification.type === 'receipt_ready'
          ? receiptPathFromDedupeKey(notification.dedupe_key)
          : null;
      showDonorNotificationToast(notification, () => navigate(receiptPath || '/notifications'));
    }
  }, [notifications, isSuccess, userId, navigate]);
}
