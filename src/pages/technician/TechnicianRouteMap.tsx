import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getAppointments } from '@/services/appointmentService';
import { supabase } from '@/lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatEST } from '@/lib/timezone';
import { Navigation, ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from 'lucide-react';
import { StartRouteButton } from '@/components/shared/StartRouteButton';
import type { Appointment } from '@/types/database';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format, addDays, subDays } from 'date-fns';

// Fix default marker icons in Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const createNumberedIcon = (number: number) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export function TechnicianRouteMap() {
  const { profile } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      try {
        const allAppointments = await getAppointments();
        
        // Use timezone-aware date boundaries
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayAppointments = allAppointments.filter((apt) => {
          const aptDate = new Date(apt.start_time);
          return apt.technician_id === profile.id && 
                 aptDate >= dayStart && 
                 aptDate <= dayEnd &&
                 apt.address?.latitude && 
                 apt.address?.longitude;
        });
        
        // Sort by start time for route optimization
        dayAppointments.sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
        
        setAppointments(dayAppointments);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile, selectedDate]);

  // Set up realtime subscription for appointments
  useEffect(() => {
    const subscription = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ss_appointments',
        },
        () => {
          // Reload appointments when changes occur
          if (profile) {
            const load = async () => {
              try {
                const allAppointments = await getAppointments();
                
                // Use timezone-aware date boundaries
                const dayStart = new Date(selectedDate);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(selectedDate);
                dayEnd.setHours(23, 59, 59, 999);
                
                const dayAppointments = allAppointments.filter((apt) => {
                  const aptDate = new Date(apt.start_time);
                  return apt.technician_id === profile.id && 
                         aptDate >= dayStart && 
                         aptDate <= dayEnd &&
                         apt.address?.latitude && 
                         apt.address?.longitude;
                });
                
                dayAppointments.sort((a, b) => 
                  new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                );
                
                setAppointments(dayAppointments);
              } catch (error) {
                console.error('Failed to reload appointments:', error);
              }
            };
            load();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile, selectedDate]);

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const calculateRouteStats = () => {
    if (appointments.length === 0) {
      return { totalDistance: 0, driveTime: 0, routeDuration: 0 };
    }

    let totalDistance = 0;
    let driveTime = 0;

    for (let i = 0; i < appointments.length - 1; i++) {
      const from = appointments[i].address;
      const to = appointments[i + 1].address;
      if (from?.latitude && from?.longitude && to?.latitude && to?.longitude) {
        // Simple distance calculation (Haversine formula approximation)
        const lat1 = from.latitude * Math.PI / 180;
        const lat2 = to.latitude * Math.PI / 180;
        const deltaLat = (to.latitude - from.latitude) * Math.PI / 180;
        const deltaLon = (to.longitude - from.longitude) * Math.PI / 180;
        
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = 3959 * c; // Miles
        
        totalDistance += distance;
        driveTime += distance * 1.5; // Approximate 1.5 minutes per mile
      }
    }

    const firstStart = new Date(appointments[0].start_time);
    const lastEnd = new Date(appointments[appointments.length - 1].end_time);
    const routeDuration = (lastEnd.getTime() - firstStart.getTime()) / (1000 * 60 * 60); // Hours

    return { totalDistance, driveTime, routeDuration };
  };

  const routeStats = calculateRouteStats();

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const center: [number, number] =
    appointments.length > 0 && appointments[0].address?.latitude && appointments[0].address?.longitude
      ? [appointments[0].address.latitude, appointments[0].address.longitude]
      : [39.8283, -98.5795]; // Center of US

  const routeCoords: [number, number][] = appointments
    .filter((a) => a.address?.latitude && a.address?.longitude)
    .map((a) => [a.address!.latitude!, a.address!.longitude!]);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Route Map</h1>
        
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size={isMobile ? "lg" : "sm"} onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
            {!isMobile && 'Previous'}
          </Button>
          <Button variant="outline" size={isMobile ? "lg" : "sm"} onClick={handleToday}>
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button variant="outline" size={isMobile ? "lg" : "sm"} onClick={handleNextDay}>
            {!isMobile && 'Next'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Selected Date Display */}
      <div className="text-center">
        <h2 className="text-xl font-semibold">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h2>
      </div>

      {/* Route Statistics */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Appointments</p>
                  <p className="font-semibold">{appointments.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-semibold">{routeStats.totalDistance.toFixed(1)} mi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Drive Time</p>
                  <p className="font-semibold">{Math.round(routeStats.driveTime)} min</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Route Duration</p>
                  <p className="font-semibold">{routeStats.routeDuration.toFixed(1)} hrs</p>
                </div>
              </div>
            </div>
            {appointments.length > 0 && (
              <Button size={isMobile ? "lg" : "lg"} className="w-full md:w-auto">
                <Navigation className="h-4 w-4 mr-2" />
                Start Entire Route
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <MapContainer
                center={center}
                zoom={appointments.length > 0 ? 12 : 4}
                style={{ height: '500px', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {appointments.map((apt, index) =>
                  apt.address?.latitude && apt.address?.longitude ? (
                    <Marker
                      key={apt.id}
                      position={[apt.address.latitude, apt.address.longitude]}
                      icon={createNumberedIcon(index + 1)}
                    >
                      <Popup>
                        <div>
                          <strong>
                            {apt.customer?.first_name} {apt.customer?.last_name}
                          </strong>
                          <br />
                          {formatEST(apt.start_time, 'h:mm a')}
                          <br />
                          {apt.address.address_line}
                        </div>
                      </Popup>
                    </Marker>
                  ) : null,
                )}
                {routeCoords.length > 1 && (
                  <Polyline positions={routeCoords} color="#3b82f6" weight={3} dashArray="10" />
                )}
              </MapContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today's Stops</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stops today</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt, index) => (
                  <div key={apt.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 ${isMobile ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-xs'}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isMobile ? 'text-base' : 'text-sm'}`}>
                        {apt.customer?.first_name} {apt.customer?.last_name}
                      </p>
                      <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>
                        {formatEST(apt.start_time, 'h:mm a')} -{' '}
                        {formatEST(apt.end_time, 'h:mm a')}
                      </p>
                      <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                        {apt.address?.address_line}
                      </p>
                    </div>
                    <StartRouteButton appointment={apt} size={isMobile ? "lg" : "sm"} variant="outline" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
