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
    activePartners?: ActiveEntity[];
    activeRiders?: ActiveEntity[];
    onLocationFound?: (address: string, coords: { lat: number, lon: number }) => void;
    enableCursorTooltip?: boolean;
    isTripInProgress?: boolean;
}

const LiveMap = forwardRef<any, LiveMapProps>((props, ref) => {
    const { theme, resolvedTheme } = useTheme();
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<Map<string, L.Marker>>(new Map());
    const routeLayerRef = useRef<L.Polyline | null>(null);
    const riderMarkerRef = useRef<L.Marker | null>(null);
    const driverMarkerRef = useRef<L.Marker | null>(null);
    const cursorTooltipRef = useRef<L.Tooltip | null>(null);
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
                        // If map is not ready, retry after a short delay
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
    const createIcon = (type: ActiveEntity['type'] | EntityStatus | 'location' | string) => {
        const L = require('leaflet');
        let iconHtml;
        let iconSize: [number, number] = [24, 24];
        let iconAnchor: [number, number] = [12, 12];
        
        switch (type) {
            case 'hospital':
                iconHtml = `<div style="background-color: #4f46e5; border-radius: 9999px; padding: 4px; display:flex; align-items:center; justify-content:center; box-shadow: 0 1px 4px rgba(0,0,0,0.2); border: 1.5px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hospital"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18v-4"/><path d="M14 10h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2-2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/></svg></div>`;
                iconSize = [20, 20];
                iconAnchor = [10, 10];
                break;
            case 'sos_medical':
            case 'ambulance':
                iconHtml = `<div style="background-color: #ef4444; border-radius: 9999px; padding: 4px; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4); border: 1.5px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ambulance"><path d="M10 10H6"/><path d="M8 8v4"/><path d="M14 18V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10.5a2.5 2.5 0 0 0 2.5-2.5V18"/><path d="M18 18h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2v8Z"/><path d="M12 11h4"/><path d="M18 15h-2.5"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`;
                iconSize = [20, 20];
                iconAnchor = [10, 10];
                break;
            case 'sos_mechanical':
                iconHtml = `<div style="background-color: #eab308; border-radius: 9999px; padding: 8px; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.5); border: 2px solid white; animation: pulse 1.5s infinite;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wrench"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
                <style>@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }</style>`;
                iconSize = [36, 36];
                iconAnchor = [18, 18];
                break;
             case 'sos_security':
                iconHtml = `<div style="background-color: #3b82f6; border-radius: 9999px; padding: 8px; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5); border: 2px solid white; animation: pulse 1.5s infinite;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg></div>
                <style>@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }</style>`;
                iconSize = [36, 36];
                iconAnchor = [18, 18];
                break;
            case 'driver':
            case 'online':
            case 'on_trip':
                iconHtml = `<div style="background-color: hsl(var(--primary)); border-radius: 9999px; padding: 4px; display:flex; align-items:center; justify-content:center; box-shadow: 0 1px 4px rgba(0,0,0,0.2); border: 1.5px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9L2 12v9h2"/><path d="M7 17h10"/><circle cx="7" cy="17" r="2"/><path d="M17 17h-2"/><circle cx="17" cy="17" r="2"/></svg></div>`;
                iconSize = [20, 20];
                iconAnchor = [10, 10];
                break;
            case 'mechanic':
            case 'available':
                iconHtml = `<div style="background-color: hsl(var(--accent)); border-radius: 9999px; padding: 4px; display:flex; align-items:center; justify-content:center; box-shadow: 0 1px 4px rgba(0,0,0,0.2); border: 1.5px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--accent-foreground))" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wrench"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>`;
                 iconSize = [20, 20];
                 iconAnchor = [10, 10];
                break;
            case 'rider':
                 iconHtml = `<div style="width: 12px; height: 12px; background-color: #22c55e; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #22c55e; animation: rider-pulse 2s infinite ease-in-out;"><style>@keyframes rider-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }</style></div>`;
                 iconSize = [16, 16];
                 iconAnchor = [8, 8];
                break;
            default: // location marker
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
            zoom: 11,
            zoomControl: false,
        });
        mapInstanceRef.current = map;

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
            flyTo: true, // Auto-zoom to user location on find
            keepCurrentZoomLevel: false,
            locateOptions: {
                maxZoom: 16, // Zoom in closer
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

        const onFound = (e: any) => {
            const { lat, lng } = e.latlng;
            getAddress(lat, lng).then(address => {
                if (address && props.onLocationFound) {
                    props.onLocationFound(address, { lat, lon: lng });
                }
            });
            mapInstanceRef.current?.flyTo([lat, lng], 16);
        };

        map.on('locationfound', onFound);
        
        map.whenReady(() => {
            if (props.onLocationFound) {
                 locateControlRef.current?.start();
            }
        });

        setTimeout(() => {
            map.invalidateSize();
        }, 100);

    }, [getAddress, props, resolvedTheme]);

    // Effect to switch map theme when the app's theme changes
    useEffect(() => {
        if (!tileLayerRef.current) return;
        
        const isDark = resolvedTheme === 'dark';
        
        const newUrl = isDark
            ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
            : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';
        
        tileLayerRef.current.setUrl(newUrl);

    }, [resolvedTheme]);


    // Effect for route updates with animation
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const L = require('leaflet');

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        if (routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }

        if (props.routeGeometry && props.routeGeometry.coordinates) {
            const routeCoords = props.routeGeometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
            
            routeLayerRef.current = L.polyline([], {
                color: 'hsl(var(--primary))',
                weight: 5,
                opacity: 0.8,
            }).addTo(map);

            let currentIndex = 0;
            const totalPoints = routeCoords.length;
            const animationDuration = 1000; // 1 second total animation time
            const pointsPerFrame = Math.max(1, Math.floor(totalPoints / (animationDuration / (1000/60))));

            const animate = () => {
                if (currentIndex < totalPoints) {
                    const nextIndex = Math.min(currentIndex + pointsPerFrame, totalPoints);
                    for (let i = currentIndex; i < nextIndex; i++) {
                        routeLayerRef.current?.addLatLng(routeCoords[i]);
                    }
                    currentIndex = nextIndex;
                    animationFrameRef.current = requestAnimationFrame(animate);
                }
            };

            animate();
            if (props.driverLocation && props.riderLocation) {
                 map.flyToBounds(L.latLngBounds(routeCoords), { padding: [50, 50], maxZoom: 16 });
            } else if (!props.isTripInProgress && routeCoords.length > 0) {
                 map.flyToBounds(L.latLngBounds(routeCoords), { padding: [50, 50] });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(props.routeGeometry)]);

    // Effect for a single, primary user marker (e.g., the stranded driver or the rider)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const L = require('leaflet');
        
        if (props.riderLocation && typeof props.riderLocation.lat === 'number' && typeof props.riderLocation.lon === 'number') {
            const { lat, lon } = props.riderLocation;
            if (riderMarkerRef.current) {
                riderMarkerRef.current.setLatLng([lat, lon]);
            } else {
                riderMarkerRef.current = L.marker([lat, lon], { icon: createIcon('rider') }).addTo(map);
                // Do not fly here, let the locate control handle initial view
            }
        } else if (riderMarkerRef.current) {
            map.removeLayer(riderMarkerRef.current);
            riderMarkerRef.current = null;
        }
    }, [props.riderLocation]);

    const startAnimationLoop = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
        const animate = (timestamp: number) => {
            const L = require('leaflet');
            let hasActiveAnimations = false;
            const duration = 1000; // 1 second for the glide animation
    
            markerAnimationRef.current.forEach((anim, id) => {
                const marker = markersRef.current.get(id) || driverMarkerRef.current;
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

    // Effect for a single, secondary marker (e.g., the mechanic or the driver)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const L = require('leaflet');
        
        if (props.driverLocation && typeof props.driverLocation.lat === 'number' && typeof props.driverLocation.lon === 'number') {
            const { lat, lon } = props.driverLocation;
            // The logic to determine the icon type can be complex, for now, we'll simplify
            // and assume it's a 'driver' type if activePartners is not available.
            const partner = props.activePartners?.find(p => p.location.lat === lat && p.location.lon === lon);
            const iconType = partner ? partner.type : 'driver';
            
            const targetPos = new L.LatLng(lat, lon);

            if (driverMarkerRef.current) {
                const currentPos = driverMarkerRef.current.getLatLng();
                 if (!currentPos.equals(targetPos)) {
                    markerAnimationRef.current.set('driver-marker', { startPos: currentPos, targetPos: targetPos, startTime: performance.now() });
                    if (!animationFrameRef.current) {
                        startAnimationLoop();
                    }
                 }
                driverMarkerRef.current.setIcon(createIcon(iconType));

            } else {
                driverMarkerRef.current = L.marker([lat, lon], { icon: createIcon(iconType) }).addTo(map);
                if(!props.riderLocation){ 
                    map.flyTo([lat, lon], 16);
                }
            }
        } else if (driverMarkerRef.current) {
            map.removeLayer(driverMarkerRef.current);
            driverMarkerRef.current = null;
        }
    }, [props.driverLocation, props.activePartners, props.riderLocation, startAnimationLoop]);
    
    // Combined effect for multiple active entities (Admin/Main Homepage view)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const L = require('leaflet');

        const allEntities = [...(props.activePartners || []), ...(props.activeRiders || [])];
        const currentMarkerIds = new Set(Array.from(markersRef.current.keys()));
        const newEntityIds = new Set(allEntities.map(e => e.id));
        
        // Remove old markers
        currentMarkerIds.forEach(id => {
            if (!newEntityIds.has(id)) {
                const marker = markersRef.current.get(id);
                if (marker) map.removeLayer(marker);
                markersRef.current.delete(id);
                markerAnimationRef.current.delete(id);
            }
        });

        // Add/Update markers
        allEntities.forEach(entity => {
            const { id, location, type, status, name, vehicle } = entity;
            const latLng = new L.LatLng(location.lat, location.lon);
            const icon = createIcon(type === 'ambulance' ? 'ambulance' : status || type);

            let marker = markersRef.current.get(id);
            if (marker) {
                const currentPos = marker.getLatLng();
                if (!currentPos.equals(latLng)) {
                    markerAnimationRef.current.set(id, { startPos: currentPos, targetPos: latLng, startTime: performance.now() });
                }
                marker.setIcon(icon);
            } else {
                marker = L.marker(latLng, { icon }).addTo(map);
                markersRef.current.set(id, marker);
            }
             if(props.enableCursorTooltip){
              marker.bindTooltip(`<b>${name}</b><br>${vehicle || type}`);
            }
        });

         if (markerAnimationRef.current.size > 0 && !animationFrameRef.current) {
            startAnimationLoop();
        }

    }, [props.activePartners, props.activeRiders, props.enableCursorTooltip, startAnimationLoop]);


    // Effect for the cursor tooltip on admin map
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !props.enableCursorTooltip) return;
        const L = require('leaflet');

        if (!cursorTooltipRef.current) {
            cursorTooltipRef.current = L.tooltip({
                permanent: false,
                direction: 'right',
                offset: [10, 0],
                className: 'cursor-tooltip'
            });
        }
        
        const updateTooltip = (e: L.LeafletMouseEvent) => {
            const allEntities = [...(props.activePartners || []), ...(props.activeRiders || [])];
            if (allEntities.length === 0) {
                 cursorTooltipRef.current?.setLatLng(e.latlng).setContent('No active entities nearby.').addTo(map);
                return
            };

            const nearbyDrivers = allEntities.filter(p => p.type === 'driver' && e.latlng.distanceTo([p.location.lat, p.location.lon]) < 5000).length;
            const nearbyMechanics = allEntities.filter(p => p.type === 'mechanic' && e.latlng.distanceTo([p.location.lat, p.location.lon]) < 5000).length;
            const nearbyRiders = allEntities.filter(p => p.type === 'rider' && e.latlng.distanceTo([p.location.lat, p.location.lon]) < 5000).length;
            const nearbyAmbulances = allEntities.filter(p => p.type === 'ambulance' && e.latlng.distanceTo([p.location.lat, p.location.lon]) < 5000).length;

            const content = `
                <div style="font-weight: bold; margin-bottom: 5px;">Nearby (5km):</div>
                <div style="display: flex; align-items: center; gap: 5px;">🚗 <strong>${nearbyDrivers}</strong> Drivers</div>
                <div style="display: flex; align-items: center; gap: 5px;">🔧 <strong>${nearbyMechanics}</strong> Mechanics</div>
                <div style="display: flex; align-items: center; gap: 5px;">🚑 <strong>${nearbyAmbulances}</strong> Ambulances</div>
                <div style="display: flex; align-items: center; gap: 5px;">👤 <strong>${nearbyRiders}</strong> Riders</div>
            `;
            
            cursorTooltipRef.current?.setLatLng(e.latlng).setContent(content).addTo(map);
        };

        map.on('mousemove', updateTooltip);

        return () => {
            map.off('mousemove', updateTooltip);
        };
    }, [props.enableCursorTooltip, props.activePartners, props.activeRiders, props]);


    return (
        <div id="map-container" className="w-full h-full z-0" ref={mapContainerRef}></div>
    );
});

LiveMap.displayName = 'LiveMap';
export default LiveMap;
    