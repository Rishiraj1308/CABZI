
'use client'

import React, { useState, useEffect, createContext, useContext, useRef, type ReactNode } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { type User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, serverTimestamp, getDocs, GeoPoint, onSnapshot } from 'firebase/firestore';
import { errorEmitter, FirestorePermissionError } from '@/lib/error-handling';

// --- START: CONTEXT DEFINITION ---
export interface UserSession {
  name: string;
  phone: string;
  gender: string;
  userId: string;
  role: string;
  partnerId?: string;
}

export interface UserContextType {
  session: UserSession | null;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType | null>(null);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a ClientSessionProvider');
  }
  return context;
}
// --- END: CONTEXT DEFINITION ---


export function ClientSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<UserSession | null>(null);
  const { user, isUserLoading: isAuthLoading, db, auth } = useFirebase();
  const userDocRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) {
      return; 
    }

    if (!user) {
      setSession(null);
      return;
    }

    const phone = user.phoneNumber?.slice(3);
    const email = user.email;

    if (!db || (!phone && !email)) {
      return;
    }
    
    const identifierField = email ? 'email' : 'phone';
    const identifierValue = email || phone;
    
    if (!identifierValue) {
        return;
    }
    
    const collectionsToSearch = ['users', 'partners', 'mechanics', 'ambulances', 'ambulanceDrivers', 'doctors'];
    let unsubscribe: (() => void) | null = null;

    const findUserAndListen = async () => {
        for (const collectionName of collectionsToSearch) {
            const q = query(collection(db, collectionName), where(identifierField, "==", identifierValue), limit(1));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                
                unsubscribe = onSnapshot(userDoc.ref, (docSnap) => {
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        const userRole = collectionName === 'users' ? 'user' : userData.type || collectionName.replace(/s$/, '');

                        const sessionData: UserSession = {
                            phone: userData.phone,
                            name: userData.name,
                            gender: userData.gender,
                            userId: userDoc.id,
                            role: userRole,
                            partnerId: collectionName !== 'users' ? userDoc.id : undefined,
                        };
                        setSession(sessionData);
                        localStorage.setItem('cabzi-session', JSON.stringify(sessionData));
                        userDocRef.current = docSnap.ref;
                    }
                });
                return; // Exit after finding the user and setting up listener
            }
        }
        
        // If user not found in any collection after checking all
        const path = window.location.pathname;
        if (!path.startsWith('/login') && !path.startsWith('/home') && path !== '/' && !path.startsWith('/partner-hub')) {
            auth?.signOut().then(() => {
                localStorage.removeItem('cabzi-session');
                router.push('/login');
            });
        }
    };

    findUserAndListen();

    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };

  }, [user, isAuthLoading, db, auth, router]);

   // Effect for location tracking
  useEffect(() => {
    if (!session || !db || !userDocRef.current) return;
    
    let watchId: number | undefined;
    let lastSentLocation: { lat: number; lon: number } | null = null;
    const MIN_DISTANCE_THRESHOLD = 50; // meters
    const MIN_TIME_THRESHOLD = 30000; // 30 seconds
    let lastSentTime = 0;

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // in metres
    }

    if(navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                const now = Date.now();
                if (userDocRef.current) {
                    const distanceMoved = lastSentLocation ? getDistance(lastSentLocation.lat, lastSentLocation.lon, newLocation.lat, newLocation.lon) : Infinity;

                    if (distanceMoved > MIN_DISTANCE_THRESHOLD || now - lastSentTime > MIN_TIME_THRESHOLD) {
                        const updateData = {
                          currentLocation: new GeoPoint(newLocation.lat, newLocation.lon),
                          lastSeen: serverTimestamp()
                        };
                        updateDoc(userDocRef.current, updateData).catch(e => {
                            const fpe = new FirestorePermissionError({
                                path: userDocRef.current.path,
                                operation: 'update',
                                requestResourceData: updateData
                            });
                            errorEmitter.emit('permission-error', fpe);
                        });
                        lastSentLocation = newLocation;
                        lastSentTime = now;
                    }
                }
            },
            () => {},
            { enableHighAccuracy: true }
        );
    }
    
    const handleBeforeUnload = () => {
        if (userDocRef.current) {
             const statusField = session.role === 'mechanic' ? 'isAvailable' : 'isOnline';
             updateDoc(userDocRef.current, { [statusField]: false, currentLocation: null });
        }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session, db]);

  return (
      <UserContext.Provider value={{ session, isLoading: isAuthLoading }}>
          {children}
          <Toaster />
      </UserContext.Provider>
  );
}
