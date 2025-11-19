
'use client'

import { useEffect } from 'react';
import { useFirebase } from '@/lib/firebase/client-provider';
import { doc, updateDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { toast } from 'sonner';
import { useDriver } from '@/app/(dashboard)/driver/ClientLayout';

export const useDriverLocation = () => {
    const { db } = useFirebase();
    const { partnerData } = useDriver();
    const partnerId = partnerData?.id;
    const isOnline = partnerData?.isOnline;

    useEffect(() => {
        let watchId: number | null = null;
        let heartbeatInterval: NodeJS.Timeout | null = null;
        
        if (isOnline && partnerId && db) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = new GeoPoint(latitude, longitude);
                    
                    const partnerRef = doc(db, 'pathPartners', partnerId);
                    updateDoc(partnerRef, {
                        currentLocation: newLocation,
                        lastSeen: serverTimestamp()
                    }).catch(error => {
                        console.warn("Failed to update live location (non-critical):", error);
                    });
                },
                (error) => {
                    console.error("Geolocation watch error:", error);
                    if (error.code === error.PERMISSION_DENIED) {
                        toast.error("Location Access Denied", { description: "Please enable location access to go online." });
                        if (partnerId && db) {
                            updateDoc(doc(db, 'pathPartners', partnerId), { isOnline: false });
                        }
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );

            // Send a heartbeat every 60 seconds to keep `lastSeen` updated even if location doesn't change
            heartbeatInterval = setInterval(() => {
                updateDoc(doc(db, 'pathPartners', partnerId), { lastSeen: serverTimestamp() }).catch(error => {
                    console.warn("Heartbeat update failed (non-critical):", error);
                });
            }, 60000);

        }

        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
        };
    }, [isOnline, partnerId, db]);
};
