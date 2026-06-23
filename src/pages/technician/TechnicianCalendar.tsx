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
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventInput, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AppointmentStatusBadge } from '@/components/shared/AppointmentStatusBadge';
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
import { SYSTEM_TZ } from '@/lib/timezone';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Appointment, AppointmentType, AppointmentStatus, Customer, Address } from '@/types/database';

const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show: '#6b7280',
};

const appointmentTypes: AppointmentType[] = ['installation', 'repair', 'maintenance', 'inspection', 'consultation'];
const appointmentStatuses: AppointmentStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'];

export function TechnicianCalendar() {
  const { profile } = useAuthStore();
  const [events, setEvents] = useState<EventInput[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<(Customer & { addresses: Address[] })[]>([]);

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    customerId: '',
    addressId: '',
    appointmentType: 'maintenance' as AppointmentType,
    startTime: '',
    endTime: '',
    notes: '',
    // New customer fields
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
  });

  const [saving, setSaving] = useState(false);

  const loadAppointments = useCallback(async () => {
    if (!profile) return;
    const data = await getAppointments({ technician_id: profile.id });
    setAppointments(data);
    setEvents(
      data.map((apt) => ({
        id: apt.id,
        title: `${apt.customer?.first_name} ${apt.customer?.last_name} - ${apt.appointment_type}`,
        start: apt.start_time,
        end: apt.end_time,
        backgroundColor: statusColors[apt.status] || '#3b82f6',
        borderColor: statusColors[apt.status] || '#3b82f6',
      })),
    );
  }, [profile]);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch {
      // ignore if no customers permission
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    loadCustomers();
  }, [loadAppointments, loadCustomers]);

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
    });
    setSelectedAppointment(null);
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

      await createAppointment({
        customer_id: customerId,
        technician_id: profile.id,
        address_id: addressId,
        start_time: new Date(createForm.startTime).toISOString(),
        end_time: new Date(createForm.endTime).toISOString(),
        appointment_type: createForm.appointmentType,
        notes: createForm.notes || undefined,
        created_by: profile.id,
      });

      toast.success('Appointment created');
      setShowCreateDialog(false);
      resetCreateForm();
      await loadAppointments();
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
      });
      toast.success('Appointment updated');
      setShowEditDialog(false);
      await loadAppointments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (aptId: string) => {
    if (!confirm('Delete this appointment? This cannot be undone.')) return;
    try {
      await deleteAppointment(aptId);
      toast.success('Appointment deleted');
      setSelectedAppointment(null);
      await loadAppointments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleStatusChange = async (aptId: string, status: AppointmentStatus) => {
    try {
      await updateAppointmentStatus(aptId, status);
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      setSelectedAppointment(null);
      await loadAppointments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      customerId: '',
      addressId: '',
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

  // Track which appointment is being edited
  const [editAptId, setEditAptId] = useState<string | null>(null);

  const openEditWithId = (apt: Appointment) => {
    setEditAptId(apt.id);
    openEditDialog(apt);
  };

  const selectedCustomer = customers.find((c) => c.id === createForm.customerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Calendar</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

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
            events={events}
            eventClick={handleEventClick}
            selectable={true}
            select={handleDateSelect}
            slotMinTime="09:00:00"
            slotMaxTime="17:00:00"
            hiddenDays={[0, 6]}
            businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' }}
            allDaySlot={false}
            height="auto"
            expandRows={true}
            timeZone={SYSTEM_TZ}
          />
        </CardContent>
      </Card>

      {/* View Appointment Dialog */}
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
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedAppointment.customer?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedAppointment.customer?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedAppointment.appointment_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {formatEST(selectedAppointment.start_time, 'MMM d, h:mm a')} -{' '}
                    {formatEST(selectedAppointment.end_time, 'h:mm a')}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{selectedAppointment.address?.address_line}</p>
              </div>
              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {appointmentStatuses.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedAppointment.status === status ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(selectedAppointment.id, status)}
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
