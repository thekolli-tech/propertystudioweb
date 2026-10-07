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
  /** When true, broadcast mode stays on and cannot be toggled off. */
  forceEnabled?: boolean;
};

/**
 * Broadcast Studio / large-display mode.
 * Toggles existing CSS variables via `data-broadcast-mode` — not a second theme system.
 */
export function BroadcastModeProvider({
  children,
  defaultEnabled = false,
  forceEnabled = false,
}: BroadcastModeProviderProps) {
  const [enabled, setEnabledState] = React.useState(forceEnabled || defaultEnabled);

  React.useEffect(() => {
    if (forceEnabled) {
      setEnabledState(true);
    }
  }, [forceEnabled]);

  React.useEffect(() => {
    document.documentElement.dataset.broadcastMode = enabled ? 'true' : 'false';
    return () => {
      document.documentElement.dataset.broadcastMode = 'false';
    };
  }, [enabled]);

  const setEnabled = React.useCallback(
    (next: boolean) => {
      if (forceEnabled) return;
      setEnabledState(next);
    },
    [forceEnabled],
  );

  const value = React.useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);

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
