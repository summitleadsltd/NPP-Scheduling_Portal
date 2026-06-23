import { supabase } from '@/lib/supabase';
import { toEST, formatEST } from '@/lib/timezone';
import { createAppointmentEvent, updateAppointmentEvent, deleteAppointmentEvent } from './googleCalendarService';
import {
  notifyAppointmentCreatedAll,
  notifyAppointmentUpdatedAll,
  notifyAppointmentDeletedAll,
  notifyAppointmentStatusChangedAll,
} from './notificationService';
import type { Appointment, AppointmentStatus } from '@/types/database';

export async function getAppointments(filters?: {
  technician_id?: string;
  status?: AppointmentStatus;
  start_date?: string;
  end_date?: string;
}) {
  let query = supabase
    .from('ss_appointments')
    .select(`
      *,
      customer:ss_customers(*),
      technician:ss_users!ss_appointments_technician_id_fkey(*),
      address:ss_addresses(*)
    `)
    .order('start_time', { ascending: true });

  if (filters?.technician_id) {
    query = query.eq('technician_id', filters.technician_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.start_date) {
    query = query.gte('start_time', filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte('start_time', filters.end_date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Appointment[];
}

export async function getAppointment(id: string) {
  const { data, error } = await supabase
    .from('ss_appointments')
    .select(`
      *,
      customer:ss_customers(*),
      technician:ss_users!ss_appointments_technician_id_fkey(*),
      address:ss_addresses(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Appointment;
}

export async function createAppointment(appointment: {
  customer_id: string;
  technician_id: string;
  address_id: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  notes?: string;
  created_by: string;
}) {
  const { data, error } = await supabase
    .from('ss_appointments')
    .insert({ ...appointment, status: 'scheduled' })
    .select(`
      *,
      customer:ss_customers(*),
      technician:ss_users!ss_appointments_technician_id_fkey(*),
      address:ss_addresses(*)
    `)
    .single();
  if (error) throw error;

  const apt = data as Appointment;

  // Create Google Calendar event if technician has connected calendar
  if (apt.customer && apt.address) {
    const customerName = `${apt.customer.first_name} ${apt.customer.last_name}`;
    const address = apt.address
      ? `${apt.address.address_line}, ${apt.address.city}, ${apt.address.state} ${apt.address.zip_code}`
      : '';

    await createAppointmentEvent(
      apt.technician_id,
      apt.id,
      customerName,
      apt.appointment_type,
      apt.customer.phone,
      address,
      apt.notes || '',
      apt.start_time,
      apt.end_time,
    );
  }

  // Notify all technicians and managers
  await notifyAppointmentCreatedAll(
    apt.technician?.name || 'Unknown',
    `${apt.customer?.first_name} ${apt.customer?.last_name}`,
    formatEST(apt.start_time, 'MMM d, h:mm a'),
    formatEST(apt.end_time, 'h:mm a')
  );

  return apt;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { data, error } = await supabase
    .from('ss_appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      customer:ss_customers(*),
      technician:ss_users!ss_appointments_technician_id_fkey(*)
    `)
    .single();
  if (error) throw error;

  const apt = data as Appointment;

  // If cancelled, delete the Google Calendar event
  if (status === 'cancelled') {
    await deleteAppointmentEvent(id);
  }

  // Notify all technicians and managers
  await notifyAppointmentStatusChangedAll(
    apt.technician?.name || 'Unknown',
    `${apt.customer?.first_name} ${apt.customer?.last_name}`,
    status
  );

  return apt;
}

export async function rescheduleAppointment(id: string, start_time: string, end_time: string, technician_id?: string) {
  const update: Record<string, string> = {
    start_time,
    end_time,
    updated_at: new Date().toISOString(),
  };
  if (technician_id) update.technician_id = technician_id;

  const { data, error } = await supabase
    .from('ss_appointments')
    .update(update)
    .eq('id', id)
    .select(`
      *,
      customer:ss_customers(*),
      technician:ss_users!ss_appointments_technician_id_fkey(*),
      address:ss_addresses(*)
    `)
    .single();
  if (error) throw error;

  const apt = data as Appointment;

  // Update Google Calendar event
  await updateAppointmentEvent(id, { startTime: start_time, endTime: end_time });

  // Notify all technicians and managers
  await notifyAppointmentUpdatedAll(
    apt.technician?.name || 'Unknown',
    `${apt.customer?.first_name} ${apt.customer?.last_name}`,
    formatEST(apt.start_time, 'MMM d, h:mm a'),
    formatEST(apt.end_time, 'h:mm a')
  );

  return apt;
}

export async function updateAppointment(id: string, update: {
  start_time?: string;
  end_time?: string;
  appointment_type?: string;
  notes?: string;
  status?: AppointmentStatus;
  technician_id?: string;
}) {
  const { data, error } = await supabase
    .from('ss_appointments')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      customer:ss_customers(*),
      technician:ss_users!ss_appointments_technician_id_fkey(*),
      address:ss_addresses(*)
    `)
    .single();
  if (error) throw error;

  const apt = data as Appointment;

  // Update Google Calendar event if applicable
  if (update.status === 'cancelled') {
    await deleteAppointmentEvent(id);
  } else if (update.start_time || update.end_time || update.appointment_type || update.notes) {
    const customerName = apt.customer
      ? `${apt.customer.first_name} ${apt.customer.last_name}`
      : undefined;
    const address = apt.address
      ? `${apt.address.address_line}, ${apt.address.city}, ${apt.address.state} ${apt.address.zip_code}`
      : undefined;

    await updateAppointmentEvent(id, {
      customerName,
      appointmentType: update.appointment_type || apt.appointment_type,
      address,
      notes: update.notes,
      startTime: update.start_time,
      endTime: update.end_time,
    });
  }

  // Notify all technicians and managers if time changed
  if (update.start_time || update.end_time) {
    await notifyAppointmentUpdatedAll(
      apt.technician?.name || 'Unknown',
      `${apt.customer?.first_name} ${apt.customer?.last_name}`,
      formatEST(apt.start_time, 'MMM d, h:mm a'),
      formatEST(apt.end_time, 'h:mm a')
    );
  }

  return apt;
}

export async function deleteAppointment(id: string) {
  // Get appointment details before deletion for notification
  const { data: apt } = await supabase
    .from('ss_appointments')
    .select(`
      *,
      customer:ss_customers(*),
      technician:ss_users!ss_appointments_technician_id_fkey(*)
    `)
    .eq('id', id)
    .single();

  // Delete Google Calendar event first
  await deleteAppointmentEvent(id);

  const { error } = await supabase
    .from('ss_appointments')
    .delete()
    .eq('id', id);
  if (error) throw error;

  // Notify all technicians and managers
  if (apt) {
    await notifyAppointmentDeletedAll(
      apt.technician?.name || 'Unknown',
      `${apt.customer?.first_name} ${apt.customer?.last_name}`,
      formatEST(apt.start_time, 'MMM d, h:mm a')
    );
  }
}

export async function getTodayAppointments(technicianId?: string) {
  const today = toEST(new Date());
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getAppointments({
    technician_id: technicianId,
    start_date: today.toISOString(),
    end_date: tomorrow.toISOString(),
  });
}

export async function getWeekAppointments(technicianId?: string) {
  const today = toEST(new Date());
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return getAppointments({
    technician_id: technicianId,
    start_date: today.toISOString(),
    end_date: weekEnd.toISOString(),
  });
}
