
'use client'

import { useState, useEffect } from 'react';
import { getRoute } from '@/lib/routing';

type Coord = { lat: number; lon: number };

export function useRoute(start: Coord | null, end: Coord | null) {
  const [route, setRoute] = useState<any | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!start || !end) {
        setRoute(null);
        setDistance(null);
        setDuration(null);
        return;
    };

    const fetchRouteData = async () => {
      try {
        const routeData = await getRoute(start, end);
        if (routeData && routeData.routes && routeData.routes.length > 0) {
          const r = routeData.routes[0];
          setRoute(r.geometry);
          setDistance(r.distance / 1000); // km
          setDuration(Math.round(r.duration / 60)); // minutes
        }
      } catch (error) {
        console.error("Failed to fetch route:", error);
        setRoute(null);
        setDistance(null);
        setDuration(null);
      }
    };

    fetchRouteData();
    
    // This dependency array ensures the effect only re-runs when the
    // actual coordinates of the start or end points change.
  }, [start?.lat, start?.lon, end?.lat, end?.lon]); 

  return { route, distance, duration };
}
