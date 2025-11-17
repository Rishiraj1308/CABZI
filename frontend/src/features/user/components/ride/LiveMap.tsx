
'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { Car, Wrench, Ambulance, User, Hospital, MapPin, Bike } from 'lucide-react';
import { LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix for default icon path in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom pulsating icons for rider and destination
const redPulsatingIcon = L.divIcon({ className: 'pulsating-marker pulsating-marker-red', iconSize: [20, 20] });
const greenPulsatingIcon = L.divIcon({ className: 'pulsating-marker pulsating-marker-green', iconSize: [20, 20] });


const createPartnerIcon = (iconName: string, color: string) => {
    const iconSvgs = {
        Car: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9L1 16v5c0 .6.4 1 1 1h2"/><path d="M7 17h10"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>`,
        Wrench: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
        Ambulance: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><path d="M8 8v4"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
        User: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        Hospital: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 10h-4"/><path d="M18 12h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2v-2a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v2H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h2"/><path d="M12 22V10"/><path d="M12 6V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/></svg>`,
        Bike: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M5 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M19 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="m5.5 11.5-1.9 2.1c-.2.2-.3.4-.3.7v.5c0 .6.4 1 1 1h3.4"/><path d="M12 12.5h-4.5"/><path d="M19 11.5c-1.5 0-2.8 1.5-3 3l-1.5 4.5"/><path d="M14.5 11.5h-3"/></svg>`,
    };

    const iconHtml = `
        <div style="background-color: ${color}; border-radius: 50%; padding: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center;">
            ${iconSvgs[iconName as keyof typeof iconSvgs] || ''}
        </div>
    `;
    return L.divIcon({ html: iconHtml, className: '', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28] });
};

const partnerIcons = {
    driver: createPartnerIcon('Car', 'hsl(var(--primary))'),
    mechanic: createPartnerIcon('Wrench', 'hsl(var(--amber-500, 38 92% 50%))'),
    ambulance: createPartnerIcon('Ambulance', 'hsl(var(--destructive))'),
    rider: createPartnerIcon('User', 'hsl(var(--green-500, 142 71% 45%))'),
    hospital: createPartnerIcon('Hospital', 'hsl(var(--indigo-500, 221 83% 53%))'),
    bike: createPartnerIcon('Bike', 'hsl(var(--primary))'),
};

const getDriverIcon = (vehicleType: string = '') => {
    const type = vehicleType.toLowerCase();
    if (type.includes('bike')) return partnerIcons.bike;
    return partnerIcons.driver; // Default to car
}

interface Partner {
    id: string;
    name: string;
    type: 'hospital' | 'mechanic' | 'doctor' | 'driver' | 'rider' | 'ambulance';
    vehicleType?: string;
    location: { latitude: number; longitude: number };
    specialization?: string;
}

interface LiveMapProps {
  riderLocation?: { lat: number; lon: number } | null;
  destinationLocation?: { lat: number; lon: number } | null;
  driverLocation?: { lat: number, lon: number } | null;
  driverVehicleType?: string;
  routeGeometry?: any;
  isTripInProgress?: boolean;
  partners?: Partner[];
  activePartners?: Partner[];
  enableCursorTooltip?: boolean;
}

const LocateButton = () => {
    const map = useMap();
    const handleClick = () => {
        map.locate({ setView: true, maxZoom: 15 });
    };
    return (
        <Button 
            variant="outline" 
            size="icon" 
            onClick={handleClick} 
            className="absolute top-4 right-4 z-[1000] bg-background/80 backdrop-blur-sm shadow-lg"
            title="Locate Me"
        >
            <LocateFixed className="w-5 h-5"/>
        </Button>
    )
}

const LiveMap = ({ riderLocation, destinationLocation, driverLocation, driverVehicleType, routeGeometry, isTripInProgress, partners, activePartners }: LiveMapProps) => {
    const { theme } = useTheme();
    
    const riderPosition: LatLngExpression | null = riderLocation ? [riderLocation.lat, riderLocation.lon] : null;
    const driverPosition: LatLngExpression | null = driverLocation ? [driverLocation.lat, driverLocation.lon] : null;
    const destinationPosition: LatLngExpression | null = destinationLocation ? [destinationLocation.lat, destinationLocation.lon] : null;

    let center: LatLngExpression = driverPosition || riderPosition || [28.6139, 77.2090]; // Default to Delhi

    const bounds = L.latLngBounds(driverPosition || center, riderPosition || center);
    if(destinationPosition) bounds.extend(destinationPosition);

    const darkTileUrl = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png';
    const lightTileUrl = "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";

    const tileUrl = theme === 'dark' ? darkTileUrl : lightTileUrl;
    const attribution = '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <MapContainer
      key={tileUrl} // Add key to force re-render on theme change
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      bounds={bounds.isValid() ? bounds : undefined}
      boundsOptions={{ padding: [50, 50] }}
    >
        <TileLayer
            url={tileUrl}
            attribution={attribution}
        />
        
        <LocateButton />

        {riderPosition && <Marker position={riderPosition} icon={greenPulsatingIcon}><Popup>Rider Pickup</Popup></Marker>}
        {driverPosition && <Marker position={driverPosition} icon={getDriverIcon(driverVehicleType)}><Popup>Your Location</Popup></Marker>}
        {destinationPosition && <Marker position={destinationPosition} icon={redPulsatingIcon}><Popup>Destination</Popup></Marker>}

        {(partners || activePartners)?.map(partner => {
            if (!partner.location) return null;
            const icon = partner.type === 'driver' ? getDriverIcon(partner.vehicleType) : partnerIcons[partner.type as keyof typeof partnerIcons] || partnerIcons.driver;
            return (
                 <Marker 
                    key={partner.id} 
                    position={[partner.location.latitude, partner.location.longitude]}
                    icon={icon}
                 >
                    <Popup>
                        <div className="font-sans">
                            <p className="font-bold">{partner.name}</p>
                            {partner.specialization && <p className="text-xs text-muted-foreground">{partner.specialization}</p>}
                        </div>
                    </Popup>
                </Marker>
            )
        })}

        {routeGeometry && (
            <Polyline 
                positions={routeGeometry.coordinates.map((c: [number, number]) => [c[1], c[0]])}
                pathOptions={{
                    color: isTripInProgress ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
                    className: 'route-electric-flow'
                }}
            />
        )}
    </MapContainer>
  );
};

export default LiveMap;
