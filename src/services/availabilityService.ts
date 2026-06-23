import { supabase } from '@/lib/supabase';
import type { AvailabilityBlock } from '@/types/database';

export async function getAvailabilityBlocks(technicianId?: string): Promise<AvailabilityBlock[]> {
  let query = supabase
    .from('ss_availability_blocks')
    .select('*')
    .order('start_time', { ascending: true });

  if (technicianId) {
    query = query.eq('technician_id', technicianId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AvailabilityBlock[];
}

export async function createAvailabilityBlock(block: {
  technician_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
}): Promise<AvailabilityBlock> {
  const { data, error } = await supabase
    .from('ss_availability_blocks')
    .insert(block)
    .select()
    .single();
  if (error) throw error;
  return data as AvailabilityBlock;
}

export async function deleteAvailabilityBlock(id: string): Promise<void> {
  const { error } = await supabase
    .from('ss_availability_blocks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
