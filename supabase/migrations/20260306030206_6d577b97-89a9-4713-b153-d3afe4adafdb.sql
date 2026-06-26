CREATE POLICY "Donors can insert food slots as sponsor"
ON public.food_slots
FOR INSERT
TO authenticated
WITH CHECK (donor_id = auth.uid() AND status = 'BOOKED'::food_slot_status);