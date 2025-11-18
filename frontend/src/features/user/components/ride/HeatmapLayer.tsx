'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet.heat';

declare module 'leaflet' {
  function heatLayer(
    latlngs: LatLngExpression[],
    options?: any
  ): any;
}

interface HeatmapLayerProps {
  points: [number, number][];
}

const HeatmapLayer = ({ points }: HeatmapLayerProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    // The type definitions for leaflet.heat might not be perfect,
    // so we cast to 'any' to avoid TypeScript errors with the plugin.
    const heatLayer = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 18,
      gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null; // This component does not render any DOM elements itself
};

export default HeatmapLayer;
