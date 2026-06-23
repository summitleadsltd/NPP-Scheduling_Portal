import type { Appointment } from '@/types/database';

interface Location {
  lat: number;
  lng: number;
}

interface RouteStop extends Appointment {
  distanceFromPrevious?: number;
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) *
      Math.cos(toRad(loc2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Nearest Neighbor algorithm for route optimization
export function optimizeRoute(appointments: Appointment[]): Appointment[] {
  if (appointments.length <= 2) return appointments;

  const validAppointments = appointments.filter(
    (apt) => apt.address?.latitude && apt.address?.longitude
  );

  if (validAppointments.length <= 2) return appointments;

  const optimized: RouteStop[] = [];
  const remaining = [...validAppointments] as RouteStop[];

  // Start with the first appointment (or could use current location)
  let current = remaining.shift()!;
  optimized.push(current);

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    // Find nearest unvisited stop
    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      if (!stop.address?.latitude || !stop.address?.longitude) continue;

      const distance = calculateDistance(
        { lat: current.address!.latitude!, lng: current.address!.longitude! },
        { lat: stop.address.latitude, lng: stop.address.longitude }
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const nearest = remaining.splice(nearestIndex, 1)[0];
    nearest.distanceFromPrevious = nearestDistance;
    optimized.push(nearest);
    current = nearest;
  }

  return optimized;
}

// Calculate total route distance
export function calculateTotalDistance(appointments: Appointment[]): number {
  if (appointments.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < appointments.length - 1; i++) {
    const current = appointments[i];
    const next = appointments[i + 1];

    if (
      current.address?.latitude &&
      current.address?.longitude &&
      next.address?.latitude &&
      next.address?.longitude
    ) {
      totalDistance += calculateDistance(
        { lat: current.address.latitude, lng: current.address.longitude },
        { lat: next.address.latitude, lng: next.address.longitude }
      );
    }
  }

  return totalDistance;
}

// Estimate travel time (assuming average speed of 30 mph in urban areas)
export function estimateTravelTime(distanceMiles: number): number {
  const averageSpeed = 30; // mph
  return (distanceMiles / averageSpeed) * 60; // return minutes
}
