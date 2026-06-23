import { supabase } from '@/lib/supabase';

export async function createNotification(params: {
  user_id: string;
  title: string;
  body: string;
  type: string;
  reference_id?: string;
}) {
  const { error } = await supabase
    .from('ss_notifications')
    .insert({
      ...params,
      read: false,
    });
  if (error) throw error;
}

export async function notifyNewAppointment(
  technicianId: string,
  customerName: string,
  appointmentTime: string,
  appointmentId: string,
) {
  await createNotification({
    user_id: technicianId,
    title: 'New Appointment Assigned',
    body: `You have a new appointment with ${customerName} at ${appointmentTime}`,
    type: 'appointment_assigned',
    reference_id: appointmentId,
  });
}

export async function notifyAppointmentRescheduled(
  technicianId: string,
  customerName: string,
  newTime: string,
  appointmentId: string,
) {
  await createNotification({
    user_id: technicianId,
    title: 'Appointment Rescheduled',
    body: `Your appointment with ${customerName} has been rescheduled to ${newTime}`,
    type: 'appointment_rescheduled',
    reference_id: appointmentId,
  });
}

export async function notifyAppointmentReassigned(
  oldTechnicianId: string,
  newTechnicianId: string,
  customerName: string,
  appointmentTime: string,
  appointmentId: string,
) {
  // Notify old technician
  await createNotification({
    user_id: oldTechnicianId,
    title: 'Appointment Reassigned',
    body: `Your appointment with ${customerName} at ${appointmentTime} has been reassigned to another technician`,
    type: 'appointment_reassigned',
    reference_id: appointmentId,
  });

  // Notify new technician
  await createNotification({
    user_id: newTechnicianId,
    title: 'New Appointment Assigned',
    body: `You have been assigned an appointment with ${customerName} at ${appointmentTime}`,
    type: 'appointment_assigned',
    reference_id: appointmentId,
  });
}

export async function notifyStatusChanged(
  technicianId: string,
  customerName: string,
  newStatus: string,
  appointmentId: string,
) {
  await createNotification({
    user_id: technicianId,
    title: 'Appointment Status Changed',
    body: `Your appointment with ${customerName} is now ${newStatus}`,
    type: 'status_changed',
    reference_id: appointmentId,
  });
}

export async function notifyAppointmentCancelled(
  technicianId: string,
  customerName: string,
  appointmentId: string,
) {
  await createNotification({
    user_id: technicianId,
    title: 'Appointment Cancelled',
    body: `Your appointment with ${customerName} has been cancelled`,
    type: 'appointment_cancelled',
    reference_id: appointmentId,
  });
}

export async function notifyAppointmentCompleted(
  technicianId: string,
  customerName: string,
  appointmentId: string,
) {
  await createNotification({
    user_id: technicianId,
    title: 'Appointment Completed',
    body: `Appointment with ${customerName} has been marked as completed`,
    type: 'appointment_completed',
    reference_id: appointmentId,
  });
}

export async function notifyAppointmentNoShow(
  technicianId: string,
  customerName: string,
  appointmentId: string,
) {
  await createNotification({
    user_id: technicianId,
    title: 'Appointment Marked as No-Show',
    body: `Appointment with ${customerName} has been marked as no-show`,
    type: 'appointment_no_show',
    reference_id: appointmentId,
  });
}
