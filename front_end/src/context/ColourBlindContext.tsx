import React, { createContext, useContext, useState, useEffect } from 'react';

export type ColourBlindMode = 'normal' | 'deuteranopia' | 'protanopia' | 'tritanopia';

interface ColourBlindContextType {
  mode: ColourBlindMode;
  setMode: (mode: ColourBlindMode) => void;
}

const ColourBlindContext = createContext<ColourBlindContextType>({
  mode: 'normal',
  setMode: () => {},
});

const STORAGE_KEY = 'tradeup_colour_blind_mode';

const TINTS: Record<string, string> = {
  deuteranopia: 'rgba(230, 159, 0, 0.10)',   // amber — shifts red-green range
  protanopia:   'rgba(213, 94, 0, 0.10)',    // vermilion — reduced-red compensation
  tritanopia:   'rgba(204, 121, 167, 0.10)', // reddish-purple — shifts blue-yellow range
};

export function ColourBlindProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColourBlindMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as ColourBlindMode) || 'normal';
  });

  const setMode = (newMode: ColourBlindMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  useEffect(() => {
    const html = document.documentElement;
    if (mode === 'normal') {
      html.removeAttribute('data-cbm');
    } else {
      html.setAttribute('data-cbm', mode);
    }
  }, [mode]);

  return (
    <ColourBlindContext.Provider value={{ mode, setMode }}>
      {children}
      {mode !== 'normal' && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: TINTS[mode],
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        />
      )}
    </ColourBlindContext.Provider>
  );
}

export function useColourBlind() {
  return useContext(ColourBlindContext);
}
