import { supabase } from '@/lib/supabase';
import { getRoute } from './geocodingService';
import { getFreeBusy, getCalendarEvents, getValidAccessToken } from './googleCalendarService';
import type { SchedulingSlot, Appointment, User, GoogleCalendarEvent } from '@/types/database';
import { addMinutes, startOfDay, endOfDay, parseISO, isAfter, isBefore, format, addDays, getDay } from 'date-fns';
import { toEST } from '@/lib/timezone';

const DEFAULT_DURATION = 60; // minutes
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const SLOT_INCREMENT = 30; // minutes
const DAYS_AHEAD = 14;
const MAX_SLOTS = 10;

interface TechnicianCalendarData {
  technician: User;
  busySlots: { start: Date; end: Date }[];
  events: GoogleCalendarEvent[];
  appointments: Appointment[]; // DB appointments for address data (travel calc)
}

export async function findBestSlots(
  customerLat: number,
  customerLng: number,
  durationMinutes: number = DEFAULT_DURATION,
): Promise<SchedulingSlot[]> {
  // 1. Get all active technicians with connected calendars
  const { data: technicians } = await supabase
    .from('ss_users')
    .select('*')
    .eq('role', 'technician')
    .eq('active', true);

  if (!technicians || technicians.length === 0) return [];

  // 2. Date range to search (14 days ahead)
  const now = toEST(new Date());
  const searchStart = isAfter(now, startOfBusinessDay(now))
    ? now
    : startOfBusinessDay(now);
  const searchEnd = endOfDay(addDays(now, DAYS_AHEAD));

  // 3. Retrieve calendar data for each technician
  const techData: TechnicianCalendarData[] = [];

  for (const tech of technicians as User[]) {
    const calData = await getTechnicianCalendarData(tech, searchStart, searchEnd);
    techData.push(calData);
  }

  // 4. Find available slots for each technician
  const allSlots: SchedulingSlot[] = [];

  for (const td of techData) {
    const slots = await findTechnicianSlots(
      td,
      customerLat,
      customerLng,
      durationMinutes,
      searchStart,
      searchEnd,
    );
    allSlots.push(...slots);
  }

  // 5. Sort by score (lower is better) and return top slots
  allSlots.sort((a, b) => a.score - b.score);
  return allSlots.slice(0, MAX_SLOTS);
}

async function getTechnicianCalendarData(
  technician: User,
  searchStart: Date,
  searchEnd: Date,
): Promise<TechnicianCalendarData> {
  const timeMin = searchStart.toISOString();
  const timeMax = searchEnd.toISOString();
  let busySlots: { start: Date; end: Date }[] = [];
  let events: GoogleCalendarEvent[] = [];

  // Try Google Calendar if connected
  if (technician.calendar_connected && technician.google_calendar_id) {
    const accessToken = await getValidAccessToken(technician.id);
    if (accessToken) {
      try {
        // Get FreeBusy data for conflict detection
        const freeBusy = await getFreeBusy(
          accessToken,
          [technician.google_calendar_id],
          timeMin,
          timeMax,
        );
        const calBusy = freeBusy[technician.google_calendar_id] || [];
        busySlots = calBusy.map((slot) => ({
          start: new Date(slot.start),
          end: new Date(slot.end),
        }));

        // Get actual events for travel calculation (need locations)
        events = await getCalendarEvents(
          accessToken,
          technician.google_calendar_id,
          timeMin,
          timeMax,
        );
      } catch {
        // Fall back to DB appointments if Google Calendar fails
        console.warn(`Google Calendar fetch failed for ${technician.name}, falling back to DB`);
      }
    }
  }

  // Also get DB appointments (have geocoded addresses for travel calc)
  const { data: appointments } = await supabase
    .from('ss_appointments')
    .select('*, address:ss_addresses(*)')
    .eq('technician_id', technician.id)
    .gte('start_time', timeMin)
    .lte('start_time', timeMax)
    .neq('status', 'cancelled')
    .order('start_time');

  // If no Google Calendar data, use DB appointments as busy slots
  if (busySlots.length === 0 && !technician.calendar_connected) {
    busySlots = (appointments || []).map((apt: Appointment) => ({
      start: new Date(apt.start_time),
      end: new Date(apt.end_time),
    }));
  }

  return {
    technician,
    busySlots,
    events,
    appointments: (appointments || []) as Appointment[],
  };
}

async function findTechnicianSlots(
  techData: TechnicianCalendarData,
  customerLat: number,
  customerLng: number,
  duration: number,
  searchStart: Date,
  searchEnd: Date,
): Promise<SchedulingSlot[]> {
  const slots: SchedulingSlot[] = [];
  const { technician, busySlots, appointments } = techData;

  // Iterate through each day
  let currentDay = startOfDay(searchStart);
  while (isBefore(currentDay, searchEnd)) {
    // Skip weekends (0 = Sunday, 6 = Saturday)
    const dayOfWeek = getDay(currentDay);
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentDay = addDays(currentDay, 1);
      continue;
    }

    const dayStart = startOfBusinessDay(currentDay);
    const dayEnd = endOfBusinessDay(currentDay);

    // Skip if day start is in the past
    const effectiveStart = isAfter(searchStart, dayStart) ? searchStart : dayStart;

    // Round up to next slot increment
    const startMinutes = effectiveStart.getHours() * 60 + effectiveStart.getMinutes();
    const roundedMinutes = Math.ceil(startMinutes / SLOT_INCREMENT) * SLOT_INCREMENT;
    let slotStart = new Date(effectiveStart);
    slotStart.setHours(Math.floor(roundedMinutes / 60), roundedMinutes % 60, 0, 0);

    while (isBefore(slotStart, dayEnd)) {
      const slotEnd = addMinutes(slotStart, duration);
      if (isAfter(slotEnd, dayEnd)) break;

      // Check if slot conflicts with busy slots (from Google Calendar or DB)
      const hasConflict = busySlots.some((busy) => {
        return isBefore(slotStart, busy.end) && isAfter(slotEnd, busy.start);
      });

      if (!hasConflict) {
        // Calculate travel times using DB appointments (have addresses)
        const { travelBefore, distanceBefore } = await calculateTravelBefore(
          appointments,
          slotStart,
          customerLat,
          customerLng,
        );
        const { travelAfter, distanceAfter } = await calculateTravelAfter(
          appointments,
          slotEnd,
          customerLat,
          customerLng,
        );

        // Calculate workload score
        const dayBusy = busySlots.filter((b) =>
          format(b.start, 'yyyy-MM-dd') === format(slotStart, 'yyyy-MM-dd')
        );
        const workloadWeight = dayBusy.length * 5;

        // Schedule density: prefer slots adjacent to existing busy times
        const densityWeight = calculateDensityWeight(busySlots, slotStart, slotEnd);

        // Final score
        const score = travelBefore + travelAfter + workloadWeight + densityWeight;

        // Convert score to star rating (1-5)
        const rating = Math.max(1, Math.min(5, Math.round(5 - score / 20)));

        slots.push({
          technician_id: technician.id,
          technician_name: technician.name,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          score,
          rating,
          travel_time_before: travelBefore,
          travel_time_after: travelAfter,
          distance_before: distanceBefore,
          distance_after: distanceAfter,
        });
      }

      slotStart = addMinutes(slotStart, SLOT_INCREMENT);
    }

    currentDay = addDays(currentDay, 1);
  }

  return slots;
}

async function calculateTravelBefore(
  appointments: Appointment[],
  slotStart: Date,
  customerLat: number,
  customerLng: number,
): Promise<{ travelBefore: number; distanceBefore: number }> {
  const prevAppointments = appointments
    .filter((a) => isBefore(parseISO(a.end_time), slotStart))
    .sort((a, b) => parseISO(b.end_time).getTime() - parseISO(a.end_time).getTime());

  if (prevAppointments.length === 0) {
    return { travelBefore: 0, distanceBefore: 0 };
  }

  const prev = prevAppointments[0];
  const prevAddress = prev.address;

  if (!prevAddress?.latitude || !prevAddress?.longitude) {
    return { travelBefore: 10, distanceBefore: 5 };
  }

  const route = await getRoute(
    prevAddress.latitude,
    prevAddress.longitude,
    customerLat,
    customerLng,
  );

  return {
    travelBefore: route?.duration ?? 10,
    distanceBefore: route?.distance ?? 5,
  };
}

async function calculateTravelAfter(
  appointments: Appointment[],
  slotEnd: Date,
  customerLat: number,
  customerLng: number,
): Promise<{ travelAfter: number; distanceAfter: number }> {
  const nextAppointments = appointments
    .filter((a) => isAfter(parseISO(a.start_time), slotEnd))
    .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

  if (nextAppointments.length === 0) {
    return { travelAfter: 0, distanceAfter: 0 };
  }

  const next = nextAppointments[0];
  const nextAddress = next.address;

  if (!nextAddress?.latitude || !nextAddress?.longitude) {
    return { travelAfter: 10, distanceAfter: 5 };
  }

  const route = await getRoute(
    customerLat,
    customerLng,
    nextAddress.latitude,
    nextAddress.longitude,
  );

  return {
    travelAfter: route?.duration ?? 10,
    distanceAfter: route?.distance ?? 5,
  };
}

function calculateDensityWeight(
  busySlots: { start: Date; end: Date }[],
  slotStart: Date,
  slotEnd: Date,
): number {
  const bufferMinutes = 30;

  const hasNearbyBefore = busySlots.some((b) => {
    const diff = Math.abs(slotStart.getTime() - b.end.getTime()) / 60000;
    return diff <= bufferMinutes;
  });

  const hasNearbyAfter = busySlots.some((b) => {
    const diff = Math.abs(b.start.getTime() - slotEnd.getTime()) / 60000;
    return diff <= bufferMinutes;
  });

  if (hasNearbyBefore && hasNearbyAfter) return -10;
  if (hasNearbyBefore || hasNearbyAfter) return -5;
  return 0;
}

function startOfBusinessDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  return d;
}

function endOfBusinessDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(BUSINESS_END_HOUR, 0, 0, 0);
  return d;
}
