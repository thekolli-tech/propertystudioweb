'use client';

import * as React from 'react';

export type BroadcastModeContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const BroadcastModeContext = React.createContext<BroadcastModeContextValue | null>(null);

export type BroadcastModeProviderProps = {
  children: React.ReactNode;
  defaultEnabled?: boolean;
};

/**
 * Foundation for future Broadcast Studio / large-display mode.
 * Toggles CSS variables via `data-broadcast-mode` — no studio UI yet.
 */
export function BroadcastModeProvider({
  children,
  defaultEnabled = false,
}: BroadcastModeProviderProps) {
  const [enabled, setEnabled] = React.useState(defaultEnabled);

  React.useEffect(() => {
    document.documentElement.dataset.broadcastMode = enabled ? 'true' : 'false';
  }, [enabled]);

  const value = React.useMemo(() => ({ enabled, setEnabled }), [enabled]);

  return <BroadcastModeContext.Provider value={value}>{children}</BroadcastModeContext.Provider>;
}

export function useBroadcastMode(): BroadcastModeContextValue {
  const context = React.useContext(BroadcastModeContext);
  if (!context) {
    return {
      enabled: false,
      setEnabled: () => {
        /* no-op outside provider */
      },
    };
  }
  return context;
}
