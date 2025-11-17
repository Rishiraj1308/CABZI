
'use client'

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, GeoPoint } from 'firebase/firestore';
import { useFirebase } from '@/lib/firebase/client-provider';
import type { RideData } from '@/lib/types';
import { useDriver } from '@/app/(dashboard)/driver/layout';
import { toast } from 'sonner';

export const useDriverListener = () => {
    const [jobRequest, setJobRequest] = useState<RideData | null>(null);
    const [activeRide, setActiveRide] = useState<RideData | null>(null);
    const { db } = useFirebase();
    const { partnerData } = useDriver();

    // Listener for new ride requests
    useEffect(() => {
        if (!db || !partnerData?.id || !partnerData.isOnline || !partnerData.vehicleType) {
            return;
        }

        const vehicleTypeBase = (partnerData.vehicleType || "").split(" ")[0].trim().toLowerCase();
        if (!vehicleTypeBase) return;

        const ridesQuery = query(collection(db, "rides"), where("status", "==", "searching"));

        const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
            const potentialRides: RideData[] = [];
            snapshot.forEach((doc) => {
                const ride = { id: doc.id, ...doc.data() } as RideData;
                const rideTypeForMatching = (ride.rideType || "").toLowerCase();

                if (!ride.rejectedBy?.includes(partnerData.id!) && rideTypeForMatching.startsWith(vehicleTypeBase)) {
                    potentialRides.push(ride);
                }
            });
            
            if (potentialRides.length > 0 && !jobRequest && !activeRide) {
                setJobRequest(potentialRides[0]);
            }
        });

        return () => unsubscribe();
    }, [db, partnerData, jobRequest, activeRide]);

    // Listener for active ride updates
    useEffect(() => {
        if (!db || !activeRide?.id) return;
        const unsub = onSnapshot(doc(db, 'rides', activeRide.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as RideData;
                setActiveRide({ id: docSnap.id, ...data });

                if (['completed', 'cancelled_by_rider', 'cancelled_by_driver'].includes(data.status)) {
                    toast.info(data.status === 'completed' ? 'Ride Completed' : 'Ride Cancelled');
                    setActiveRide(null);
                    localStorage.removeItem('activeRideId');
                }
            } else {
                setActiveRide(null);
                localStorage.removeItem('activeRideId');
            }
        });
        return () => unsub();
    }, [db, activeRide?.id]);
    
    // Check for active ride on initial load
    useEffect(() => {
        if (!db) return;
        const activeRideId = localStorage.getItem('activeRideId');
        if (activeRideId) {
            getDoc(doc(db, 'rides', activeRideId)).then(docSnap => {
                if (docSnap.exists()) {
                    setActiveRide({ id: docSnap.id, ...docSnap.data() } as RideData);
                } else {
                    localStorage.removeItem('activeRideId');
                }
            });
        }
    }, [db]);

    return { jobRequest, setJobRequest, activeRide, setActiveRide };
};
