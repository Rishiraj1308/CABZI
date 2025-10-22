
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
  role: string; // Add role to session
}

export interface UserContextType {
  session: UserSession | null;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType | null>(null);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserLayout or ClientSessionProvider');
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
    
    const identifierField = phone ? 'phone' : 'email';
    const identifierValue = phone || email;

    if (!identifierValue) {
        return;
    }
    
    // Check all relevant collections
    const collectionsToSearch = ['users', 'partners', 'mechanics', 'ambulances'];
    let unsubscribe: () => void = () => {};

    const findUser = async () => {
        for (const collectionName of collectionsToSearch) {
            const q = query(collection(db, collectionName), where(identifierField, '==', identifierValue));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();
                const userRole = collectionName === 'users' ? 'user' : userData.type || collectionName.slice(0,-1);

                const sessionData: UserSession = {
                    phone: userData.phone,
                    name: userData.name,
                    gender: userData.gender,
                    userId: userDoc.id,
                    role: userRole,
                };
                setSession(sessionData);
                localStorage.setItem('cabzi-session', JSON.stringify(sessionData));
                userDocRef.current = doc(db, collectionName, userDoc.id);
                return; // Exit after finding the user
            }
        }
        // If user not found in any collection, they might be new
        const path = window.location.pathname;
        if (!path.startsWith('/login') && !path.startsWith('/home') && path !== '/') {
            auth?.signOut();
            router.push('/login');
        }
    };

    findUser();

    // Setup snapshot listener if a user is found
    if(userDocRef.current) {
        unsubscribe = onSnapshot(userDocRef.current, (doc) => {
            // Can update session with real-time data if needed
        });
    }

    return () => unsubscribe();

  }, [user, isAuthLoading, db, auth, router]);

  return (
      <UserContext.Provider value={{ session, isLoading: isAuthLoading }}>
          {children}
          <Toaster />
      </UserContext.Provider>
  );
}
