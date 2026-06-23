import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
} from '@/services/appointmentService';
import { getCustomers, createCustomer, createAddress } from '@/services/customerService';
import { getAllAvailabilityBlocks, getTechnicians } from '@/services/technicianService';
import { supabase } from '@/lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventInput, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AppointmentStatusBadge } from '@/components/shared/AppointmentStatusBadge';
import { ActivityTimeline } from '@/components/shared/ActivityTimeline';
import { CallRecordings } from '@/components/shared/CallRecordings';
import { StartRouteButton } from '@/components/shared/StartRouteButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatEST } from '@/lib/timezone';
import { addDays } from 'date-fns';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Appointment, AppointmentType, AppointmentStatus, Customer, Address, User } from '@/types/database';

const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  confirmed: '#8b5cf6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show: '#6b7280',
};

const technicianColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
];

const appointmentTypes: AppointmentType[] = ['installation', 'repair', 'maintenance', 'inspection', 'consultation'];
const appointmentStatuses: AppointmentStatus[] = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

export function ManagerCalendar() {
  const { profile } = useAuthStore();
  const [events, setEvents] = useState<EventInput[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<(Customer & { addresses: Address[] })[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [filterTechId, setFilterTechId] = useState<string>('all');
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editAptId, setEditAptId] = useState<string | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    customerId: '',
    addressId: '',
    technicianId: '',
    appointmentType: 'maintenance' as AppointmentType,
    startTime: '',
    endTime: '',
    notes: '',
    newCustomer: false,
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    addressLine: '',
    city: '',
    state: 'MD',
    zipCode: '',
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    appointmentType: '' as string,
    startTime: '',
    endTime: '',
    notes: '',
    status: '' as string,
    technicianId: '' as string,
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadData = useCallback(async () => {
    // Load all appointments from DB
    const data = await getAppointments();
    setAppointments(data);

    // Load technicians
    const techs = await getTechnicians();
    setTechnicians(techs);

    // Load all availability blocks
    const now = new Date();
    const availabilityBlocks = await getAllAvailabilityBlocks(
      now.toISOString(),
      addDays(now, 30).toISOString()
    );

    // Filter appointments by selected technicians
    const filteredAppointments = selectedTechnicians.length === 0
      ? data
      : data.filter((apt) => selectedTechnicians.includes(apt.technician_id));

    // Map appointments to calendar events
    const appointmentEvents: EventInput[] = filteredAppointments.map((apt) => {
      const techIndex = techs.findIndex((t: User) => t.id === apt.technician_id);
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

    // Filter availability blocks by selected technicians
    const filteredAvailabilityBlocks = selectedTechnicians.length === 0
      ? availabilityBlocks
      : availabilityBlocks.filter((block) => selectedTechnicians.includes(block.technician_id));

    // Map availability blocks to calendar events
    const availabilityEvents: EventInput[] = filteredAvailabilityBlocks.map((block) => {
      return {
        id: `avail-${block.id}`,
        title: 'Unavailable',
        start: block.start_time,
        end: block.end_time,
        display: 'background',
        color: '#ef4444',
        extendedProps: { type: 'availability', technicianId: block.technician_id, technicianName: block.technician?.name, reason: block.reason },
      };
    });

    setEvents([...appointmentEvents, ...availabilityEvents]);
  }, [selectedTechnicians]);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch {
      // ignore if no customers permission
    }
  }, []);

  useEffect(() => {
    loadData();
    loadCustomers();
  }, [loadData, loadCustomers]);

  // Set up realtime subscription for availability blocks
  useEffect(() => {
    const subscription = supabase
      .channel('manager-availability-blocks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ss_availability_blocks',
        },
        () => {
          // Reload data when availability blocks change
          loadData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadData]);

  // Set up realtime subscription for appointments
  useEffect(() => {
    const subscription = supabase
      .channel('manager-appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ss_appointments',
        },
        () => {
          // Reload data when appointments change
          loadData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadData]);

  const filteredEvents = filterTechId === 'all'
    ? events
    : events.filter((e) => e.extendedProps?.technicianId === filterTechId);

  const handleEventClick = (info: EventClickArg) => {
    const apt = appointments.find((a) => a.id === info.event.id);
    if (apt) setSelectedAppointment(apt);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const start = selectInfo.start;
    const end = selectInfo.end;
    setCreateForm((prev) => ({
      ...prev,
      startTime: toLocalDatetimeString(start),
      endTime: toLocalDatetimeString(end),
    }));
    setShowCreateDialog(true);
  };

  const openEditDialog = (apt: Appointment) => {
    setEditForm({
      appointmentType: apt.appointment_type,
      startTime: toLocalDatetimeString(new Date(apt.start_time)),
      endTime: toLocalDatetimeString(new Date(apt.end_time)),
      notes: apt.notes || '',
      status: apt.status,
      technicianId: apt.technician_id,
    });
    setSelectedAppointment(apt);
    setShowEditDialog(true);
  };

  const handleCreate = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      let customerId = createForm.customerId;
      let addressId = createForm.addressId;

      if (createForm.newCustomer) {
        const customer = await createCustomer({
          first_name: createForm.firstName,
          last_name: createForm.lastName,
          phone: createForm.phone,
          email: createForm.email,
        });
        customerId = customer.id;

        const address = await createAddress({
          customer_id: customer.id,
          address_line: createForm.addressLine,
          city: createForm.city,
          state: createForm.state,
          zip_code: createForm.zipCode,
        });
        addressId = address.id;
      }

      if (!customerId || !addressId) {
        toast.error('Please select a customer and address');
        setSaving(false);
        return;
      }

      // Default to first technician if none selected
      const technicianId = technicians.length > 0 ? technicians[0].id : profile.id;

      await createAppointment({
        customer_id: customerId,
        technician_id: technicianId,
        address_id: addressId,
        start_time: new Date(createForm.startTime).toISOString(),
        end_time: new Date(createForm.endTime).toISOString(),
        appointment_type: createForm.appointmentType,
        notes: createForm.notes || undefined,
        created_by: profile.id,
      }, { id: profile.id, name: profile.name });

      toast.success('Appointment created');
      setShowCreateDialog(false);
      resetCreateForm();
      await loadData();
      await loadCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editAptId) return;
    setSaving(true);
    try {
      await updateAppointment(editAptId!, {
        appointment_type: editForm.appointmentType,
        start_time: new Date(editForm.startTime).toISOString(),
        end_time: new Date(editForm.endTime).toISOString(),
        notes: editForm.notes,
        status: editForm.status as AppointmentStatus,
        technician_id: editForm.technicianId,
      }, { id: profile.id, name: profile.name });
      toast.success('Appointment updated');
      setShowEditDialog(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (aptId: string) => {
    if (!confirm('Delete this appointment? This cannot be undone.')) return;
    try {
      await deleteAppointment(aptId, { id: profile.id, name: profile.name });
      toast.success('Appointment deleted');
      setSelectedAppointment(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!selectedAppointment || !profile) return;
    try {
      await updateAppointmentStatus(selectedAppointment.id, status, { id: profile.id, name: profile.name });
      toast.success('Status updated');
      setSelectedAppointment(null);
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      customerId: '',
      addressId: '',
      technicianId: '',
      appointmentType: 'maintenance',
      startTime: '',
      endTime: '',
      notes: '',
      newCustomer: false,
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      addressLine: '',
      city: '',
      state: 'MD',
      zipCode: '',
    });
  };

  const openEditWithId = (apt: Appointment) => {
    setEditAptId(apt.id);
    openEditDialog(apt);
  };

  const selectedCustomer = customers.find((c) => c.id === createForm.customerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
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
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Technician Filter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Filter by Technicians</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTechnicians([])}
              className="px-3 py-1 text-sm bg-secondary rounded hover:bg-secondary/80"
            >
              Show All
            </button>
            {technicians.map((tech, i) => {
              const isSelected = selectedTechnicians.includes(tech.id);
              const color = technicianColors[i % technicianColors.length];
              return (
                <button
                  key={tech.id}
                  onClick={() => {
                    setSelectedTechnicians((prev) => {
                      if (prev.includes(tech.id)) {
                        return prev.filter((id) => id !== tech.id);
                      }
                      return [...prev, tech.id];
                    });
                  }}
                  className={`px-3 py-1 text-sm rounded border-2 transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent bg-secondary hover:bg-secondary/80'
                  }`}
                  style={{ '--tech-color': color } as React.CSSProperties}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--tech-color)' } as React.CSSProperties} />
                  {tech.name}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: isMobile ? 'listWeek,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            events={filteredEvents}
            eventClick={handleEventClick}
            selectable={true}
            select={handleDateSelect}
            slotMinTime="09:00:00"
            slotMaxTime="19:00:00"
            allDaySlot={false}
            hiddenDays={[0, 6]}
            businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '19:00' }}
            height="auto"
            eventMinHeight={isMobile ? 60 : 30}
            dayHeaderFormat={isMobile ? { weekday: 'short' } : { weekday: 'short', month: 'numeric', day: 'numeric' }}
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              </div>

              <ActivityTimeline appointmentId={selectedAppointment.id} />

              <CallRecordings appointmentId={selectedAppointment.id} />

              <StartRouteButton appointment={selectedAppointment} className="w-full" />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {appointmentStatuses.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedAppointment.status === status ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(status)}
                      className="capitalize"
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => openEditWithId(selectedAppointment)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedAppointment.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Appointment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant={createForm.newCustomer ? 'outline' : 'default'}
                size="sm"
                onClick={() => setCreateForm((p) => ({ ...p, newCustomer: false }))}
              >
                Existing Customer
              </Button>
              <Button
                variant={createForm.newCustomer ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCreateForm((p) => ({ ...p, newCustomer: true }))}
              >
                New Customer
              </Button>
            </div>

            {createForm.newCustomer ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First Name</Label>
                    <Input value={createForm.firstName} onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={createForm.lastName} onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone</Label>
                    <Input value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={createForm.addressLine} onChange={(e) => setCreateForm((p) => ({ ...p, addressLine: e.target.value }))} placeholder="123 Main St" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input value={createForm.city} onChange={(e) => setCreateForm((p) => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={createForm.state} onChange={(e) => setCreateForm((p) => ({ ...p, state: e.target.value }))} />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input value={createForm.zipCode} onChange={(e) => setCreateForm((p) => ({ ...p, zipCode: e.target.value }))} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Customer</Label>
                  <Select value={createForm.customerId} onValueChange={(v) => setCreateForm((p) => ({ ...p, customerId: v, addressId: '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCustomer && selectedCustomer.addresses.length > 0 && (
                  <div>
                    <Label>Address</Label>
                    <Select value={createForm.addressId} onValueChange={(v) => setCreateForm((p) => ({ ...p, addressId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select address" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCustomer.addresses.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.address_line}, {a.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Technician</Label>
              <Select value={createForm.technicianId} onValueChange={(v) => setCreateForm((p) => ({ ...p, technicianId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Appointment Type</Label>
              <Select value={createForm.appointmentType} onValueChange={(v) => setCreateForm((p) => ({ ...p, appointmentType: v as AppointmentType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="datetime-local" value={createForm.startTime} onChange={(e) => setCreateForm((p) => ({ ...p, startTime: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="datetime-local" value={createForm.endTime} onChange={(e) => setCreateForm((p) => ({ ...p, endTime: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create Appointment'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Technician (Reassign)</Label>
              <Select value={editForm.technicianId} onValueChange={(v) => setEditForm((p) => ({ ...p, technicianId: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Appointment Type</Label>
              <Select value={editForm.appointmentType} onValueChange={(v) => setEditForm((p) => ({ ...p, appointmentType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentStatuses.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="datetime-local" value={editForm.startTime} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="datetime-local" value={editForm.endTime} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function toLocalDatetimeString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}
