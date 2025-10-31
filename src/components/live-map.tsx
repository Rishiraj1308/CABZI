
'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import 'leaflet/dist/leaflet.css';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import type L from 'leaflet';
import type { ActiveEntity, EntityStatus } from '@/app/admin/map/page';
import { useTheme } from 'next-themes';


interface LiveMapProps {
    routeGeometry?: any;
    driverLocation?: { lat: number, lon: number };
    riderLocation?: { lat: number, lon: number };
    destinationLocation?: { lat: number, lon: number };
    activePartners?: ActiveEntity[];
    activeRiders?: ActiveEntity[];
    onLocationFound?: (address: string, coords: { lat: number, lon: number }) => void;
    enableCursorTooltip?: boolean;
    isTripInProgress?: boolean;
    zoom?: number;
}

const LiveMap = forwardRef<any, LiveMapProps>((props, ref) => {
    const { theme, resolvedTheme } = useTheme();
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<Map<string, L.Marker>>(new Map());
    const routeLayerRef = useRef<L.Polyline | null>(null);
    const locateControlRef = useRef<any | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const markerAnimationRef = useRef<Map<string, { startPos: L.LatLng, targetPos: L.LatLng, startTime: number }>>(new Map());

     const getAddress = useCallback(async (lat: number, lon: number): Promise<string | null> => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data?.display_name || null;
        } catch {
            return null;
        }
    }, []);

    useImperativeHandle(ref, () => ({
        locate: (): Promise<{address: string, coords: {lat: number, lon: number}} | null> => {
            return new Promise((resolve) => {
                const tryLocate = () => {
                    if (mapInstanceRef.current && locateControlRef.current) {
                        const onFound = (e: any) => {
                            const { lat, lng } = e.latlng;
                             mapInstanceRef.current?.flyTo([lat, lng], 16); // Zoom in on location found
                            getAddress(lat, lng).then(address => {
                                if (address) {
                                    const result = { address, coords: { lat, lon: lng } };
                                    if(props.onLocationFound) props.onLocationFound(address, result.coords);
                                    resolve(result);
                                } else {
                                    resolve(null);
                                }
                            }).finally(() => {
                                mapInstanceRef.current?.off('locationfound', onFound);
                                mapInstanceRef.current?.off('locationerror', onError);
                            });
                        };
                        const onError = () => {
                             resolve(null);
                             mapInstanceRef.current?.off('locationfound', onFound);
                             mapInstanceRef.current?.off('locationerror', onError);
                        };
                        
                        mapInstanceRef.current.on('locationfound', onFound);
                        mapInstanceRef.current.on('locationerror', onError);
                        
                        locateControlRef.current?.start();
                    } else {
                        setTimeout(tryLocate, 100);
                    }
                };
                tryLocate();
            });
        },
        getAddress: getAddress,
        getCenter: () => {
            return mapInstanceRef.current?.getCenter();
        }
    }));
    
    // Icon creation utility
    const createIcon = (type: ActiveEntity['type'] | EntityStatus | 'location' | string, options: { isPulsing?: boolean } = {}) => {
        const L = require('leaflet');
        let iconHtml;
        let iconSize: [number, number] = [24, 24];
        let iconAnchor: [number, number] = [12, 12];
        const pulseAnimation = options.isPulsing ? `<style>@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }</style>` : '';
        const animationClass = options.isPulsing ? 'animation: pulse 1.5s infinite;' : '';
        
        switch (type) {
            case 'driver':
                 iconHtml = `<div style="width: 32px; height: 32px; transform: rotate(90deg);"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="hsl(var(--primary))" style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.4));"><path d="M384 192c0-87.4-117-144-144-144c-30.9 0-58.5 40.2-76.8 64H128c-17.7 0-32 14.3-32 32s14.3 32 32 32h64c17.7 0 32-14.3 32-32c0-12.8-13-24-24-24H208V32c0-17.7-14.3-32-32-32H32C14.3 0 0 14.3 0 32v224c0 77.3 103.5 128 192 128s192-50.7 192-128V224c0-17.7-14.3-32-32-32s-32 14.3-32 32v32c0 23.6-26.3 48-96 48s-96-24.4-96-48V128c0-17.7 14.3-32 32-32h4.8c18.5-23.8 45.9-64 76.8-64c27 0 144 56.6 144 144v64c0 53-64 96-128 96S64 429 64 376v-32c0-17.7-14.3-32-32-32s-32 14.3-32 32v32c0 88.4 100.3 160 224 160s224-71.6 224-160V192z"/></svg></div>`;
                iconSize = [32, 32];
                iconAnchor = [16, 16];
                break;
            case 'rider':
                 iconHtml = `<div style="width: 12px; height: 12px; background-color: #22c55e; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #22c55e; animation: rider-pulse 2s infinite ease-in-out;"><style>@keyframes rider-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }</style></div>`;
                 iconSize = [16, 16];
                 iconAnchor = [8, 8];
                break;
            case 'destination':
                 iconHtml = `<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #ef4444;"></div>`;
                 iconSize = [16, 16];
                 iconAnchor = [8, 8];
                 break;
            default: // location marker and other types
                iconHtml = `<div style="background-color: #1d4ed8; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`;
                break;
        }

        return L.divIcon({ html: iconHtml, className: '', iconSize: iconSize, iconAnchor: iconAnchor });
    };

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const L = require('leaflet');
        const locateControl = require('leaflet.locatecontrol');
        
        // @ts-ignore - Fix for default icon path in Next.js
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        
        const map = L.map(mapContainerRef.current, {
            center: [28.6139, 77.2090], // Delhi
            zoom: props.zoom || 11,
            zoomControl: false,
        });
        mapInstanceRef.current = map;
        
        setTimeout(() => map.invalidateSize(), 100);

        const isDark = resolvedTheme === 'dark';
        const initialUrl = isDark 
            ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
            : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';
        const initialAttribution = '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

        tileLayerRef.current = L.tileLayer(initialUrl, { attribution: initialAttribution }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        
        locateControlRef.current = new (L.Control as any).Locate({
            position: 'bottomright',
            strings: { title: "Show my location" },
            flyTo: true,
            keepCurrentZoomLevel: false,
            locateOptions: {
                maxZoom: 16,
                watch: true,
                enableHighAccuracy: true,
            },
            drawMarker: true,
             markerStyle: {
                color: '#1d4ed8',
                fillColor: '#60a5fa',
            },
            drawCircle: false,
        }).addTo(map);

        map.on('locationfound', (e: any) => {
            const { lat, lng } = e.latlng;
            getAddress(lat, lng).then(address => {
                if (address && props.onLocationFound) {
                    props.onLocationFound(address, { lat, lon: lng });
                }
            });
        });

    }, [getAddress, props, resolvedTheme, props.zoom]);

    useEffect(() => {
        if (!tileLayerRef.current) return;
        const isDark = resolvedTheme === 'dark';
        const newUrl = isDark
            ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
            : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';
        tileLayerRef.current.setUrl(newUrl);
    }, [resolvedTheme]);


    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const L = require('leaflet');

        if (routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }

        if (props.routeGeometry && props.routeGeometry.coordinates) {
            const routeCoords = props.routeGeometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
            
            routeLayerRef.current = L.polyline(routeCoords, {
                color: 'hsl(var(--primary))',
                weight: 5,
                opacity: 0.8,
                className: 'route-electric-flow',
                dashArray: '10, 10'
            }).addTo(map);

             map.flyToBounds(L.latLngBounds(routeCoords), { padding: [50, 50], maxZoom: 16 });
        }
    }, [props.routeGeometry]);

    const updateMarker = (id: string, latLng: L.LatLng, type: string) => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const L = require('leaflet');

        let marker = markersRef.current.get(id);
        const icon = createIcon(type);

        if (marker) {
            const currentPos = marker.getLatLng();
            if (!currentPos.equals(latLng)) {
                markerAnimationRef.current.set(id, { startPos: currentPos, targetPos: latLng, startTime: performance.now() });
            }
            marker.setIcon(icon); // Update icon in case it changed (e.g. status)
        } else {
            marker = L.marker(latLng, { icon }).addTo(map);
            markersRef.current.set(id, marker);
        }
    };

    const removeMarker = (id: string) => {
        const map = mapInstanceRef.current;
        if (!map) return;
        
        const markerToRemove = markersRef.current.get(id);
        if (markerToRemove) {
            map.removeLayer(markerToRemove);
            markersRef.current.delete(id);
            markerAnimationRef.current.delete(id);
        }
    };
    
    // Unified Marker Management
    useEffect(() => {
        const L = require('leaflet');
        const allEntities = new Map<string, { lat: number; lon: number; type: string }>();

        // Add special markers
        if (props.driverLocation) allEntities.set('__driver', { ...props.driverLocation, type: 'driver' });
        if (props.riderLocation) allEntities.set('__rider', { ...props.riderLocation, type: 'rider' });
        if (props.isTripInProgress && props.destinationLocation) {
            allEntities.set('__destination', { ...props.destinationLocation, type: 'destination' });
        }

        // Add partner/rider groups
        props.activePartners?.forEach(p => {
          if (p.location) {
            allEntities.set(p.id, { lat: p.location.lat, lon: p.location.lon, type: p.status || p.type });
          }
        });
        props.activeRiders?.forEach(r => {
          if (r.location) {
            allEntities.set(r.id, { lat: r.location.lat, lon: r.location.lon, type: r.type });
          }
        });
        
        const currentMarkerIds = new Set(markersRef.current.keys());

        // Remove markers that are no longer present
        currentMarkerIds.forEach(id => {
            if (!allEntities.has(id)) {
                removeMarker(id);
            }
        });

        // Add or update markers
        allEntities.forEach((entity, id) => {
            if (typeof entity.lat === 'number' && typeof entity.lon === 'number') {
                updateMarker(id, new L.LatLng(entity.lat, entity.lon), entity.type);
            } else {
                console.warn(`Invalid location data for entity ${id}:`, entity);
            }
        });

        if (markerAnimationRef.current.size > 0 && !animationFrameRef.current) {
            startAnimationLoop();
        }
    }, [props]);


    const startAnimationLoop = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
        const animate = (timestamp: number) => {
            const L = require('leaflet');
            let hasActiveAnimations = false;
            const duration = 1000;
    
            markerAnimationRef.current.forEach((anim, id) => {
                const marker = markersRef.current.get(id);
                if (!marker) {
                    markerAnimationRef.current.delete(id);
                    return;
                }
    
                const elapsed = timestamp - anim.startTime;
                let progress = elapsed / duration;
    
                if (progress >= 1) {
                    marker.setLatLng(anim.targetPos);
                    markerAnimationRef.current.delete(id);
                } else {
                    hasActiveAnimations = true;
                    const newLat = anim.startPos.lat + (anim.targetPos.lat - anim.startPos.lat) * progress;
                    const newLng = anim.startPos.lng + (anim.targetPos.lng - anim.startPos.lng) * progress;
                    marker.setLatLng(new L.LatLng(newLat, newLng));
                }
            });
    
            if (hasActiveAnimations) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                animationFrameRef.current = null;
            }
        };
    
        animationFrameRef.current = requestAnimationFrame(animate);
    }, []);

    return (
        <div id="map-container" className="w-full h-full z-0" ref={mapContainerRef}></div>
    );
});

LiveMap.displayName = 'LiveMap';
export default LiveMap;
