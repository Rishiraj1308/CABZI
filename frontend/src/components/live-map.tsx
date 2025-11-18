'use client';

import React, { useEffect, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { Car, Wrench, Ambulance, User, Hospital, MapPin } from 'lucide-react';

// Fix for default icon path in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


const createEntityIcon = (IconComponent: React.ElementType, color: string) => {
    const iconHtml = ReactDOMServer.renderToString(
        <div style={{
            backgroundColor: color,
            borderRadius: '50%',
            padding: '6px',
            boxShadow: `0 0 10px ${color}, 0 0 5px rgba(0,0,0,0.5)`,
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <IconComponent style={{ color: 'white', width: '16px', height: '16px' }} />
        </div>
    );
    return L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
    });
};

const entityIcons = {
    driver: createEntityIcon(Car, 'hsl(var(--primary))'),
    mechanic: createEntityIcon(Wrench, 'hsl(var(--yellow-500, 38 92% 50%))'),
    ambulance: createEntityIcon(Ambulance, 'hsl(var(--destructive))'),
    rider: createEntityIcon(User, 'hsl(var(--green-500, 142 71% 45%))'),
    hospital: createEntityIcon(Hospital, 'hsl(var(--indigo-500, 221 83% 53%))'),
};

interface ActiveEntity {
    id: string;
    name: string;
    type: 'driver' | 'mechanic' | 'ambulance' | 'rider' | 'hospital';
    status?: string;
    location: {
        lat: number;
        lon: number;
    };
    phone?: string;
    vehicle?: string;
}

interface LiveMapProps {
  children?: React.ReactNode; // To allow for layers like Heatmap
  activePartners?: ActiveEntity[];
  center?: [number, number];
  zoom?: number;
  enableCursorTooltip?: boolean;
  isDraggable?: boolean;
  onMarkerDrag?: (location: { lat: number; lon: number }) => void;
}

const DraggableMarker = ({ center, onMarkerDrag }: { center: [number, number], onMarkerDrag?: (location: { lat: number; lon: number }) => void }) => {
    const [position, setPosition] = React.useState(center);
    const markerRef = React.useRef<L.Marker>(null);
    const map = useMap();

    const eventHandlers = React.useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const { lat, lng } = marker.getLatLng();
                    setPosition([lat, lng]);
                    onMarkerDrag?.({ lat, lon: lng });
                }
            },
        }),
        [onMarkerDrag],
    );

    useEffect(() => {
        map.setView(center, 15);
    }, [center, map]);
    

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        >
            <Tooltip>Drag to set exact location</Tooltip>
        </Marker>
    );
};


const CursorTooltip = ({ partners }: { partners: ActiveEntity[] }) => {
    const map = useMap();
    const tooltipRef = useRef<L.Tooltip | null>(null);

    useEffect(() => {
        if (!map) return;

        const handleMouseMove = (e: L.LeafletMouseEvent) => {
            const R = 6371; // Earth radius in km
            const radiusKm = 5;

            const nearbyPartners = partners.filter(p => {
                const dLat = (p.location.lat - e.latlng.lat) * (Math.PI/180);
                const dLon = (p.location.lon - e.latlng.lng) * (Math.PI/180);
                const a = 
                    Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(e.latlng.lat * (Math.PI/180)) * Math.cos(p.location.lat * (Math.PI/180)) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2); 
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
                return (R * c) <= radiusKm;
            });
            
            const counts = nearbyPartners.reduce((acc, p) => {
                acc[p.type] = (acc[p.type] || 0) + 1;
                return acc;
            }, {} as Record<ActiveEntity['type'], number>);
            
            const tooltipContent = `
                <div class="p-1">
                    <p class="font-bold text-base">${nearbyPartners.length} entities in 5km</p>
                    <div class="grid grid-cols-2 gap-x-2 text-xs">
                        ${Object.entries(counts).map(([type, count]) => `<span>${type.charAt(0).toUpperCase() + type.slice(1)}:</span> <span class="font-semibold">${count}</span>`).join('')}
                    </div>
                </div>
            `;

            if (tooltipRef.current) {
                tooltipRef.current.setLatLng(e.latlng).setContent(tooltipContent);
            } else {
                tooltipRef.current = L.tooltip({
                    permanent: false,
                    sticky: true,
                    direction: 'right',
                    className: 'cursor-tooltip'
                })
                .setLatLng(e.latlng)
                .setContent(tooltipContent)
                .addTo(map);
            }
        };

        map.on('mousemove', handleMouseMove);

        return () => {
            map.off('mousemove', handleMouseMove);
            if (tooltipRef.current) {
                tooltipRef.current.remove();
                tooltipRef.current = null;
            }
        };
    }, [map, partners]);

    return null;
}

const LiveMap = ({ children, activePartners = [], center = [28.6139, 77.2090], zoom = 12, enableCursorTooltip = false, isDraggable = false, onMarkerDrag }: LiveMapProps) => {
    const { theme } = useTheme();

    const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const lightTileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    
    const tileUrl = theme === 'dark' ? darkTileUrl : lightTileUrl;
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    return (
        <MapContainer
            key={tileUrl} // Re-render map on theme change
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
            <TileLayer
                url={tileUrl}
                attribution={attribution}
            />

            {children}

            {activePartners.map(partner => (
                <Marker
                    key={partner.id}
                    position={[partner.location.lat, partner.location.lon]}
                    icon={entityIcons[partner.type] || new L.Icon.Default()}
                >
                    <Popup>
                        <div className="p-1 font-sans">
                            <p className="font-bold text-base">{partner.name}</p>
                            <p className="capitalize text-sm text-muted-foreground">{partner.type}</p>
                            <p className="text-xs">{partner.phone || 'No contact'}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {isDraggable && <DraggableMarker center={center} onMarkerDrag={onMarkerDrag} />}

            {enableCursorTooltip && <CursorTooltip partners={activePartners} />}
        </MapContainer>
    );
};

export default LiveMap;
