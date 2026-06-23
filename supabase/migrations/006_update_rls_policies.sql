-- Update RLS policies to allow all authenticated users to manage appointments
-- This enables full appointment management (create, edit, reschedule, reassign, cancel, delete, update status) for all authenticated users

-- Drop existing appointment policies
DROP POLICY IF EXISTS "ss_appointments_select" ON public.ss_appointments;
DROP POLICY IF EXISTS "ss_appointments_insert" ON public.ss_appointments;
DROP POLICY IF EXISTS "ss_appointments_update_manager" ON public.ss_appointments;
DROP POLICY IF EXISTS "ss_appointments_update_scheduler" ON public.ss_appointments;
DROP POLICY IF EXISTS "ss_appointments_update_tech" ON public.ss_appointments;

-- Create new policies allowing all authenticated users to manage appointments
CREATE POLICY "ss_appointments_select_all" ON public.ss_appointments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ss_appointments_insert_all" ON public.ss_appointments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ss_appointments_update_all" ON public.ss_appointments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ss_appointments_delete_all" ON public.ss_appointments FOR DELETE USING (auth.uid() IS NOT NULL);
