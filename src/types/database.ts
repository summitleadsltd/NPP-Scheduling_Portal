export type UserRole = 'admin' | 'manager' | 'scheduler' | 'technician';

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export type AppointmentType = 'installation' | 'repair' | 'maintenance' | 'inspection' | 'consultation';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  customer_id: string;
  address_line: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  technician_id: string;
  address_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  appointment_type: AppointmentType;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  call_recording_url?: string;
  // joined fields
  customer?: Customer;
  technician?: User;
  address?: Address;
}

export interface AvailabilityBlock {
  id: string;
  technician_id: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: boolean;
  type: string;
  reference_id?: string;
  created_at: string;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: string;
  business_hours_start: string;
  business_hours_end: string;
  default_appointment_duration: number;
  working_days: number[];
  created_at: string;
  updated_at: string;
}

export interface SchedulingSlot {
  technician_id: string;
  technician_name: string;
  start_time: string;
  end_time: string;
  score: number;
  rating: number;
  travel_time_before: number;
  travel_time_after: number;
  distance_before: number;
  distance_after: number;
}

export interface AppointmentActivityLog {
  id: string;
  appointment_id: string;
  user_id: string;
  user_name: string;
  action_type: 'created' | 'updated' | 'rescheduled' | 'reassigned' | 'status_changed' | 'cancelled' | 'deleted';
  old_value?: any;
  new_value?: any;
  field_changed?: string;
  created_at: string;
}
