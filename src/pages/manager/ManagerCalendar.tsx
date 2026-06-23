import { useEffect, useState, useCallback } from 'react';
import { getAppointments, updateAppointmentStatus } from '@/services/appointmentService';
import { getCalendarEvents, getValidAccessToken } from '@/services/googleCalendarService';
import { supabase } from '@/lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventInput, EventClickArg } from '@fullcalendar/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SYSTEM_TZ } from '@/lib/timezone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppointmentStatusBadge } from '@/components/shared/AppointmentStatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatEST } from '@/lib/timezone';
import { addDays } from 'date-fns';
import type { Appointment, AppointmentStatus, User } from '@/types/database';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show: '#6b7280',
};

const technicianColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
];

export function ManagerCalendar() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [filterTechId, setFilterTechId] = useState<string>('all');

  const loadData = useCallback(async () => {
    // Load all appointments from DB
    const data = await getAppointments();
    setAppointments(data);

    // Load technicians
    const { data: techs } = await supabase
      .from('ss_users')
      .select('*')
      .eq('role', 'technician')
      .eq('active', true)
      .order('name');
    setTechnicians((techs || []) as User[]);

    // Map appointments to calendar events
    const appointmentEvents: EventInput[] = data.map((apt) => {
      const techIndex = (techs || []).findIndex((t: User) => t.id === apt.technician_id);
      const color = technicianColors[techIndex % technicianColors.length] || '#3b82f6';
      return {
        id: apt.id,
        title: `${apt.customer?.first_name} ${apt.customer?.last_name} - ${apt.technician?.name}`,
        start: apt.start_time,
        end: apt.end_time,
        backgroundColor: statusColors[apt.status] || color,
        borderColor: statusColors[apt.status] || color,
        extendedProps: { type: 'appointment', technicianId: apt.technician_id },
      };
    });

    // Load Google Calendar events for connected technicians
    const googleEvents: EventInput[] = [];
    for (const tech of (techs || []) as User[]) {
      if (tech.calendar_connected && tech.google_calendar_id) {
        const accessToken = await getValidAccessToken(tech.id);
        if (accessToken) {
          try {
            const now = new Date();
            const calEvents = await getCalendarEvents(
              accessToken,
              tech.google_calendar_id,
              now.toISOString(),
              addDays(now, 30).toISOString(),
            );
            const techIndex = (techs || []).findIndex((t: User) => t.id === tech.id);
            const color = technicianColors[techIndex % technicianColors.length] || '#3b82f6';

            for (const ev of calEvents) {
              // Skip events that are already in our DB (avoid duplicates)
              const isDuplicate = data.some((a) => a.google_calendar_event_id === ev.id);
              if (isDuplicate) continue;

              googleEvents.push({
                id: `gcal-${ev.id}`,
                title: `📅 ${ev.summary} (${tech.name})`,
                start: ev.start.dateTime,
                end: ev.end.dateTime,
                backgroundColor: color + '40',
                borderColor: color,
                textColor: color,
                extendedProps: { type: 'google_event', technicianId: tech.id },
              });
            }
          } catch {
            // Silently skip failed calendar fetches
          }
        }
      }
    }

    setEvents([...appointmentEvents, ...googleEvents]);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEvents = filterTechId === 'all'
    ? events
    : events.filter((e) => e.extendedProps?.technicianId === filterTechId);

  const handleEventClick = (info: EventClickArg) => {
    const apt = appointments.find((a) => a.id === info.event.id);
    if (apt) setSelectedAppointment(apt);
  };

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!selectedAppointment) return;
    try {
      await updateAppointmentStatus(selectedAppointment.id, status);
      toast.success('Status updated');
      setSelectedAppointment(null);
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Unified Calendar</h1>
        <div className="flex items-center gap-2">
          <Select value={filterTechId} onValueChange={setFilterTechId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Technician Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Technicians</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-3">
            {technicians.map((tech, i) => (
              <div key={tech.id} className="flex items-center gap-1.5 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: technicianColors[i % technicianColors.length] }}
                />
                <span>{tech.name}</span>
                {tech.calendar_connected && (
                  <span className="text-xs text-green-600">●</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            events={filteredEvents}
            eventClick={handleEventClick}
            slotMinTime="09:00:00"
            slotMaxTime="17:00:00"
            allDaySlot={false}
            hiddenDays={[0, 6]}
            businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' }}
            timeZone={SYSTEM_TZ}
            height="auto"
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">
                    {selectedAppointment.customer?.first_name}{' '}
                    {selectedAppointment.customer?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <AppointmentStatusBadge status={selectedAppointment.status} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Technician</p>
                  <p className="font-medium">{selectedAppointment.technician?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedAppointment.appointment_type}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {formatEST(selectedAppointment.start_time, 'MMM d, h:mm a')} -{' '}
                    {formatEST(selectedAppointment.end_time, 'h:mm a')}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{selectedAppointment.address?.address_line}</p>
                </div>
                {selectedAppointment.google_calendar_event_id && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Google Calendar</p>
                    <p className="text-xs text-green-600">✓ Synced to technician's calendar</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Update Status</p>
                <Select onValueChange={(v) => handleStatusChange(v as AppointmentStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Change status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
