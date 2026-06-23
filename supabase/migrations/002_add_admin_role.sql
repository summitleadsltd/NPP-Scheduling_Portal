-- Add admin role to ss_users
ALTER TABLE public.ss_users DROP CONSTRAINT IF EXISTS ss_users_role_check;
ALTER TABLE public.ss_users ADD CONSTRAINT ss_users_role_check CHECK (role IN ('admin', 'manager', 'scheduler', 'technician'));

-- Admin can read all users
CREATE POLICY "ss_users_select_admin" ON public.ss_users FOR SELECT USING (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can create any user
CREATE POLICY "ss_users_insert_admin" ON public.ss_users FOR INSERT WITH CHECK (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can update any user
CREATE POLICY "ss_users_update_admin" ON public.ss_users FOR UPDATE USING (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can delete users
CREATE POLICY "ss_users_delete_admin" ON public.ss_users FOR DELETE USING (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can read all appointments
CREATE POLICY "ss_appointments_select_admin" ON public.ss_appointments FOR SELECT USING (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can modify all appointments
CREATE POLICY "ss_appointments_insert_admin" ON public.ss_appointments FOR INSERT WITH CHECK (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_appointments_update_admin" ON public.ss_appointments FOR UPDATE USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_appointments_delete_admin" ON public.ss_appointments FOR DELETE USING (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can read all customers
CREATE POLICY "ss_customers_select_admin" ON public.ss_customers FOR SELECT USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_customers_insert_admin" ON public.ss_customers FOR INSERT WITH CHECK (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_customers_update_admin" ON public.ss_customers FOR UPDATE USING (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can read all addresses
CREATE POLICY "ss_addresses_select_admin" ON public.ss_addresses FOR SELECT USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_addresses_insert_admin" ON public.ss_addresses FOR INSERT WITH CHECK (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can manage availability blocks
CREATE POLICY "ss_availability_blocks_select_admin" ON public.ss_availability_blocks FOR SELECT USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_availability_blocks_insert_admin" ON public.ss_availability_blocks FOR INSERT WITH CHECK (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_availability_blocks_update_admin" ON public.ss_availability_blocks FOR UPDATE USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_availability_blocks_delete_admin" ON public.ss_availability_blocks FOR DELETE USING (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can manage notifications
CREATE POLICY "ss_notifications_select_admin" ON public.ss_notifications FOR SELECT USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_notifications_insert_admin" ON public.ss_notifications FOR INSERT WITH CHECK (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_notifications_update_admin" ON public.ss_notifications FOR UPDATE USING (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can manage business settings
CREATE POLICY "ss_business_settings_select_admin" ON public.ss_business_settings FOR SELECT USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_business_settings_insert_admin" ON public.ss_business_settings FOR INSERT WITH CHECK (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_business_settings_update_admin" ON public.ss_business_settings FOR UPDATE USING (public.ss_get_user_role(auth.uid()) = 'admin');

-- Admin can manage device tokens
CREATE POLICY "ss_device_tokens_select_admin" ON public.ss_device_tokens FOR SELECT USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_device_tokens_insert_admin" ON public.ss_device_tokens FOR INSERT WITH CHECK (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_device_tokens_delete_admin" ON public.ss_device_tokens FOR DELETE USING (public.ss_get_user_role(auth.uid()) = 'admin');
