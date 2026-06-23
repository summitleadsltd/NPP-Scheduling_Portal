import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { NotificationOnboarding } from '@/components/pwa/NotificationOnboarding';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineBanner />
      <UpdatePrompt />
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-4 pb-24 lg:p-6 lg:pb-6">
          <NotificationOnboarding />
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <InstallPrompt />
    </div>
  );
}
