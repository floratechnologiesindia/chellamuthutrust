import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import type { Notification } from '@/hooks/useNotifications';

export function DonorNotificationToast({
  notification,
  onView,
  onDismiss,
}: {
  notification: Notification;
  onView: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="donor-notification-toast w-[min(100vw-2rem,360px)] rounded-lg border border-[#e8e8e8] bg-white p-4 shadow-lg">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffca0f]/25 text-[#ff6633]">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[#1a1a1a]">{notification.title}</p>
          <p className="mt-1 text-sm text-[#666] line-clamp-3">{notification.message}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-full bg-[#ff6633] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              onClick={onView}
            >
              View
            </button>
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-[#666] hover:bg-[#f5f5f5]"
              onClick={onDismiss}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function showDonorNotificationToast(
  notification: Notification,
  onView: () => void,
) {
  toast.custom(
    (toastId) => (
      <DonorNotificationToast
        notification={notification}
        onView={() => {
          toast.dismiss(toastId);
          onView();
        }}
        onDismiss={() => toast.dismiss(toastId)}
      />
    ),
    {
      id: `donor-notification-${notification.id}`,
      duration: 12000,
      position: 'top-right',
    },
  );
}
