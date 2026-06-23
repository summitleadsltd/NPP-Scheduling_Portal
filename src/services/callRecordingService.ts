import { supabase } from '@/lib/supabase';

const BUCKET_NAME = 'call-recordings';

export async function uploadCallRecording(
  file: File,
  appointmentId: string,
  userId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${appointmentId}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function deleteCallRecording(recordingUrl: string): Promise<void> {
  // Extract file path from URL
  const url = new URL(recordingUrl);
  const pathParts = url.pathname.split('/');
  const filePath = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join('/');

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) throw error;
}

export async function updateAppointmentRecording(
  appointmentId: string,
  recordingUrl: string | null
): Promise<void> {
  const { error } = await supabase
    .from('ss_appointments')
    .update({ call_recording_url: recordingUrl })
    .eq('id', appointmentId);

  if (error) throw error;
}
