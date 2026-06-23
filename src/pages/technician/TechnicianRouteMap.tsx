import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getAppointments } from '@/services/appointmentService';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatEST } from '@/lib/timezone';
import type { Appointment } from '@/types/database';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronLeft, ChevronRight, Calendar, Navigation } from 'lucide-react';

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

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const data = await getAppointments({
          technician_id: profile.id,
          start_date: startOfDay.toISOString(),
          end_date: endOfDay.toISOString(),
        });
        setAppointments(data.filter((a) => a.address?.latitude && a.address?.longitude));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile, selectedDate]);

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const startNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  const startEntireRoute = () => {
    if (appointments.length === 0) return;
    const firstAddress = appointments[0].address?.address_line;
    if (firstAddress) {
      startNavigation(firstAddress);
    }
  };

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Route Map</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <Calendar className="h-4 w-4 mr-1" />
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateDate(1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {formatEST(selectedDate.toISOString(), 'EEEE, MMMM d, yyyy')}
        </p>
        <Button onClick={startEntireRoute} disabled={appointments.length === 0}>
          <Navigation className="h-4 w-4 mr-2" />
          Start Route
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
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
            <CardTitle>Stops ({appointments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stops today</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt, index) => (
                  <div key={apt.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {apt.customer?.first_name} {apt.customer?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatEST(apt.start_time, 'h:mm a')} -{' '}
                        {formatEST(apt.end_time, 'h:mm a')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {apt.address?.address_line}
                      </p>
                      {apt.address?.address_line && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={() => startNavigation(apt.address.address_line)}
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          Navigate
                        </Button>
                      )}
                    </div>
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
