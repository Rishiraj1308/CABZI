'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, ShieldAlert, X } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/lib/firebase/client-provider';
import type { RideData } from '@/lib/types';
import { getDriverToPickupRoute } from '@/lib/osrm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

// ✅ driver icon
const driverIcon = L.divIcon({
  html: `<div style="background:#0ea5e9;border:2px solid white;width:18px;height:18px;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,.35)"></div>`,
  iconSize: [18, 18],
  className: '',
});

// ✅ pickup icon
const pickupIcon = L.divIcon({
  html: `<div style="background:#10b981;border:2px solid white;width:18px;height:18px;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,.35)"></div>`,
  iconSize: [18, 18],
  className: '',
});

// ✅ FitBounds for route auto-zoom
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

export default function DriverArriving() {
  const { db } = useFirebase();

  const [ride, setRide] = useState<RideData | null>(null);
  const [driver, setDriver] = useState<any>(null);

  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [distKm, setDistKm] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isCancelling, setIsCancelling] = useState(false);

  const mapRef = useRef<any>(null);

  // ✅ read rideId from localStorage
  const rideId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('activeRideId') || '';
  }, []);

  // ✅ listen ride doc
  useEffect(() => {
    if (!db || !rideId) return;

    const unsub = onSnapshot(doc(db, 'rides', rideId), (snap) => {
      if (!snap.exists()) return;

      const r = { id: snap.id, ...snap.data() } as RideData;
      setRide(r);

      // ✅ fix "possibly undefined"
      if (r.driverDetails) {
        setDriver((prev: any) => ({
          ...prev,
          name: r.driverDetails?.name ?? prev?.name,
          phone: r.driverDetails?.phone ?? prev?.phone,
          vehicle: r.driverDetails?.vehicle ?? prev?.vehicle,
          vehicleNumber: r.vehicleNumber ?? prev?.vehicleNumber,
        }));
      }
    });

    return () => unsub();
  }, [db, rideId]);

  // ✅ listen driver live location: pathPartners/{driverId}
  useEffect(() => {
    if (!db || !ride?.driverId) return;

    const unsub = onSnapshot(doc(db, 'pathPartners', ride.driverId), (snap) => {
      const d = snap.data();
      const loc = d?.currentLocation;

      setDriver((prev: any) => ({
        name: prev?.name ?? d?.name,
        phone: prev?.phone ?? d?.phone,
        vehicle: prev?.vehicle ?? `${d?.vehicleBrand || ''} ${d?.vehicleName || ''}`.trim(),
        vehicleNumber: prev?.vehicleNumber ?? d?.vehicleNumber,
        lat: loc?.latitude,
        lon: loc?.longitude,
      }));
    });

    return () => unsub();
  }, [db, ride?.driverId]);

  // ✅ compute route + ETA every 10 sec
  async function computeRoute() {
    try {
      if (!ride?.pickup?.location || !driver?.lat || !driver?.lon) return;

      const res = await getDriverToPickupRoute(
        { lat: driver.lat, lon: driver.lon },
        { lat: ride.pickup.location.latitude, lon: ride.pickup.location.longitude }
      );

      if (!res) return;

      setEtaMin(Math.max(1, Math.round(res.durationMin)));
      setDistKm(Number(res.distanceKm.toFixed(1)));
      setRouteCoords(res.coords);
    } catch {}
  }

  // run computeRoute on location change
  useEffect(() => {
    computeRoute();
  }, [driver?.lat, driver?.lon, ride?.pickup?.location]);

  // run computeRoute every 10 sec
  useEffect(() => {
    const t = setInterval(() => computeRoute(), 10000);
    return () => clearInterval(t);
  }, [ride?.id]);

  // ✅ cancel ride
  async function cancelRide() {
    if (!db || !ride) return;

    setIsCancelling(true);
    try {
      await updateDoc(doc(db, 'rides', ride.id), { status: 'cancelled_by_rider' });
      toast('Ride cancelled');
      localStorage.removeItem('activeRideId');
    } catch {
      toast.error('Failed to cancel');
    } finally {
      setIsCancelling(false);
    }
  }

  if (!ride?.pickup?.location) return null;

  const pickupLat = ride.pickup.location.latitude;
  const pickupLon = ride.pickup.location.longitude;

  const driverName = driver?.name || ride.driverDetails?.name || 'Driver';
  const driverPhone = driver?.phone || ride.driverDetails?.phone || '';
  const driverVehicle = driver?.vehicle || ride.driverDetails?.vehicle || '';
  const driverVehicleNumber = driver?.vehicleNumber || ride.vehicleNumber || '';

  return (
    <div className="w-full h-full flex flex-col">

      {/* ✅ MAP */}
      <div className="relative h-[320px] w-full">
        <MapContainer
          whenReady={(e: any) => (mapRef.current = e.target)}
          center={[pickupLat, pickupLon]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />

          {routeCoords.length > 1 && (
            <>
              <Polyline positions={routeCoords} weight={5} color="#2563eb" opacity={0.8} />
              <FitBounds points={[...routeCoords, [pickupLat, pickupLon]]} />
            </>
          )}

          {driver?.lat && driver?.lon && (
            <Marker position={[driver.lat, driver.lon]} icon={driverIcon} />
          )}

          <Marker position={[pickupLat, pickupLon]} icon={pickupIcon} />
        </MapContainer>

        {/* ETA chip */}
        <div className="absolute top-3 left-3 rounded-full bg-white px-3 py-1 text-sm font-semibold shadow">
          {etaMin ? `Arriving in ~${etaMin} min` : 'Calculating ETA…'}
        </div>
      </div>

      {/* ✅ Bottom data */}
      <div className="p-4 space-y-3">

        <div className="text-center">
          <p className="text-sm text-muted-foreground">{driverVehicle}</p>
          <p className="text-xs text-muted-foreground">{driverVehicleNumber}</p>
        </div>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{driverName}</p>
              <p className="text-xs text-muted-foreground">
                ⭐ {ride.driverDetails?.rating ?? 5}
              </p>
            </div>

            <div className="text-2xl font-extrabold tracking-[0.25em]">
              {ride.otp || '----'}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted p-2">
            <p className="text-xs text-muted-foreground">Pickup ETA</p>
            <p className="font-bold">{etaMin ? `~${etaMin} min` : '...'}</p>
          </div>

          <div className="rounded-md bg-muted p-2">
            <p className="text-xs text-muted-foreground">To Pickup</p>
            <p className="font-bold">{distKm ? `~${distKm} km` : '...'}</p>
          </div>

          <div className="rounded-md bg-muted p-2">
            <p className="text-xs text-muted-foreground">Trip ETA</p>
            <p className="font-bold">
              {ride.eta ? `~${Math.ceil(ride.eta)} min` : '...'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <a href={driverPhone ? `tel:${driverPhone}` : '#'}>
              <Phone className="w-4 h-4 mr-2" /> Call Driver
            </a>
          </Button>

          <Button
            variant="destructive"
            className="flex-1"
            onClick={cancelRide}
            disabled={isCancelling}
          >
            Cancel Ride
          </Button>
        </div>
      </div>
    </div>
  );
}
