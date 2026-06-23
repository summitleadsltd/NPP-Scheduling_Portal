import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isOnline: boolean;
  needsUpdate: boolean;
  updateSW: (() => Promise<void>) | null;
  setDeferredPrompt: (e: BeforeInstallPromptEvent | null) => void;
  setIsOnline: (online: boolean) => void;
  setNeedsUpdate: (needs: boolean) => void;
  setUpdateSW: (fn: (() => Promise<void>) | null) => void;
  installApp: () => Promise<boolean>;
  dismissInstall: () => void;
}

const IOS_BANNER_KEY = 'summit-ios-install-dismissed';

export const usePWAStore = create<PWAState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  needsUpdate: false,
  updateSW: null,

  setDeferredPrompt: (e) => set({ deferredPrompt: e, isInstallable: !!e }),
  setIsOnline: (online) => set({ isOnline: online }),
  setNeedsUpdate: (needs) => set({ needsUpdate: needs }),
  setUpdateSW: (fn) => set({ updateSW: fn }),

  installApp: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    set({ deferredPrompt: null, isInstallable: false });
    return outcome === 'accepted';
  },

  dismissInstall: () => {
    localStorage.setItem(IOS_BANNER_KEY, 'true');
    set({ isInstallable: false });
  },
}));

export function isIOSBannerDismissed(): boolean {
  return localStorage.getItem(IOS_BANNER_KEY) === 'true';
}
