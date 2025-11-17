
'use client'

import { useState, useEffect } from 'react'
import { useDb } from '@/lib/firebase/client-provider'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'

export interface TodayPartner {
  id: string;
  type: 'driver' | 'mechanic' | 'cure';
  name: string;
  createdAt: Timestamp;
}

export interface OngoingActivity {
  id: string;
  type: 'Ride' | 'Service' | 'Emergency';
  customerName: string;
  partnerName?: string;
  status: string;
  timestamp: Timestamp;
}

export function useLiveFeed() {
  const db = useDb();
  const [todayPartners, setTodayPartners] = useState<TodayPartner[]>([]);
  const [ongoingActivities, setOngoingActivities] = useState<OngoingActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const unsubs: (() => void)[] = [];
    const partnerCollections = [
      { name: 'pathPartners', type: 'driver' },
      { name: 'mechanics', type: 'mechanic' },
      { name: 'curePartners', type: 'cure' }
    ] as const;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    // Set up listeners for today's signups
    partnerCollections.forEach(({ name, type }) => {
      const q = query(collection(db, name), where('createdAt', '>=', todayTimestamp));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newSignups = snapshot.docs.map(doc => ({
          id: doc.id,
          type,
          ...doc.data()
        } as TodayPartner));
        
        setTodayPartners(prev => {
            const others = prev.filter(p => p.type !== type);
            return [...others, ...newSignups].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        });
      });
      unsubs.push(unsubscribe);
    });

    // Set up listeners for ongoing activities
    const activityConfigs = [
        { col: 'rides', statuses: ['accepted', 'in-progress'], type: 'Ride', customerField: 'riderName', partnerField: 'driverName' },
        { col: 'garageRequests', statuses: ['accepted', 'in_progress'], type: 'Service', customerField: 'driverName', partnerField: 'mechanicName' },
        { col: 'emergencyCases', statuses: ['accepted', 'onTheWay', 'inTransit'], type: 'Emergency', customerField: 'riderName', partnerField: 'assignedPartner.name' }
    ] as const;

    activityConfigs.forEach(({ col, statuses, type, customerField, partnerField }) => {
        const q = query(collection(db, col), where('status', 'in', statuses));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newActivities = snapshot.docs.map(doc => {
                const data = doc.data();
                // Basic way to get nested property
                const partnerName = partnerField.split('.').reduce((o, i) => o?.[i], data);
                return {
                    id: doc.id,
                    type,
                    customerName: data[customerField],
                    partnerName: partnerName,
                    status: data.status,
                    timestamp: data.createdAt,
                } as OngoingActivity
            });
            setOngoingActivities(prev => {
                const others = prev.filter(act => act.type !== type);
                return [...others, ...newActivities].sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis());
            });
        });
        unsubs.push(unsubscribe);
    });
    
    setIsLoading(false);

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [db]);

  return { todayPartners, ongoingActivities, isLoading };
}
