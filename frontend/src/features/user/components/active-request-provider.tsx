
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useFirebase } from '@/lib/firebase/client-provider';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { RideData, GarageRequest, AmbulanceCase } from '@/lib/types';
import RideStatus from './ride/RideStatusSheet';
import { toast } from 'sonner';

interface ActiveRequestContextType {
  activeRide: RideData | null;
  activeGarageRequest: GarageRequest | null;
  activeAmbulanceCase: AmbulanceCase | null;
  isLoading: boolean;
}

const ActiveRequestContext = createContext<ActiveRequestContextType>({
  activeRide: null,
  activeGarageRequest: null,
  activeAmbulanceCase: null,
  isLoading: true,
});

export const useActiveRequest = () => useContext(ActiveRequestContext);

export const ActiveRequestProvider = ({ children }: { children: ReactNode }) => {
  const { user, db, isUserLoading } = useFirebase();
  const [activeRide, setActiveRide] = useState<RideData | null>(null);
  const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
  const [activeAmbulanceCase, setActiveAmbulanceCase] = useState<AmbulanceCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resetAll = useCallback(() => {
    setActiveRide(null);
    setActiveGarageRequest(null);
    setActiveAmbulanceCase(null);
    localStorage.removeItem('activeRideId');
    localStorage.removeItem('activeGarageRequestId');
    localStorage.removeItem('activeAmbulanceCaseId');
  }, []);

  useEffect(() => {
    if (isUserLoading || !user || !db) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    const userId = user.uid;

    const setupListener = (collectionName: string, stateSetter: (data: any) => void, toastTitle: string) => {
      const q = query(
        collection(db, collectionName),
        where(collectionName === 'garageRequests' ? 'userId' : 'riderId', "==", userId),
        where("status", "not-in", ["completed", "cancelled_by_rider", "cancelled_by_driver", "cancelled_by_user", "cancelled_by_mechanic"])
      );
      
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = { id: doc.id, ...doc.data() };
          
          stateSetter((prev: any) => {
             if (prev?.status !== 'accepted' && data.status === 'accepted') {
                toast.success(toastTitle, { description: `A partner is on the way.` });
             }
             return data;
          });
          
        } else {
          stateSetter(null);
        }
      });
      unsubs.push(unsub);
    };

    setupListener('rides', setActiveRide, "Ride Accepted!");
    setupListener('garageRequests', setActiveGarageRequest, "Mechanic Assigned!");
    setupListener('emergencyCases', setActiveAmbulanceCase, "Ambulance Dispatched!");

    setIsLoading(false);
    return () => unsubs.forEach(unsub => unsub());

  }, [user, db, isUserLoading]);
  
  const handleCancel = async (type: 'ride' | 'garage' | 'ambulance') => {
      if (!db) return;
      let ref;
      let newStatus;
      
      if(type === 'ride' && activeRide) {
          ref = doc(db, 'rides', activeRide.id);
          newStatus = 'cancelled_by_rider';
      } else if (type === 'garage' && activeGarageRequest) {
          ref = doc(db, 'garageRequests', activeGarageRequest.id);
          newStatus = 'cancelled_by_user';
      } else if (type === 'ambulance' && activeAmbulanceCase) {
          ref = doc(db, 'emergencyCases', activeAmbulanceCase.id);
          newStatus = 'cancelled_by_rider';
      }

      if (ref && newStatus) {
          try {
              await updateDoc(ref, { status: newStatus });
              toast.error('Request Cancelled');
              resetAll();
          } catch {
              toast.error('Cancellation Failed');
          }
      }
  }

  const activeRequest = activeRide || activeGarageRequest || activeAmbulanceCase;

  if (isLoading) {
    return <div className="h-screen w-screen bg-background" />; // Or a global loader
  }

  if (activeRequest) {
    return (
        <div className="h-screen w-screen flex items-center justify-center p-4">
            <RideStatus
                ride={(activeRequest as any)}
                isGarageRequest={!!activeGarageRequest}
                isAmbulanceCase={!!activeAmbulanceCase}
                onCancel={() => handleCancel(activeRide ? 'ride' : activeGarageRequest ? 'garage' : 'ambulance')}
                onDone={resetAll}
            />
        </div>
    );
  }


  return (
    <ActiveRequestContext.Provider value={{ activeRide, activeGarageRequest, activeAmbulanceCase, isLoading }}>
      {children}
    </ActiveRequestContext.Provider>
  );
};
