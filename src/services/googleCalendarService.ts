import { supabase } from '@/lib/supabase';
import type { GoogleCalendarEvent, FreeBusySlot, CalendarSyncLog } from '@/types/database';
import { SYSTEM_TZ } from '@/lib/timezone';

const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
].join(' ');

function getClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
}

function getClientSecret(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
}

function getRedirectUri(): string {
  return `${window.location.origin}/auth/google/callback`;
}

// ============================================
// OAUTH FLOW
// ============================================

export function getGoogleAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: state || '',
  });
  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token?: string;
}> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  return response.json();
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data: user } = await supabase
    .from('ss_users')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', userId)
    .single();

  if (!user?.google_access_token || !user?.google_refresh_token) {
    return null;
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(user.google_token_expires_at || 0);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return user.google_access_token;
  }

  // Token expired, refresh it
  try {
    const { access_token, expires_in } = await refreshAccessToken(user.google_refresh_token);
    const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    await supabase
      .from('ss_users')
      .update({
        google_access_token: access_token,
        google_token_expires_at: newExpiresAt,
      })
      .eq('id', userId);

    await logCalendarSync(userId, null, 'token_refresh', 'success');
    return access_token;
  } catch (error) {
    await logCalendarSync(userId, null, 'token_refresh', 'failed', String(error));
    return null;
  }
}

// ============================================
// CALENDAR API
// ============================================

export async function listCalendars(accessToken: string): Promise<{ id: string; summary: string; primary: boolean }[]> {
  const response = await fetch(`${GOOGLE_API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error('Failed to list calendars');
  const data = await response.json();
  return (data.items || []).map((cal: { id: string; summary: string; primary?: boolean }) => ({
    id: cal.id,
    summary: cal.summary,
    primary: cal.primary || false,
  }));
}

export async function getFreeBusy(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
): Promise<Record<string, FreeBusySlot[]>> {
  const response = await fetch(`${GOOGLE_API_BASE}/freeBusy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: SYSTEM_TZ,
      items: calendarIds.map((id) => ({ id })),
    }),
  });

  if (!response.ok) throw new Error('Failed to get FreeBusy data');
  const data = await response.json();

  const result: Record<string, FreeBusySlot[]> = {};
  for (const calId of calendarIds) {
    result[calId] = (data.calendars?.[calId]?.busy || []).map((slot: { start: string; end: string }) => ({
      start: slot.start,
      end: slot.end,
    }));
  }
  return result;
}

export async function getCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    timeZone: SYSTEM_TZ,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const response = await fetch(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) throw new Error('Failed to get calendar events');
  const data = await response.json();

  return (data.items || []).map((event: Record<string, unknown>) => ({
    id: event.id,
    summary: event.summary || '',
    description: event.description || '',
    location: event.location || '',
    start: event.start,
    end: event.end,
    status: event.status,
  })) as GoogleCalendarEvent[];
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    startTime: string;
    endTime: string;
  },
): Promise<GoogleCalendarEvent> {
  const response = await fetch(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description || '',
        location: event.location || '',
        start: { dateTime: event.startTime, timeZone: SYSTEM_TZ },
        end: { dateTime: event.endTime, timeZone: SYSTEM_TZ },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create event: ${error.error?.message || 'Unknown error'}`);
  }

  return response.json();
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  updates: {
    summary?: string;
    description?: string;
    location?: string;
    startTime?: string;
    endTime?: string;
  },
): Promise<GoogleCalendarEvent> {
  const body: Record<string, unknown> = {};
  if (updates.summary) body.summary = updates.summary;
  if (updates.description !== undefined) body.description = updates.description;
  if (updates.location !== undefined) body.location = updates.location;
  if (updates.startTime) body.start = { dateTime: updates.startTime, timeZone: SYSTEM_TZ };
  if (updates.endTime) body.end = { dateTime: updates.endTime, timeZone: SYSTEM_TZ };

  const response = await fetch(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update event: ${error.error?.message || 'Unknown error'}`);
  }

  return response.json();
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const response = await fetch(
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete calendar event');
  }
}

// ============================================
// HIGH-LEVEL OPERATIONS
// ============================================

export async function connectGoogleCalendar(
  userId: string,
  code: string,
): Promise<{ success: boolean; calendarId?: string; error?: string }> {
  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Get user info from id_token or fetch calendar list
    const calendars = await listCalendars(tokens.access_token);
    const primaryCalendar = calendars.find((c) => c.primary) || calendars[0];

    if (!primaryCalendar) {
      return { success: false, error: 'No calendars found in Google account' };
    }

    // Get Google account email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    await supabase
      .from('ss_users')
      .update({
        google_account_id: userInfo.id || userInfo.email,
        google_calendar_id: primaryCalendar.id,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expires_at: expiresAt,
        calendar_connected: true,
      })
      .eq('id', userId);

    await logCalendarSync(userId, null, 'sync', 'success', `Connected calendar: ${primaryCalendar.summary}`);

    return { success: true, calendarId: primaryCalendar.id };
  } catch (error) {
    await logCalendarSync(userId, null, 'sync', 'failed', String(error));
    return { success: false, error: String(error) };
  }
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  await supabase
    .from('ss_users')
    .update({
      google_account_id: null,
      google_calendar_id: null,
      google_access_token: null,
      google_refresh_token: null,
      google_token_expires_at: null,
      calendar_connected: false,
    })
    .eq('id', userId);

  await logCalendarSync(userId, null, 'sync', 'success', 'Disconnected calendar');
}

export async function createAppointmentEvent(
  technicianId: string,
  appointmentId: string,
  customerName: string,
  appointmentType: string,
  phone: string,
  address: string,
  notes: string,
  startTime: string,
  endTime: string,
): Promise<string | null> {
  const accessToken = await getValidAccessToken(technicianId);
  if (!accessToken) return null;

  const { data: user } = await supabase
    .from('ss_users')
    .select('google_calendar_id')
    .eq('id', technicianId)
    .single();

  if (!user?.google_calendar_id) return null;

  try {
    const event = await createCalendarEvent(accessToken, user.google_calendar_id, {
      summary: `${customerName} - ${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)}`,
      description: [
        `Customer: ${customerName}`,
        `Phone: ${phone}`,
        `Address: ${address}`,
        `Notes: ${notes}`,
        '',
        'Created by New Paradigm Projects',
      ].join('\n'),
      location: address,
      startTime,
      endTime,
    });

    // Store event ID in appointment
    await supabase
      .from('ss_appointments')
      .update({
        google_calendar_event_id: event.id,
        google_calendar_id: user.google_calendar_id,
      })
      .eq('id', appointmentId);

    await logCalendarSync(technicianId, event.id, 'create', 'success');
    return event.id;
  } catch (error) {
    await logCalendarSync(technicianId, null, 'create', 'failed', String(error));
    return null;
  }
}

export async function updateAppointmentEvent(
  appointmentId: string,
  updates: {
    customerName?: string;
    appointmentType?: string;
    address?: string;
    notes?: string;
    startTime?: string;
    endTime?: string;
  },
): Promise<boolean> {
  const { data: appointment } = await supabase
    .from('ss_appointments')
    .select('technician_id, google_calendar_event_id, google_calendar_id')
    .eq('id', appointmentId)
    .single();

  if (!appointment?.google_calendar_event_id || !appointment?.google_calendar_id) {
    return false;
  }

  const accessToken = await getValidAccessToken(appointment.technician_id);
  if (!accessToken) return false;

  try {
    const eventUpdates: Record<string, string | undefined> = {};
    if (updates.customerName && updates.appointmentType) {
      eventUpdates.summary = `${updates.customerName} - ${updates.appointmentType.charAt(0).toUpperCase() + updates.appointmentType.slice(1)}`;
    }
    if (updates.address) eventUpdates.location = updates.address;
    if (updates.startTime) eventUpdates.startTime = updates.startTime;
    if (updates.endTime) eventUpdates.endTime = updates.endTime;

    await updateCalendarEvent(
      accessToken,
      appointment.google_calendar_id,
      appointment.google_calendar_event_id,
      eventUpdates,
    );

    await logCalendarSync(appointment.technician_id, appointment.google_calendar_event_id, 'update', 'success');
    return true;
  } catch (error) {
    await logCalendarSync(appointment.technician_id, appointment.google_calendar_event_id, 'update', 'failed', String(error));
    return false;
  }
}

export async function deleteAppointmentEvent(appointmentId: string): Promise<boolean> {
  const { data: appointment } = await supabase
    .from('ss_appointments')
    .select('technician_id, google_calendar_event_id, google_calendar_id')
    .eq('id', appointmentId)
    .single();

  if (!appointment?.google_calendar_event_id || !appointment?.google_calendar_id) {
    return false;
  }

  const accessToken = await getValidAccessToken(appointment.technician_id);
  if (!accessToken) return false;

  try {
    await deleteCalendarEvent(
      accessToken,
      appointment.google_calendar_id,
      appointment.google_calendar_event_id,
    );

    await supabase
      .from('ss_appointments')
      .update({ google_calendar_event_id: null, google_calendar_id: null })
      .eq('id', appointmentId);

    await logCalendarSync(appointment.technician_id, appointment.google_calendar_event_id, 'delete', 'success');
    return true;
  } catch (error) {
    await logCalendarSync(appointment.technician_id, appointment.google_calendar_event_id, 'delete', 'failed', String(error));
    return false;
  }
}

// ============================================
// HELPERS
// ============================================

async function logCalendarSync(
  userId: string,
  eventId: string | null,
  action: CalendarSyncLog['action'],
  status: CalendarSyncLog['status'],
  details?: string,
): Promise<void> {
  await supabase.from('ss_calendar_sync_logs').insert({
    user_id: userId,
    calendar_event_id: eventId,
    action,
    status,
    details,
  });
}

export async function getCalendarSyncLogs(userId: string, limit = 20): Promise<CalendarSyncLog[]> {
  const { data } = await supabase
    .from('ss_calendar_sync_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as CalendarSyncLog[];
}
