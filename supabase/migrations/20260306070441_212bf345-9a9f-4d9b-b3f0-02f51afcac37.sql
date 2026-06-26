-- Allow any authenticated user to INSERT notifications for other users (cross-role notifications)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);