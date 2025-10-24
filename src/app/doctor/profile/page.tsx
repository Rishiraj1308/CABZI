
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Stethoscope, Briefcase, BadgeCheck, Hospital, Clock, Settings, Bell, KeyRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

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
}

export default function DoctorProfilePage() {
    const [profile, setProfile] = useState<DoctorProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const db = useDb();
    
    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }
        const session = localStorage.getItem('cabzi-doctor-session');
        if (session) {
            const { partnerId, hospitalId } = JSON.parse(session);

            if (!hospitalId || !partnerId) {
                toast({ variant: 'destructive', title: 'Error', description: 'Session is invalid. Could not find hospital or partner ID.' });
                setIsLoading(false);
                return;
            }

            const doctorsCollectionRef = collection(db, `ambulances/${hospitalId}/doctors`);
            const q = query(doctorsCollectionRef, where("partnerId", "==", partnerId));
            
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!querySnapshot.empty) {
                    const docSnap = querySnapshot.docs[0];
                     setProfile({
                        id: docSnap.id,
                        ...docSnap.data()
                    } as DoctorProfileData);
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

    const handleAvailabilityToggle = async (isAvailable: boolean) => {
        if (!profile || !db) return;
        
        const session = localStorage.getItem('cabzi-doctor-session');
        if (!session) return;
        const { hospitalId } = JSON.parse(session);
        
        const doctorRef = doc(db, `ambulances/${hospitalId}/doctors`, profile.id);
        try {
            await updateDoc(doctorRef, { isAvailable });
            setProfile(prev => prev ? { ...prev, isAvailable } : null);
            toast({
                title: isAvailable ? 'You are now Online' : 'You are now Offline',
                description: isAvailable ? 'You will now appear for new appointment bookings.' : 'You will not be visible for new bookings.',
            });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Update Failed' });
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
        <div className="grid gap-6">
            <h2 className="text-3xl font-bold tracking-tight">My Professional Profile</h2>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 border-2 border-primary">
                            <AvatarImage src="https://i.pravatar.cc/100?u=doctor-profile" alt={profile.name} data-ai-hint="doctor portrait"/>
                            <AvatarFallback>{getInitials(profile.name).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl">Dr. {profile.name}</CardTitle>
                            <CardDescription>Partner ID: {profile.partnerId}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Contact Number</Label>
                            <Input value={profile.phone} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Primary Hospital</Label>
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-md h-10">
                                <Hospital className="w-4 h-4 text-muted-foreground"/>
                                <span className="font-semibold">{profile.hospitalName}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary"/> Availability &amp; Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <Label htmlFor="availability-switch" className="font-semibold text-lg">My Availability</Label>
                            <p className="text-sm text-muted-foreground">Toggle this to appear for new appointment bookings.</p>
                        </div>
                        <Switch id="availability-switch" checked={profile.isAvailable} onCheckedChange={handleAvailabilityToggle} />
                    </div>
                    <Button variant="outline" className="w-full">
                        <Clock className="mr-2 h-4 w-4"/>
                        Manage My Working Hours &amp; Schedule
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary"/> Professional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-3 rounded-lg border flex justify-between items-center bg-muted/50">
                        <Label className="font-semibold flex items-center gap-2"><Stethoscope/>Specialization</Label>
                        <Badge variant="secondary" className="text-base">{profile.specialization}</Badge>
                    </div>
                     <div className="p-3 rounded-lg border flex justify-between items-center bg-muted/50">
                        <Label className="font-semibold flex items-center gap-2"><BadgeCheck/>Qualifications</Label>
                        <span className="font-medium">{profile.qualifications}</span>
                    </div>
                     <div className="p-3 rounded-lg border flex justify-between items-center bg-muted/50">
                        <Label className="font-semibold flex items-center gap-2"><Briefcase/>Experience</Label>
                        <span className="font-medium">{profile.experience} years</span>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button variant="outline">Update My Profile (Requires Admin Approval)</Button>
                </CardFooter>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary"/> Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="new-appointment-notif">New Appointment Requests</Label>
                        <Switch id="new-appointment-notif" defaultChecked />
                    </div>
                     <div className="flex items-center justify-between">
                        <Label htmlFor="cancellation-notif">Cancellations &amp; Reschedules</Label>
                        <Switch id="cancellation-notif" defaultChecked />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary"/> Security</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full">Change Password</Button>
                </CardContent>
            </Card>
        </div>
    );
}
