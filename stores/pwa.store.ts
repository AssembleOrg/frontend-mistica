import { create } from 'zustand';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  /** El navegador ofrece el diálogo nativo de instalación (Chrome, Edge, Android). */
  canInstall: boolean;
  /** Ya corre como app instalada. */
  isStandalone: boolean;
  /** iPhone/iPad: no hay diálogo nativo, se instala desde Compartir. */
  isIOS: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  setDeferredPrompt: (e: BeforeInstallPromptEvent | null) => void;
  setEnv: (env: { isStandalone: boolean; isIOS: boolean }) => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  canInstall: false,
  isStandalone: false,
  isIOS: false,
  deferredPrompt: null,
  setDeferredPrompt: (e) => set({ deferredPrompt: e, canInstall: !!e }),
  setEnv: (env) => set(env),
  promptInstall: async () => {
    const e = get().deferredPrompt;
    if (!e) return 'unavailable';
    await e.prompt();
    const { outcome } = await e.userChoice;
    set({ deferredPrompt: null, canInstall: false });
    return outcome;
  },
}));
