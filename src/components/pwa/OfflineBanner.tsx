import { usePWAStore } from '@/stores/pwaStore';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline } = usePWAStore();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[70] bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      You are offline. Reconnect to continue syncing appointments.
    </div>
  );
}
