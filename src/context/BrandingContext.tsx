import React, { createContext, useContext, useState } from 'react';

const CUSTOM_LOGO_STORAGE_KEY = 'attendease_custom_logo_v1';

interface BrandingContextValue {
  customLogoUrl: string | null;
  setCustomLogoUrl: (url: string | null) => void;
  resetLogo: () => void;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customLogoUrl, setLogoState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CUSTOM_LOGO_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setCustomLogoUrl = (url: string | null) => {
    setLogoState(url);
    try {
      if (url) {
        localStorage.setItem(CUSTOM_LOGO_STORAGE_KEY, url);
      } else {
        localStorage.removeItem(CUSTOM_LOGO_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures
    }
  };

  return (
    <BrandingContext.Provider
      value={{
        customLogoUrl,
        setCustomLogoUrl,
        resetLogo: () => setCustomLogoUrl(null)
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within a BrandingProvider');
  return ctx;
}
