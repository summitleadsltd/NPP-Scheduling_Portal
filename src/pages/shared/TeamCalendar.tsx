import { useEffect, useState, useCallback } from 'react';
import './TeamCalendar.css';
import { getAppointments, updateAppointment, deleteAppointment, updateAppointmentStatus } from '@/services/appointmentService';
import { getUsers } from '@/services/userService';
import { getAvailabilityBlocks } from '@/services/availabilityService';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventInput, EventClickArg } from '@fullcalendar/core';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppointmentStatusBadge } from '@/components/shared/AppointmentStatusBadge';
import { formatEST } from '@/lib/timezone';
import type { Appointment, User, AvailabilityBlock, AppointmentStatus, AppointmentType } from '@/types/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMediaQuery } from '../../hooks/use-media-query';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

// Technician color palette - unique colors for each technician
const technicianColors: Record<string, string> = {
  default: '#3b82f6',
  tech1: '#8b5cf6',
  tech2: '#ec4899',
  tech3: '#f59e0b',
  tech4: '#10b981',
  tech5: '#6366f1',
  tech6: '#ef4444',
  tech7: '#14b8a6',
  tech8: '#f97316',
  tech9: '#84cc16',
  tech10: '#06b6d4',
};

// Get a consistent color for a technician based on their index
function getTechnicianColor(technicianIndex: number): string {
  const colorKeys = Object.keys(technicianColors).filter(k => k !== 'default');
  return technicianColors[colorKeys[technicianIndex % colorKeys.length]] || technicianColors.default;
}

export function TeamCalendar() {
  const { profile } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [events, setEvents] = useState<EventInput[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [technicianColorMap, setTechnicianColorMap] = useState<Record<string, string>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    appointment_type: '' as AppointmentType,
    start_time: '',
    end_time: '',
    notes: '',
    status: '' as AppointmentStatus,
    technician_id: '',
  });

  const loadTechnicians = useCallback(async () => {
    const data = await getUsers();
    const techs = data.filter(u => u.role === 'technician' && u.active);
    setTechnicians(techs);
    
    // Create color map for technicians
    const colorMap: Record<string, string> = {};
    techs.forEach((tech, index) => {
      colorMap[tech.id] = getTechnicianColor(index);
    });
    setTechnicianColorMap(colorMap);
  }, []);

  const loadAppointments = useCallback(async () => {
    const data = await getAppointments();
    setAppointments(data);
  }, []);

  const loadAvailabilityBlocks = useCallback(async () => {
    const data = await getAvailabilityBlocks();
    setAvailabilityBlocks(data);
  }, []);

  useEffect(() => {
    loadTechnicians();
    loadAppointments();

    // Set up Realtime subscriptions
    const appointmentsSubscription = supabase
      .channel('appointments-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ss_appointments',
        },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    const availabilitySubscription = supabase
      .channel('availability-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ss_availability_blocks',
        },
        () => {
          loadAvailabilityBlocks();
        }
      )
      .subscribe();

    return () => {
      appointmentsSubscription.unsubscribe();
      availabilitySubscription.unsubscribe();
    };
    loadAvailabilityBlocks();
  }, [loadTechnicians, loadAppointments, loadAvailabilityBlocks]);

  useEffect(() => {
    let filteredAppointments = appointments;
    let filteredAvailability = availabilityBlocks;
    
    if (selectedTechnician !== 'all') {
      filteredAppointments = appointments.filter(apt => apt.technician_id === selectedTechnician);
      filteredAvailability = availabilityBlocks.filter(block => block.technician_id === selectedTechnician);
    }

    const appointmentEvents = filteredAppointments.map((apt) => ({
      id: apt.id,
      title: `${apt.customer?.first_name} ${apt.customer?.last_name} - ${apt.technician?.name}`,
      start: apt.start_time,
      end: apt.end_time,
      backgroundColor: technicianColorMap[apt.technician_id] || technicianColors.default,
      borderColor: technicianColorMap[apt.technician_id] || technicianColors.default,
    }));

    const availabilityEvents = filteredAvailability.map((block) => {
      const tech = technicians.find(t => t.id === block.technician_id);
      return {
        id: `availability-${block.id}`,
        title: `Unavailable - ${tech?.name || 'Unknown'}`,
        start: block.start_time,
        end: block.end_time,
        backgroundColor: '#ef4444',
        borderColor: '#ef4444',
        editable: false,
      };
    });

    setEvents([...appointmentEvents, ...availabilityEvents]);
  }, [appointments, availabilityBlocks, selectedTechnician, technicianColorMap, technicians]);

  const handleEventClick = (info: EventClickArg) => {
    const apt = appointments.find((a) => a.id === info.event.id);
    if (apt) setSelectedAppointment(apt);
  };

  const handleEdit = (apt: Appointment) => {
    setEditForm({
      appointment_type: apt.appointment_type,
      start_time: apt.start_time,
      end_time: apt.end_time,
      notes: apt.notes || '',
      status: apt.status,
      technician_id: apt.technician_id,
    });
    setSelectedAppointment(apt);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAppointment || !profile) return;
    try {
      await updateAppointment(selectedAppointment.id, editForm);
      toast.success('Appointment updated');
      setShowEditDialog(false);
      setSelectedAppointment(null);
      loadAppointments();
    } catch {
      toast.error('Failed to update appointment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await deleteAppointment(id);
      toast.success('Appointment deleted');
      setSelectedAppointment(null);
      loadAppointments();
    } catch {
      toast.error('Failed to delete appointment');
    }
  };

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!selectedAppointment) return;
    try {
      await updateAppointmentStatus(selectedAppointment.id, status);
      toast.success('Status updated');
      setSelectedAppointment(null);
      loadAppointments();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Calendar</h1>
        <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Technicians" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="technician-color-dot"
                    style={{ '--tech-color': technicianColorMap[tech.id] } as React.CSSProperties}
                  />
                  {tech.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Technician Color Legend */}
      {selectedTechnician === 'all' && (
        <div className="flex flex-wrap gap-2">
          {technicians.map((tech) => (
            <Badge key={tech.id} variant="outline" className="gap-2">
              <div 
                className="technician-color-dot"
                style={{ '--tech-color': technicianColorMap[tech.id] } as React.CSSProperties}
              />
              {tech.name}
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardContent className={isMobile ? "p-2" : "p-4"}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: isMobile ? 'listWeek,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            events={events}
            eventClick={handleEventClick}
            slotMinTime="09:00:00"
            slotMaxTime="17:00:00"
            allDaySlot={false}
            hiddenDays={[0, 6]}
            businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' }}
            height="auto"
            slotLabelInterval={isMobile ? { hours: 2 } : { hours: 1 }}
            eventMinHeight={isMobile ? 30 : 20}
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
                  <p className="text-sm text-muted-foreground">
                    {selectedAppointment.address?.city}, {selectedAppointment.address?.state} {selectedAppointment.address?.zip_code}
                  </p>
                </div>
                {selectedAppointment.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => handleEdit(selectedAppointment)} variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={() => handleDelete(selectedAppointment.id)} variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Update Status</p>
                <Select onValueChange={(v) => handleStatusChange(v as AppointmentStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Change status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
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

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Technician</Label>
                <Select value={editForm.technician_id} onValueChange={(v) => setEditForm({...editForm, technician_id: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="datetime-local" value={editForm.start_time.slice(0, 16)} onChange={(e) => setEditForm({...editForm, start_time: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="datetime-local" value={editForm.end_time.slice(0, 16)} onChange={(e) => setEditForm({...editForm, end_time: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={editForm.notes} onChange={(e) => setEditForm({...editForm, notes: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button onClick={() => setShowEditDialog(false)} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
