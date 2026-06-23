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

export async function notifyMultipleUsers(params: {
  user_ids: string[];
  title: string;
  body: string;
  type: string;
  reference_id?: string;
}) {
  const notifications = params.user_ids.map((user_id) => ({
    user_id,
    title: params.title,
    body: params.body,
    type: params.type,
    reference_id: params.reference_id,
    read: false,
  }));

  const { error } = await supabase.from('ss_notifications').insert(notifications);
  if (error) throw error;
}

export async function getManagementUsers() {
  const { data, error } = await supabase
    .from('ss_users')
    .select('id')
    .in('role', ['admin', 'manager', 'scheduler'])
    .eq('active', true);
  if (error) throw error;
  return data.map((u) => u.id);
}

export async function getAllTechnicians() {
  const { data, error } = await supabase
    .from('ss_users')
    .select('id')
    .eq('role', 'technician')
    .eq('active', true);
  if (error) throw error;
  return data.map((u) => u.id);
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

export async function notifyAppointmentChanged(
  technicianId: string,
  customerName: string,
  appointmentId: string,
) {
  await createNotification({
    user_id: technicianId,
    title: 'Appointment Updated',
    body: `Your appointment with ${customerName} has been updated`,
    type: 'appointment_changed',
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

export async function notifyAvailabilityBlockCreated(
  technicianName: string,
  startTime: string,
  endTime: string,
  reason: string,
) {
  const managementUsers = await getManagementUsers();
  const allTechnicians = await getAllTechnicians();

  const allUserIds = [...new Set([...managementUsers, ...allTechnicians])];

  await notifyMultipleUsers({
    user_ids: allUserIds,
    title: 'Availability Block Added',
    body: `${technicianName} is unavailable from ${startTime} to ${endTime} (${reason})`,
    type: 'availability_block_created',
  });
}

export async function notifyAvailabilityBlockDeleted(
  technicianName: string,
  startTime: string,
  endTime: string,
) {
  const managementUsers = await getManagementUsers();
  const allTechnicians = await getAllTechnicians();

  const allUserIds = [...new Set([...managementUsers, ...allTechnicians])];

  await notifyMultipleUsers({
    user_ids: allUserIds,
    title: 'Availability Block Removed',
    body: `${technicianName} is now available from ${startTime} to ${endTime}`,
    type: 'availability_block_deleted',
  });
}

export async function notifyAppointmentCreatedAll(
  technicianName: string,
  customerName: string,
  startTime: string,
  endTime: string,
) {
  const managementUsers = await getManagementUsers();
  const allTechnicians = await getAllTechnicians();

  const allUserIds = [...new Set([...managementUsers, ...allTechnicians])];

  await notifyMultipleUsers({
    user_ids: allUserIds,
    title: 'New Appointment Scheduled',
    body: `${customerName} scheduled with ${technicianName} from ${startTime} to ${endTime}`,
    type: 'appointment_created',
  });
}

export async function notifyAppointmentUpdatedAll(
  technicianName: string,
  customerName: string,
  startTime: string,
  endTime: string,
) {
  const managementUsers = await getManagementUsers();
  const allTechnicians = await getAllTechnicians();

  const allUserIds = [...new Set([...managementUsers, ...allTechnicians])];

  await notifyMultipleUsers({
    user_ids: allUserIds,
    title: 'Appointment Updated',
    body: `${customerName}'s appointment with ${technicianName} updated to ${startTime} - ${endTime}`,
    type: 'appointment_updated',
  });
}

export async function notifyAppointmentDeletedAll(
  technicianName: string,
  customerName: string,
  startTime: string,
) {
  const managementUsers = await getManagementUsers();
  const allTechnicians = await getAllTechnicians();

  const allUserIds = [...new Set([...managementUsers, ...allTechnicians])];

  await notifyMultipleUsers({
    user_ids: allUserIds,
    title: 'Appointment Cancelled',
    body: `${customerName}'s appointment with ${technicianName} at ${startTime} has been cancelled`,
    type: 'appointment_deleted',
  });
}

export async function notifyAppointmentStatusChangedAll(
  technicianName: string,
  customerName: string,
  status: string,
) {
  const managementUsers = await getManagementUsers();
  const allTechnicians = await getAllTechnicians();

  const allUserIds = [...new Set([...managementUsers, ...allTechnicians])];

  await notifyMultipleUsers({
    user_ids: allUserIds,
    title: 'Appointment Status Changed',
    body: `${customerName}'s appointment with ${technicianName} is now ${status}`,
    type: 'appointment_status_changed',
  });
}
