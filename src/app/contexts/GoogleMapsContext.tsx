import { createContext, useContext, ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  apiKey: string | null;
  configLoaded: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
  apiKey: null,
  configLoaded: false
});

const LIBRARIES: ("marker" | "drawing" | "geometry" | "places" | "visualization")[] = ['marker'];

function AuthenticatedGoogleMapsLoader({ children, apiKey, configLoaded }: { children: ReactNode, apiKey: string, configLoaded: boolean }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-v3',
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
    mapIds: ['DEMO_MAP_ID'], // Required for AdvancedMarkerElement
    libraries: LIBRARIES
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError, apiKey, configLoaded }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function GoogleMapsProvider({ children, apiKey, configLoaded = true }: { children: ReactNode, apiKey: string | null, configLoaded?: boolean }) {
  // HMR Cleanup: Remove any existing Google Maps script tags that might have been loaded
  // by a previous version of the code with different options (e.g., missing API key or different libraries).
  // This prevents the "Loader must not be called again with different options" error.
  if (typeof document !== 'undefined') {
    const existingScript = document.getElementById('google-map-script');
    if (existingScript) {
      existingScript.remove();
    }
  }

  // Only mount the loader if we have a valid API key.
  // This prevents the loader from initializing with undefined/null key.
  if (apiKey) {
    return (
      <AuthenticatedGoogleMapsLoader apiKey={apiKey} configLoaded={configLoaded}>
        {children}
      </AuthenticatedGoogleMapsLoader>
    );
  }

  // Fallback context provider for when no API key is present (Mock Mode)
  return (
    <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: undefined, apiKey: null, configLoaded }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export const useGoogleMaps = () => useContext(GoogleMapsContext);
