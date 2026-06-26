
-- Add 'finance' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';

-- Add new notification types
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payment_awaiting_assignment';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payment_assigned';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payment_reconciled';
