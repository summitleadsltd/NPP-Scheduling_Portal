import { useEffect, useState } from 'react';
import { getUsers } from '@/services/userService';
import { getAppointments, getTodayAppointments, getWeekAppointments } from '@/services/appointmentService';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, TrendingUp, BarChart3, Shield, UserPlus } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { toEST } from '@/lib/timezone';
import type { Appointment, User } from '@/types/database';

export function AdminDashboard() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [weekAppts, setWeekAppts] = useState<Appointment[]>([]);
  const [monthAppts, setMonthAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const now = toEST(new Date());
        const [users, today, week, month] = await Promise.all([
          getUsers(),
          getTodayAppointments(),
          getWeekAppointments(),
          getAppointments({
            start_date: startOfMonth(now).toISOString(),
            end_date: endOfMonth(now).toISOString(),
          }),
        ]);
        setAllUsers(users);
        setTodayAppts(today);
        setWeekAppts(week);
        setMonthAppts(month);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const admins = allUsers.filter((u) => u.role === 'admin');
  const managers = allUsers.filter((u) => u.role === 'manager');
  const schedulers = allUsers.filter((u) => u.role === 'scheduler');
  const technicians = allUsers.filter((u) => u.role === 'technician');
  const completedMonth = monthAppts.filter((a) => a.status === 'completed').length;
  const completionRate = monthAppts.length > 0 ? Math.round((completedMonth / monthAppts.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={allUsers.length} icon={Users} />
        <StatCard title="Today's Appointments" value={todayAppts.length} icon={Calendar} />
        <StatCard title="This Week" value={weekAppts.length} icon={TrendingUp} />
        <StatCard title="Completion Rate" value={`${completionRate}%`} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-sm">Admins</span>
                </div>
                <span className="font-medium">{admins.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="font-medium text-sm">Managers</span>
                </div>
                <span className="font-medium">{managers.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-sm">Schedulers</span>
                </div>
                <span className="font-medium">{schedulers.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-orange-500" />
                  <span className="font-medium text-sm">Technicians</span>
                </div>
                <span className="font-medium">{technicians.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {weekAppts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {weekAppts.slice(0, 8).map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">
                        {apt.customer?.first_name} {apt.customer?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {apt.technician?.name}
                      </p>
                    </div>
                    <span className="text-xs capitalize px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {apt.status}
                    </span>
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
