-- Create appointment_activity_log table for audit trail
-- Tracks all changes to appointments with user, action, old/new values, and timestamp

CREATE TABLE IF NOT EXISTS public.ss_appointment_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.ss_appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.ss_users(id),
  user_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'rescheduled', 'reassigned', 'status_changed', 'cancelled', 'deleted')),
  old_value JSONB,
  new_value JSONB,
  field_changed TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ss_activity_log_appointment ON public.ss_appointment_activity_log(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ss_activity_log_user ON public.ss_appointment_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ss_activity_log_created ON public.ss_appointment_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.ss_appointment_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies: all authenticated users can read, system writes
CREATE POLICY "ss_activity_log_select_all" ON public.ss_appointment_activity_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ss_activity_log_insert_all" ON public.ss_appointment_activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger to automatically log appointment changes
CREATE OR REPLACE FUNCTION public.ss_log_appointment_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  user_name TEXT;
  action_type TEXT;
  old_value JSONB;
  new_value JSONB;
  field_changed TEXT;
BEGIN
  -- Get user name from auth.uid()
  SELECT name INTO user_name FROM public.ss_users WHERE id = auth.uid();
  
  IF user_name IS NULL THEN
    user_name := 'System';
  END IF;

  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    new_value := to_jsonb(NEW);
    INSERT INTO public.ss_appointment_activity_log (appointment_id, user_id, user_name, action_type, new_value)
    VALUES (NEW.id, auth.uid(), user_name, action_type, new_value);
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Determine action type based on what changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      action_type := 'status_changed';
      field_changed := 'status';
    ELSIF OLD.technician_id IS DISTINCT FROM NEW.technician_id THEN
      action_type := 'reassigned';
      field_changed := 'technician_id';
    ELSIF OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.end_time IS DISTINCT FROM NEW.end_time THEN
      action_type := 'rescheduled';
      field_changed := 'time';
    ELSE
      action_type := 'updated';
    END IF;
    
    old_value := to_jsonb(OLD);
    new_value := to_jsonb(NEW);
    
    INSERT INTO public.ss_appointment_activity_log (appointment_id, user_id, user_name, action_type, old_value, new_value, field_changed)
    VALUES (NEW.id, auth.uid(), user_name, action_type, old_value, new_value, field_changed);
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
    old_value := to_jsonb(OLD);
    INSERT INTO public.ss_appointment_activity_log (appointment_id, user_id, user_name, action_type, old_value)
    VALUES (OLD.id, auth.uid(), user_name, action_type, old_value);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for appointment changes
DROP TRIGGER IF EXISTS ss_appointment_activity_trigger ON public.ss_appointments;
CREATE TRIGGER ss_appointment_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.ss_appointments
FOR EACH ROW EXECUTE FUNCTION public.ss_log_appointment_change();
