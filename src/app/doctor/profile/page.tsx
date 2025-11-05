
'use client'

import * as React from "react"
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Stethoscope, Briefcase, Hospital, Settings, KeyRound, Calendar as CalendarIcon, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { type DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'


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
    photoUrl?: string;
    weeklyAvailability?: Record<string, { available: boolean, start: string, end: string }>;
    dateOverrides?: Record<string, { available: boolean, start?: string, end?: string }>;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


export default function DoctorProfilePage() {
    const [profile, setProfile] = useState<DoctorProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [availability, setAvailability] = useState<Record<string, { available: boolean, start: string, end: string }>>({});
    const [dateOverrides, setDateOverrides] = useState<Record<string, { available: boolean, start?: string, end?: string }>>({});
    const [selectedDates, setSelectedDates] = React.useState<DateRange | undefined>({
      from: new Date(),
      to: addDays(new Date(), 4),
    })

    const { toast } = useToast();
    const db = useDb();
    
    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const sessionString = localStorage.getItem('curocity-doctor-session');
        if (!sessionString) {
            toast({ variant: 'destructive', title: 'Session expired', description: 'Please log in again.' });
            setIsLoading(false);
            return;
        }

        const { id, hospitalId } = JSON.parse(sessionString);

        if (!id || !hospitalId) {
            toast({ variant: 'destructive', title: 'Invalid Session', description: 'Your session data is incomplete.' });
            setIsLoading(false);
            return;
        }
        
        // Correct path: curePartners/{hospitalId}/doctors/{doctorId}
        const doctorRef = doc(db, `curePartners/${hospitalId}/doctors`, id);
        const unsubscribe = onSnapshot(doctorRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as DoctorProfileData;
                setProfile({ id: docSnap.id, ...data });

                const initialAvailability: Record<string, { available: boolean, start: string, end: string }> = {};
                daysOfWeek.forEach(day => {
                    initialAvailability[day] = data.weeklyAvailability?.[day] || { available: true, start: '09:00', end: '17:00' };
                });
                setAvailability(initialAvailability);
                setDateOverrides(data.dateOverrides || {});
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not find your profile data.' });
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching doctor profile:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'An error occurred while fetching your profile.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
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
        const session = localStorage.getItem('curocity-doctor-session');
        if (!session) return;
        const { hospitalId } = JSON.parse(session);

        const doctorRef = doc(db, `curePartners/${hospitalId}/doctors`, profile.id);
        try {
            await updateDoc(doctorRef, { weeklyAvailability: availability, dateOverrides });
            toast({ title: "Availability Saved", description: "Your schedule has been updated successfully." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not update your schedule." });
        }
    }
    
    const handleSetDateOverride = (available: boolean) => {
        if (!selectedDates || !selectedDates.from) {
            toast({ variant: 'destructive', title: 'No Date Selected', description: 'Please select a date or a date range first.' });
            return;
        }

        const newOverrides = { ...dateOverrides };
        let currentDate = new Date(selectedDates.from);
        const endDate = selectedDates.to || selectedDates.from;
        
        while(currentDate <= endDate) {
            const dateString = format(currentDate, 'yyyy-MM-dd');
            newOverrides[dateString] = { available };
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        setDateOverrides(newOverrides);
        toast({ title: `Marked as ${available ? 'Available' : 'Unavailable'}`, description: 'Remember to save your changes.' });
    }

    const handleRemoveOverride = (dateString: string) => {
        const newOverrides = { ...dateOverrides };
        delete newOverrides[dateString];
        setDateOverrides(newOverrides);
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

    const sortedOverrides = Object.entries(dateOverrides).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Profile & Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-0.5 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-primary via-primary/50 to-accent animate-[spin_10s_linear_infinite]"></div>
                        <div className="relative bg-background rounded-lg">
                            <CardHeader className="items-center text-center">
                                <Avatar className="w-24 h-24 border-4 border-primary mb-4">
                                    <AvatarImage src={profile.photoUrl || `https://i.pravatar.cc/150?u=${profile.id}`} data-ai-hint="doctor portrait" />
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
                        </div>
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
                            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary"/> Manage Availability</CardTitle>
                            <CardDescription>Set your recurring weekly schedule and manage specific dates for time off or custom hours.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="weekly">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
                                    <TabsTrigger value="dates">Manage Dates</TabsTrigger>
                                </TabsList>
                                <TabsContent value="weekly" className="mt-4 space-y-4">
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
                                </TabsContent>
                                <TabsContent value="dates" className="mt-4 space-y-4">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <Label className="font-semibold">1. Select Date(s) on the Calendar</Label>
                                            <Calendar
                                                mode="range"
                                                selected={selectedDates}
                                                onSelect={setSelectedDates}
                                                className="rounded-md border mt-2"
                                            />
                                        </div>
                                         <div>
                                            <Label className="font-semibold">2. Set Availability</Label>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <Button variant="destructive" onClick={() => handleSetDateOverride(false)}>Mark as Unavailable</Button>
                                                <Button variant="secondary" onClick={() => handleSetDateOverride(true)}>Mark as Available</Button>
                                            </div>
                                            <div className="mt-4">
                                                <Label className="font-semibold">3. Current Overrides</Label>
                                                 <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2 border rounded-md p-2 bg-muted/30">
                                                     {sortedOverrides.length > 0 ? sortedOverrides.map(([date, override]) => (
                                                         <div key={date} className="flex justify-between items-center text-sm p-1">
                                                             <span>{format(new Date(date), 'PPP')}</span>
                                                             <div className="flex items-center gap-2">
                                                                 <Badge variant={override.available ? 'default' : 'destructive'}>{override.available ? 'Available' : 'Unavailable'}</Badge>
                                                                 <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveOverride(date)}><X className="w-4 h-4"/></Button>
                                                             </div>
                                                         </div>
                                                     )) : <p className="text-xs text-center text-muted-foreground py-4">No date-specific overrides set.</p>}
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                         <CardFooter>
                            <Button onClick={handleSaveAvailability}>Save Schedule Changes</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
