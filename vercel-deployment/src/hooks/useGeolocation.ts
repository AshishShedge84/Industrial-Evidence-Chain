import { useState, useCallback, useEffect, useRef } from 'react';

export interface GeolocationState {
  coordinates: GeolocationCoordinates | null;
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
  isSupported: boolean;
}

export interface GeolocationActions {
  getCurrentPosition: (options?: PositionOptions) => Promise<GeolocationPosition>;
  watchPosition: (options?: PositionOptions) => number | null;
  clearWatch: (watchId: number) => void;
}

export function useGeolocation(): GeolocationState & GeolocationActions {
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates | null>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported] = useState(() => 'geolocation' in navigator);

  const watchIdRef = useRef<number | null>(null);

  const getCurrentPosition = useCallback(
    (options?: PositionOptions): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        if (!isSupported) {
          const err = { code: 0, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
          setError(err);
          reject(err);
          return;
        }

        setIsLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setPosition(pos);
            setCoordinates(pos.coords);
            setIsLoading(false);
            resolve(pos);
          },
          (err) => {
            setError(err);
            setIsLoading(false);
            reject(err);
          },
          options
        );
      });
    },
    [isSupported]
  );

  const watchPosition = useCallback(
    (options?: PositionOptions): number | null => {
      if (!isSupported) {
        const err = { code: 0, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
        setError(err);
        return null;
      }

      setError(null);

      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition(pos);
          setCoordinates(pos.coords);
        },
        (err) => {
          setError(err);
        },
        options
      );

      watchIdRef.current = id;
      return id;
    },
    [isSupported]
  );

  const clearWatch = useCallback((watchId: number) => {
    if (isSupported) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, [isSupported]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    coordinates,
    position,
    error,
    isLoading,
    isSupported,
    getCurrentPosition,
    watchPosition,
    clearWatch,
  };
}