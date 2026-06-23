-- Google Calendar Integration Migration
-- Adds Google OAuth fields to users, calendar event tracking to appointments,
-- and creates calendar sync logs table.

-- ============================================
-- ADD GOOGLE FIELDS TO SS_USERS
-- ============================================
ALTER TABLE public.ss_users
  ADD COLUMN IF NOT EXISTS google_account_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calendar_connected BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ss_users_calendar_connected ON public.ss_users(calendar_connected);

-- ============================================
-- ADD GOOGLE CALENDAR EVENT ID TO APPOINTMENTS
-- ============================================
ALTER TABLE public.ss_appointments
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;

-- ============================================
-- CREATE CALENDAR SYNC LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.ss_calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.ss_users(id) ON DELETE CASCADE,
  calendar_event_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'sync', 'token_refresh')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ss_calendar_sync_user ON public.ss_calendar_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ss_calendar_sync_created ON public.ss_calendar_sync_logs(created_at);

-- ============================================
-- RLS FOR CALENDAR SYNC LOGS
-- ============================================
ALTER TABLE public.ss_calendar_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ss_sync_logs_select_own" ON public.ss_calendar_sync_logs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ss_sync_logs_select_manager" ON public.ss_calendar_sync_logs
  FOR SELECT USING (public.ss_get_user_role(auth.uid()) IN ('manager', 'admin'));
CREATE POLICY "ss_sync_logs_insert" ON public.ss_calendar_sync_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- UPDATE RLS POLICIES FOR GOOGLE TOKEN ACCESS
-- ============================================
-- Technicians can update their own Google token fields
-- (The existing ss_users_update_own policy already covers this)

-- Admins can view all user calendar statuses
CREATE POLICY "ss_users_select_admin" ON public.ss_users
  FOR SELECT USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_users_update_admin" ON public.ss_users
  FOR UPDATE USING (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_users_insert_admin" ON public.ss_users
  FOR INSERT WITH CHECK (public.ss_get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ss_users_delete_admin" ON public.ss_users
  FOR DELETE USING (public.ss_get_user_role(auth.uid()) = 'admin');
