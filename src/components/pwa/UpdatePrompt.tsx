import { usePWAStore } from '@/stores/pwaStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export function UpdatePrompt() {
  const { needsUpdate, updateSW, setNeedsUpdate } = usePWAStore();

  if (!needsUpdate || !updateSW) return null;

  return (
    <Card className="fixed top-4 left-4 right-4 z-[60] border-primary/20 shadow-lg md:left-auto md:right-4 md:w-80">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">New version available</p>
            <p className="text-xs text-muted-foreground mt-1">Refresh now to get the latest features.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1" onClick={() => updateSW()}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => setNeedsUpdate(false)}>
            Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
