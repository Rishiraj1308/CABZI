
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Stethoscope, Briefcase, BadgeCheck, Hospital, Clock, Settings, Bell, KeyRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { TimePicker } from '@/components/ui/time-picker'

interface DoctorProfileData {
    id: string;
    name: string;
    phone: string;
    partnerId: string;
    hospitalName: string;
    specialization: string;
    qualifications: string;
    experience: string;
    isAvailable: boolean;
    weeklyAvailability?: Record<string, { available: boolean, start: string, end: string }>;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


export default function DoctorProfilePage() {
    const [profile, setProfile] = useState<DoctorProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [availability, setAvailability] = useState<Record<string, { available: boolean, start: string, end: string }>>({});
    const { toast } = useToast();
    const db = useDb();
    
    useEffect(() => {
        if (!db) return;
        const session = localStorage.getItem('cabzi-doctor-session');
        if (session) {
            const { partnerId, hospitalId } = JSON.parse(session);

            if (!hospitalId || !partnerId) {
                toast({ variant: 'destructive', title: 'Error', description: 'Session is invalid.' });
                setIsLoading(false);
                return;
            }

            const doctorsCollectionRef = collection(db, `ambulances/${hospitalId}/doctors`);
            const q = query(doctorsCollectionRef, where("partnerId", "==", partnerId));
            
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!querySnapshot.empty) {
                    const docSnap = querySnapshot.docs[0];
                    const data = docSnap.data() as DoctorProfileData
                     setProfile({ id: docSnap.id, ...data });

                     // Initialize availability state
                    const initialAvailability: Record<string, { available: boolean, start: string, end: string }> = {};
                    daysOfWeek.forEach(day => {
                        initialAvailability[day] = data.weeklyAvailability?.[day] || { available: false, start: '09:00', end: '17:00' };
                    });
                    setAvailability(initialAvailability);

                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not find your profile.' });
                }
                setIsLoading(false);
            }, (error) => {
                 console.error("Error fetching doctor profile:", error);
                 setIsLoading(false);
            });

            return () => unsubscribe();
        } else {
            setIsLoading(false);
        }
    }, [toast, db]);

    const handleAvailabilityChange = (day: string, field: 'available' | 'start' | 'end', value: boolean | string) => {
        setAvailability(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value
            }
        }));
    };

    const handleSaveAvailability = async () => {
        if (!profile || !db) return;
        const session = localStorage.getItem('cabzi-doctor-session');
        if (!session) return;
        const { hospitalId } = JSON.parse(session);

        const doctorRef = doc(db, `ambulances/${hospitalId}/doctors`, profile.id);
        try {
            await updateDoc(doctorRef, { weeklyAvailability: availability });
            toast({ title: "Availability Saved", description: "Your weekly schedule has been updated." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not update your schedule." });
        }
    }

    const getInitials = (name: string) => {
        if (!name) return 'Dr';
        const names = name.split(' ');
        return names.length > 1 ? `Dr. ${names[names.length - 1][0]}` : `Dr. ${name.substring(0, 1)}`;
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
    
    if (!profile) {
        return (
             <div className="flex items-center justify-center h-full">
                <Card className="max-w-md text-center p-8">
                     <CardTitle>Profile Not Found</CardTitle>
                     <CardDescription>We couldn't load your profile details. Please try logging in again.</CardDescription>
                </Card>
             </div>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Profile & Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Avatar className="w-24 h-24 border-4 border-primary">
                                <AvatarImage src="https://i.pravatar.cc/100?u=doctor-profile" alt={profile.name} data-ai-hint="doctor portrait"/>
                                <AvatarFallback>{getInitials(profile.name).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="pt-2">
                                <CardTitle className="text-2xl">Dr. {profile.name}</CardTitle>
                                <CardDescription>Partner ID: {profile.partnerId}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                                <Hospital className="w-4 h-4 text-muted-foreground"/>
                                <span className="font-semibold">{profile.hospitalName}</span>
                            </div>
                             <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                                <Briefcase className="w-4 h-4 text-muted-foreground"/>
                                <span className="font-semibold">{profile.experience} years of experience</span>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="w-5 h-5"/> Security</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full" onClick={() => toast({ title: 'Coming Soon!' })}>Change Password</Button>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary"/> Manage Weekly Availability</CardTitle>
                            <CardDescription>Set your working hours for the week. This will determine when you appear for new appointment bookings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {daysOfWeek.map(day => (
                               <div key={day} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-3 border rounded-lg bg-muted/50">
                                   <div className="flex items-center gap-3">
                                       <Switch 
                                         id={`avail-${day}`} 
                                         checked={availability[day]?.available} 
                                         onCheckedChange={(checked) => handleAvailabilityChange(day, 'available', checked)}
                                       />
                                       <Label htmlFor={`avail-${day}`} className="font-semibold w-24">{day}</Label>
                                   </div>
                                   <div className="flex items-center gap-2 flex-1">
                                       <Input 
                                          type="time" 
                                          value={availability[day]?.start}
                                          onChange={e => handleAvailabilityChange(day, 'start', e.target.value)}
                                          disabled={!availability[day]?.available}
                                          className="bg-background"
                                       />
                                       <span>-</span>
                                       <Input 
                                          type="time"
                                          value={availability[day]?.end}
                                          onChange={e => handleAvailabilityChange(day, 'end', e.target.value)}
                                          disabled={!availability[day]?.available}
                                          className="bg-background"
                                       />
                                   </div>
                               </div>
                           ))}
                        </CardContent>
                         <CardFooter>
                            <Button onClick={handleSaveAvailability}>Save Schedule</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
