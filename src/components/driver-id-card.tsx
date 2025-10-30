
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from './ui/badge'
import { CheckCircle, Landmark } from 'lucide-react'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { Skeleton } from './ui/skeleton'

interface PartnerData {
    name: string;
    phone: string;
    partnerId: string;
    curocityBankAccountNumber: string;
    vehicleType: string;
    vehicleName: string;
    vehicleNumber: string;
    photoUrl?: string; // Add photoUrl
    // ... other fields
}

export default function DriverIdCard() {
    const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const db = useDb();

    useEffect(() => {
        const session = localStorage.getItem('curocity-session');
        if (session && db) {
            const { phone } = JSON.parse(session);
            const partnersRef = collection(db, "partners");
            const q = query(partnersRef, where("phone", "==", phone));

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    setPartnerData(doc.data() as PartnerData);
                }
                setIsLoading(false);
            });

            return () => unsubscribe();
        } else {
            setIsLoading(false);
        }
    }, [db]);

    const getInitials = (name: string) => {
        if (!name) return 'D';
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2);
    }
    
    if (isLoading) {
        return (
             <Card className="bg-gradient-to-br from-primary via-primary/90 to-black p-0.5 shadow-2xl">
                <div className="bg-background rounded-lg p-6">
                   <div className="flex flex-col md:flex-row gap-6">
                        <Skeleton className="w-24 h-24 rounded-full" />
                        <div className="flex-1 space-y-4">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-5 w-32" />
                            <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                 <Skeleton className="h-4 w-24" />
                                 <Skeleton className="h-5 w-36" />
                               </div>
                               <div className="space-y-2">
                                 <Skeleton className="h-4 w-16" />
                                 <Skeleton className="h-5 w-28" />
                               </div>
                            </div>
                        </div>
                    </div>
                </div>
             </Card>
        )
    }

  return (
    <Card className="p-0.5 shadow-2xl relative overflow-hidden">
         <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-primary via-primary/50 to-accent animate-[spin_10s_linear_infinite]"></div>
        <div className="relative bg-background rounded-lg p-6">
            <div className="flex flex-col md:flex-row gap-6">
                <Avatar className="w-24 h-24 border-4 border-accent">
                    <AvatarImage src={partnerData?.photoUrl || `https://placehold.co/100x100.png`} alt={partnerData?.name || 'Driver'} />
                    <AvatarFallback>{getInitials(partnerData?.name || '').toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-bold">{partnerData?.name || 'Loading...'}</h3>
                            <p className="text-muted-foreground font-mono text-xs">Partner ID: {partnerData?.partnerId || 'CZ-DXXXXXX'}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/40 dark:text-green-200">
                           <CheckCircle className="w-4 h-4 mr-2"/> Verified Partner
                        </Badge>
                    </div>
                     <div className="mt-4 border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                         <div>
                            <p className="text-muted-foreground flex items-center gap-1"><Landmark className="w-4 h-4" /> Curocity Bank A/C No.</p>
                            <p className="font-semibold font-mono">{partnerData?.curocityBankAccountNumber || '11xxxxxxxxxx'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Vehicle</p>
                            <p className="font-semibold capitalize">{partnerData?.vehicleName} ({partnerData?.vehicleType?.replace('-', ' ')})</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Card>
  )
}
