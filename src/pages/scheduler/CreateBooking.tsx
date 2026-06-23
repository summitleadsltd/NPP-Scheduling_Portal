import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { geocodeAddress } from '@/services/geocodingService';
import { findBestSlots } from '@/services/schedulingEngine';
import { createCustomer, createAddress, searchCustomers } from '@/services/customerService';
import { createAppointment } from '@/services/appointmentService';
import { notifyNewAppointment } from '@/services/notificationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatEST } from '@/lib/timezone';
import { Star, MapPin, Clock, Search, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import type { SchedulingSlot, Customer, Address } from '@/types/database';
import { toast } from 'sonner';

const addressSchema = z.object({
  address: z.string().min(1, 'Required'),
  duration: z.number().min(15).max(480),
  appointment_type: z.string().min(1, 'Required'),
});

const customerSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  phone: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  notes: z.string().optional(),
});

type AddressForm = z.infer<typeof addressSchema>;
type CustomerForm = z.infer<typeof customerSchema>;

export function CreateBooking() {
  const { profile } = useAuthStore();
  const [step, setStep] = useState<'address' | 'slots' | 'customer' | 'confirmed'>('address');
  const [slots, setSlots] = useState<SchedulingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SchedulingSlot | null>(null);
  const [searching, setSearching] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<(Customer & { addresses: Address[] })[]>([]);
  const [geocodedAddress, setGeocodedAddress] = useState<{ lat: number; lng: number; display: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addressData, setAddressData] = useState<AddressForm | null>(null);

  const {
    register: registerAddress,
    handleSubmit: handleSubmitAddress,
    setValue: setAddressValue,
    formState: { errors: addressErrors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { duration: 60, appointment_type: 'installation' },
  });

  const {
    register: registerCustomer,
    handleSubmit: handleSubmitCustomer,
    setValue: setCustomerValue,
    getValues: getCustomerValues,
    formState: { errors: customerErrors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  });

  const handleAddressSubmit = async (data: AddressForm) => {
    setSearching(true);
    try {
      // Geocode address
      const geo = await geocodeAddress(data.address);
      if (!geo) {
        toast.error('Could not geocode address. Please check and try again.');
        return;
      }
      setGeocodedAddress({ lat: geo.latitude, lng: geo.longitude, display: geo.display_name });
      setAddressData(data);

      // Find best slots
      const bestSlots = await findBestSlots(geo.latitude, geo.longitude, data.duration);
      if (bestSlots.length === 0) {
        toast.error('No available slots found. Try adjusting the duration or check back later.');
        return;
      }
      setSlots(bestSlots);
      setStep('slots');
    } catch {
      toast.error('Failed to find available slots');
    } finally {
      setSearching(false);
    }
  };

  const handleCustomerSearch = async () => {
    if (customerSearch.length < 2) return;
    setSearching(true);
    try {
      const results = await searchCustomers(customerSearch);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const selectExistingCustomer = (customer: Customer & { addresses: Address[] }) => {
    setCustomerValue('first_name', customer.first_name);
    setCustomerValue('last_name', customer.last_name);
    setCustomerValue('phone', customer.phone);
    setCustomerValue('email', customer.email);
    setSearchResults([]);
    setCustomerSearch('');
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !profile || !geocodedAddress || !addressData) return;
    setSubmitting(true);

    try {
      const customerData = getCustomerValues();

      // Create or find customer
      const customer = await createCustomer({
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        phone: customerData.phone,
        email: customerData.email,
      });

      // Create address
      const addressParts = addressData.address.split(',').map((p) => p.trim());
      const address = await createAddress({
        customer_id: customer.id,
        address_line: addressParts[0] || addressData.address,
        city: addressParts[1] || '',
        state: addressParts[2]?.split(' ')[0] || '',
        zip_code: addressParts[2]?.split(' ')[1] || '',
        latitude: geocodedAddress.lat,
        longitude: geocodedAddress.lng,
      });

      // Create appointment
      const appointment = await createAppointment({
        customer_id: customer.id,
        technician_id: selectedSlot.technician_id,
        address_id: address.id,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        appointment_type: addressData.appointment_type,
        notes: customerData.notes || '',
        created_by: profile.id,
      });

      // Send notification
      await notifyNewAppointment(
        selectedSlot.technician_id,
        `${customerData.first_name} ${customerData.last_name}`,
        formatEST(selectedSlot.start_time, 'MMM d, h:mm a'),
        appointment.id,
      );

      toast.success('Appointment booked successfully!');
      setStep('confirmed');
    } catch {
      toast.error('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('address');
    setSlots([]);
    setSelectedSlot(null);
    setGeocodedAddress(null);
    setAddressData(null);
  };

  if (step === 'confirmed') {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
        <p className="text-muted-foreground">
          Appointment has been scheduled with {selectedSlot?.technician_name} on{' '}
          {selectedSlot && formatEST(selectedSlot.start_time, 'EEEE, MMM d, yyyy at h:mm a')}
        </p>
        <Button onClick={resetForm}>Create Another Booking</Button>
      </div>
    );
  }

  if (step === 'address') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Create Booking</h1>
        <p className="text-muted-foreground">Enter the service address first to find available appointment slots.</p>

        <form onSubmit={handleSubmitAddress(handleAddressSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Address & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Service Address</Label>
                <Input
                  {...registerAddress('address')}
                  placeholder="123 Main St, City, State ZIP"
                />
                {addressErrors.address && <p className="text-xs text-destructive">{addressErrors.address.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Appointment Type</Label>
                  <Select onValueChange={(v: unknown) => setAddressValue('appointment_type', v as string)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="installation">Installation</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                  {addressErrors.appointment_type && <p className="text-xs text-destructive">{addressErrors.appointment_type.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    {...registerAddress('duration', { valueAsNumber: true })}
                  />
                  {addressErrors.duration && <p className="text-xs text-destructive">{addressErrors.duration.message}</p>}
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={searching}>
                {searching ? 'Finding Available Slots...' : 'Find Available Slots'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    );
  }

  if (step === 'slots') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Select Appointment Slot</h1>
          <Button variant="outline" onClick={() => setStep('address')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {geocodedAddress && (
          <Card>
            <CardContent className="p-4 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{geocodedAddress.display}</span>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map((slot, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedSlot === slot ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedSlot(slot)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">
                    {formatEST(slot.start_time, 'EEE, MMM d')}
                  </p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < slot.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-lg font-bold text-primary">
                  {formatEST(slot.start_time, 'h:mm a')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{slot.technician_name}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(slot.travel_time_before)}min travel
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {slot.distance_before.toFixed(1)}km
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedSlot && (
          <div className="flex justify-end">
            <Button size="lg" onClick={() => setStep('customer')}>
              Continue to Customer Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'customer') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Customer Information</h1>
          <Button variant="outline" onClick={() => setStep('slots')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Slots
          </Button>
        </div>

        {/* Selected Slot Summary */}
        {selectedSlot && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedSlot.technician_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatEST(selectedSlot.start_time, 'EEE, MMM d, h:mm a')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('slots')}>
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Existing Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, email, or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomerSearch()}
              />
              <Button variant="outline" onClick={handleCustomerSearch} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 border rounded-md divide-y">
                {searchResults.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => selectExistingCustomer(c)}
                  >
                    <p className="font-medium text-sm">
                      {c.first_name} {c.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.email} | {c.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmitCustomer(confirmBooking)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input {...registerCustomer('first_name')} />
                  {customerErrors.first_name && <p className="text-xs text-destructive">{customerErrors.first_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input {...registerCustomer('last_name')} />
                  {customerErrors.last_name && <p className="text-xs text-destructive">{customerErrors.last_name.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input {...registerCustomer('phone')} />
                  {customerErrors.phone && <p className="text-xs text-destructive">{customerErrors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" {...registerCustomer('email')} />
                  {customerErrors.email && <p className="text-xs text-destructive">{customerErrors.email.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea {...registerCustomer('notes')} placeholder="Any special instructions..." />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    );
  }

  return null;
}
