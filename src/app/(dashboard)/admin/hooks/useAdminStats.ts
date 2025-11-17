
'use client'

import { useState, useEffect } from 'react'
import { useDb } from '@/lib/firebase/client-provider'
import { collection, query, where, getCountFromServer, onSnapshot } from 'firebase/firestore'

export interface AdminStats {
  totalPath: number;
  totalResq: number;
  totalCure: number;
  totalCustomers: number;
  pendingPartners: number;
  ongoingRides: number;
}

export function useAdminStats() {
  const db = useDb();
  const [stats, setStats] = useState<AdminStats>({
    totalPath: 0,
    totalResq: 0,
    totalCure: 0,
    totalCustomers: 0,
    pendingPartners: 0,
    ongoingRides: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const collectionsToWatch = [
      { name: 'pathPartners', key: 'totalPath' },
      { name: 'mechanics', key: 'totalResq' },
      { name: 'curePartners', key: 'totalCure' },
      { name: 'users', key: 'totalCustomers' },
    ] as const;

    const unsubs: (() => void)[] = [];

    // Listener for total counts
    collectionsToWatch.forEach(({ name, key }) => {
      const q = query(collection(db, name));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setStats(prev => ({ ...prev, [key]: snapshot.size }));
      }, (err) => console.error(`Error fetching ${name} count:`, err));
      unsubs.push(unsubscribe);
    });

    // Listener for pending partners
    const pendingCollections = ['pathPartners', 'mechanics', 'curePartners'];
    pendingCollections.forEach(colName => {
        const q = query(collection(db, colName), where('status', '==', 'pending_verification'));
        const unsubscribe = onSnapshot(q, async () => {
             // When any pending collection changes, refetch all pending counts
            let totalPending = 0;
            for (const c of pendingCollections) {
                 const countSnap = await getCountFromServer(query(collection(db, c), where('status', '==', 'pending_verification')));
                 totalPending += countSnap.data().count;
            }
            setStats(prev => ({...prev, pendingPartners: totalPending }));
        });
        unsubs.push(unsubscribe);
    });
    
    // Listener for ongoing rides
    const ongoingQueries = [
        query(collection(db, 'rides'), where('status', 'in', ['accepted', 'in-progress'])),
        query(collection(db, 'garageRequests'), where('status', 'in', ['accepted', 'in_progress'])),
        query(collection(db, 'emergencyCases'), where('status', 'in', ['accepted', 'onTheWay', 'inTransit'])),
    ];
    
    ongoingQueries.forEach(q => {
        const unsubscribe = onSnapshot(q, async () => {
            let totalOngoing = 0;
            for(const oq of ongoingQueries) {
                const countSnap = await getCountFromServer(oq);
                totalOngoing += countSnap.data().count;
            }
            setStats(prev => ({ ...prev, ongoingRides: totalOngoing }));
        });
        unsubs.push(unsubscribe);
    });


    // Initial load finished after setting up listeners
    // A more robust solution might use Promise.all for initial counts
    // but this is simpler for a live dashboard.
    setIsLoading(false);

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [db]);

  return { stats, isLoading };
}
