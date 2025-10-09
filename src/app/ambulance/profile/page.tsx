
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Hospital, KeyRound } from 'lucide-react'

interface AmbulanceDriverData {
    name: string;
    phone: string;
    partnerId: string;
    hospitalName: string;
}

export default function AmbulanceProfilePage() {
    const [driverData, setDriverData] = useState<AmbulanceDriverData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (!db) return;
        const session = localStorage.getItem('cabzi-ambulance-session');
        if (session) {
            const { partnerId } = JSON.parse(session);
            const q = query(collection(db, "ambulanceDrivers"), where("partnerId", "==", partnerId));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!querySnapshot.empty) {
                    setDriverData(querySnapshot.docs[0].data() as AmbulanceDriverData);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not find your profile.' });
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching driver profile:", error);
                setIsLoading(false);
            });
            return () => unsubscribe();
        } else {
            setIsLoading(false);
        }
    }, [toast]);

    const getInitials = (name: string) => {
        if (!name) return 'D';
        const names = name.split(' ');
        return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
    }
    
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 border-2 border-primary">
                            <AvatarImage src="https://placehold.co/100x100.png" alt={driverData?.name} data-ai-hint="paramedic portrait"/>
                            <AvatarFallback>{getInitials(driverData?.name || '').toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl">{driverData?.name}</CardTitle>
                            <CardDescription>Partner ID: {driverData?.partnerId}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Contact Number</Label>
                            <Input value={driverData?.phone} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Assigned Hospital</Label>
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <Hospital className="w-4 h-4 text-muted-foreground"/>
                                <span className="font-semibold">{driverData?.hospitalName}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary"/> Security</CardTitle>
                    <CardDescription>Manage your account password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full" onClick={() => toast({ title: 'Coming Soon!' })}>Change Password</Button>
                </CardContent>
            </Card>
        </div>
    );
}
