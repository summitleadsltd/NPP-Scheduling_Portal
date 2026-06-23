import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/stores/authStore';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { usePWAStore } from '@/stores/pwaStore';
import { SplashScreen } from '@/components/pwa/SplashScreen';
import { onForegroundMessage } from '@/lib/firebase';
import { toast } from 'sonner';

// Auth
import { LoginPage } from '@/pages/auth/LoginPage';

// Shared
import { TeamCalendar } from '@/pages/shared/TeamCalendar';

// Technician
import { TechnicianDashboard } from '@/pages/technician/TechnicianDashboard';
import { TechnicianCalendar } from '@/pages/technician/TechnicianCalendar';
import { TechnicianRouteMap } from '@/pages/technician/TechnicianRouteMap';
import { TechnicianAvailability } from '@/pages/technician/TechnicianAvailability';

// Scheduler
import { SchedulerDashboard } from '@/pages/scheduler/SchedulerDashboard';
import { CreateBooking } from '@/pages/scheduler/CreateBooking';
import { SchedulerCalendar } from '@/pages/scheduler/SchedulerCalendar';
import { CustomersPage } from '@/pages/scheduler/CustomersPage';

// Manager
import { ManagerDashboard } from '@/pages/manager/ManagerDashboard';
import { DispatchBoard } from '@/pages/manager/DispatchBoard';
import { ManagerCalendar } from '@/pages/manager/ManagerCalendar';
import { TechnicianManagement } from '@/pages/manager/TechnicianManagement';
import { SchedulerManagement } from '@/pages/manager/SchedulerManagement';
import { ReportsPage } from '@/pages/manager/ReportsPage';
import { SettingsPage } from '@/pages/manager/SettingsPage';

// Admin
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { UserManagement } from '@/pages/admin/UserManagement';

// Shared
import { NotificationCenter } from '@/pages/shared/NotificationCenter';
import { AccountSettings } from '@/pages/shared/AccountSettings';

// Legal
import { PrivacyPolicy } from '@/pages/legal/PrivacyPolicy';
import { TermsOfService } from '@/pages/legal/TermsOfService';

function AppRoutes() {
  const { profile } = useAuthStore();

  const defaultRoute = profile
    ? profile.role === 'admin'
      ? '/admin/dashboard'
      : profile.role === 'manager'
        ? '/manager/dashboard'
        : profile.role === 'scheduler'
          ? '/scheduler/dashboard'
          : '/technician/dashboard'
    : '/login';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* Shared Team Calendar - accessible to all authenticated users */}
      <Route
        element={
          <AuthGuard allowedRoles={['admin', 'manager', 'scheduler', 'technician']}>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route path="/calendar" element={<TeamCalendar />} />
      </Route>

      {/* Technician Portal */}
      <Route
        element={
          <AuthGuard allowedRoles={['technician']}>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
        <Route path="/technician/calendar" element={<TechnicianCalendar />} />
        <Route path="/technician/route" element={<TechnicianRouteMap />} />
        <Route path="/technician/availability" element={<TechnicianAvailability />} />
        <Route path="/technician/notifications" element={<NotificationCenter />} />
        <Route path="/technician/account" element={<AccountSettings />} />
      </Route>

      {/* Scheduler Role Portal */}
      <Route
        element={
          <AuthGuard allowedRoles={['scheduler']}>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route path="/scheduler/dashboard" element={<SchedulerDashboard />} />
        <Route path="/scheduler/booking" element={<CreateBooking />} />
        <Route path="/scheduler/calendar" element={<SchedulerCalendar />} />
        <Route path="/scheduler/customers" element={<CustomersPage />} />
        <Route path="/scheduler/notifications" element={<NotificationCenter />} />
        <Route path="/scheduler/account" element={<AccountSettings />} />
      </Route>

      {/* Manager Portal */}
      <Route
        element={
          <AuthGuard allowedRoles={['manager']}>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/booking" element={<CreateBooking />} />
        <Route path="/manager/dispatch" element={<DispatchBoard />} />
        <Route path="/manager/calendar" element={<ManagerCalendar />} />
        <Route path="/manager/technicians" element={<TechnicianManagement />} />
        <Route path="/manager/schedulers" element={<SchedulerManagement />} />
        <Route path="/manager/customers" element={<CustomersPage />} />
        <Route path="/manager/reports" element={<ReportsPage />} />
        <Route path="/manager/settings" element={<SettingsPage />} />
        <Route path="/manager/notifications" element={<NotificationCenter />} />
        <Route path="/manager/account" element={<AccountSettings />} />
      </Route>

      {/* Admin Portal */}
      <Route
        element={
          <AuthGuard allowedRoles={['admin']}>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/booking" element={<CreateBooking />} />
        <Route path="/admin/dispatch" element={<DispatchBoard />} />
        <Route path="/admin/calendar" element={<ManagerCalendar />} />
        <Route path="/admin/customers" element={<CustomersPage />} />
        <Route path="/admin/reports" element={<ReportsPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/admin/notifications" element={<NotificationCenter />} />
        <Route path="/admin/account" element={<AccountSettings />} />
      </Route>

      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

export default function App() {
  const { initialize, initialized } = useAuthStore();
  const { setDeferredPrompt, setIsOnline, setNeedsUpdate, setUpdateSW } = usePWAStore();

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setNeedsUpdate(true);
    },
    onOfflineReady() {
      toast.info('App ready for offline use');
    },
  });

  useEffect(() => {
    setUpdateSW(() => updateServiceWorker(true));
  }, [updateServiceWorker, setUpdateSW]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [setDeferredPrompt]);

  useEffect(() => {
    onForegroundMessage((payload) => {
      toast(payload.title ?? 'Notification', {
        description: payload.body,
      });
    });
  }, []);

  if (!initialized) {
    return <SplashScreen />;
  }

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster />
    </BrowserRouter>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
