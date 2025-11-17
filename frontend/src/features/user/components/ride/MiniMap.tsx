
'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';

// Fix for default icon path in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const greenPulsatingIcon = L.divIcon({ className: 'pulsating-marker pulsating-marker-green', iconSize: [20, 20] });


interface MiniMapProps {
  riderLocation?: { lat: number; lon: number } | null;
}

const MiniMap = ({ riderLocation }: MiniMapProps) => {
    const { theme } = useTheme();
    
    const position: LatLngExpression | null = riderLocation ? [riderLocation.lat, riderLocation.lon] : null;
    let center: LatLngExpression = position || [28.6139, 77.2090];

    const darkTileUrl = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png';
    const lightTileUrl = "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";

    const tileUrl = theme === 'dark' ? darkTileUrl : lightTileUrl;
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <MapContainer
      key={tileUrl} // Add key to force re-render on theme change
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      dragging={false}
      touchZoom={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      zoomControl={false}
      attributionControl={false} // Hide attribution on the mini map
      placeholder={<div className="w-full h-full bg-muted animate-pulse" />}
    >
        <TileLayer
            url={tileUrl}
            attribution={attribution}
        />
        {position && <Marker position={position} icon={greenPulsatingIcon}></Marker>}
    </MapContainer>
  );
};

export default MiniMap;
