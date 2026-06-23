import { usePWAStore, isIOSBannerDismissed } from '@/stores/pwaStore';
import { isIOS, isPWAInstalled, isFirefox } from '@/lib/device';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Share, X, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export function InstallPrompt() {
  const { isInstallable, installApp, dismissInstall } = usePWAStore();
  const [iosDismissed, setIosDismissed] = useState(isIOSBannerDismissed());

  if (isPWAInstalled()) return null;

  if (isIOS() && !iosDismissed) {
    const isFirefoxOnIOS = isFirefox();
    return (
      <Card className="fixed bottom-20 left-4 right-4 z-50 border-primary/20 shadow-lg md:left-auto md:right-4 md:w-80">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Share className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Install NPP</p>
              {isFirefoxOnIOS ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Open in Safari to install. Tap <ExternalLink className="h-3 w-3 inline" /> then "Add to Home Screen"
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Tap Share <Share className="h-3 w-3 inline" /> then "Add to Home Screen"
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => {
                dismissInstall();
                setIosDismissed(true);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isInstallable) return null;

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 border-primary/20 shadow-lg md:left-auto md:right-4 md:w-80">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Install NPP</p>
            <p className="text-xs text-muted-foreground mt-1">Add to your home screen for quick access</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1" onClick={installApp}>
            Install
          </Button>
          <Button size="sm" variant="outline" onClick={dismissInstall}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
