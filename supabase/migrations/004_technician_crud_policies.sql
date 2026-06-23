-- Allow technicians to create customers (needed for "New Customer" appointment flow)
DROP POLICY IF EXISTS "ss_customers_insert" ON public.ss_customers;
CREATE POLICY "ss_customers_insert" ON public.ss_customers FOR INSERT WITH CHECK (
  public.ss_get_user_role(auth.uid()) IN ('admin', 'manager', 'scheduler', 'technician')
);

-- Allow technicians to create addresses (needed for "New Customer" appointment flow)
DROP POLICY IF EXISTS "ss_addresses_insert" ON public.ss_addresses;
CREATE POLICY "ss_addresses_insert" ON public.ss_addresses FOR INSERT WITH CHECK (
  public.ss_get_user_role(auth.uid()) IN ('admin', 'manager', 'scheduler', 'technician')
);

-- Allow technicians to create appointments in their own calendar
DROP POLICY IF EXISTS "ss_appointments_insert" ON public.ss_appointments;
CREATE POLICY "ss_appointments_insert" ON public.ss_appointments FOR INSERT WITH CHECK (
  public.ss_get_user_role(auth.uid()) IN ('admin', 'manager', 'scheduler', 'technician')
);

-- Allow technicians to delete their own appointments
CREATE POLICY "ss_appointments_delete_tech" ON public.ss_appointments FOR DELETE USING (
  technician_id = auth.uid()
);

-- Allow managers and schedulers to delete appointments
CREATE POLICY "ss_appointments_delete_manager" ON public.ss_appointments FOR DELETE USING (
  public.ss_get_user_role(auth.uid()) IN ('manager', 'scheduler')
);
