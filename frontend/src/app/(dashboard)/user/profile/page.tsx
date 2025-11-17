
'use client'

import * as React from "react"
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Settings, LogOut, Camera, Shield, Activity, ArrowRight, Loader2, HeartPulse, Droplets, Car, IndianRupee, VenetianMask, Cake, Phone, Siren, Calendar, Wrench, FlaskConical, Home, Briefcase, FileText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useFirebase } from '@/lib/firebase/client-provider'
import { doc, getDoc, collection, query, where, getDocs, Timestamp, updateDoc, orderBy } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import type { RideData, AmbulanceCase, Appointment, GarageRequest } from "@/lib/types"
import { DetailItem } from "@/components/shared/detail-item"

interface UserProfileData {
    name: string;
    phone: string;
    email?: string;
    gender?: 'male' | 'female' | 'other';
    isOnline?: boolean;
    lastSeen?: Timestamp;
    photoURL?: string;
    createdAt?: Timestamp;
    healthProfile?: {
        bloodGroup: string;
        allergies: string;
        conditions: string;
    };
    insurance?: {
        provider: string;
        policyNumber: string;
    }
}

export default function UserProfilePage() {
    const { user, isUserLoading, auth, db, firebaseApp } = useFirebase();
    const router = useRouter();
    const [profileData, setProfileData] = useState<UserProfileData | null>(null);
    const [rides, setRides] = useState<RideData[]>([]);
    const [sosCases, setSosCases] = useState<AmbulanceCase[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [garageRequests, setGarageRequests] = useState<GarageRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingHealthInfo, setIsSavingHealthInfo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [healthProfile, setHealthProfile] = useState({ bloodGroup: '', allergies: '', conditions: '' });
    const [insurance, setInsurance] = useState({ provider: '', policyNumber: '' });

    useEffect(() => {
        if (isUserLoading) return;
        if (!user || !db) {
            router.push('/login?role=user');
            return;
        }

        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as UserProfileData;
                    setProfileData(data);
                    if (data.healthProfile) setHealthProfile(data.healthProfile);
                    if (data.insurance) setInsurance(data.insurance);
                } else {
                    setProfileData({
                        name: user.displayName || 'User',
                        phone: user.phoneNumber || '',
                        email: user.email || '',
                        photoURL: user.photoURL || undefined
                    });
                }
                
                const ridesQuery = query(collection(db, 'rides'), where('riderId', '==', user.uid), orderBy('createdAt', 'desc'));
                const casesQuery = query(collection(db, 'emergencyCases'), where('riderId', '==', user.uid), orderBy('createdAt', 'desc'));
                const appointmentsQuery = query(collection(db, 'appointments'), where('patientId', '==', user.uid), orderBy('createdAt', 'desc'));
                const garageRequestsQuery = query(collection(db, 'garageRequests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

                const [ridesSnapshot, casesSnapshot, appointmentsSnapshot, garageRequestsSnapshot] = await Promise.all([
                    getDocs(ridesQuery),
                    getDocs(casesQuery),
                    getDocs(appointmentsQuery),
                    getDocs(garageRequestsQuery),
                ]);

                setRides(ridesSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as RideData));
                setSosCases(casesSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as AmbulanceCase));
                setAppointments(appointmentsSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as Appointment));
                setGarageRequests(garageRequestsSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as GarageRequest));

            } catch (error) {
                console.error("Error fetching user data:", error);
                toast.error("Error", { description: "Could not load profile data."});
            } finally {
                setIsLoading(false);
            }
        }

        fetchAllData();

    }, [user, isUserLoading, db, router]);

    const allActivities = useMemo(() => {
        const activities = [
            ...rides.map(r => ({ type: 'Ride', ...r, title: `Ride to ${r.destination?.address?.split(',')[0] || 'destination'}`, description: `Partner: ${r.driverDetails?.name || 'N/A'}` })),
            ...sosCases.map(c => ({ type: 'SOS', ...c, title: `Emergency SOS`, description: `Hospital: ${c.assignedPartner?.name || 'N/A'}` })),
            ...appointments.map(a => ({ type: 'Appointment', ...a, title: `Dr. ${a.doctorName}`, description: a.hospitalName || '' })),
            ...garageRequests.map(g => ({ type: 'ResQ', ...g, title: `ResQ: ${g.issue}`, description: `Mechanic: ${g.mechanicName || 'N/A'}` })),
        ];
        return activities.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }, [rides, sosCases, appointments, garageRequests]);


    const handleLogout = () => {
        if (!auth) return;
        auth.signOut().then(() => {
            localStorage.removeItem('curocity-session');
            toast.success('Logged Out', {
                description: 'You have been successfully logged out.'
            });
            router.push('/');
        });
    }
    
    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !user || !db || !firebaseApp) {
            return;
        }

        const file = event.target.files[0];
        const storage = getStorage(firebaseApp);
        const storageRef = ref(storage, `profile-pictures/${user.uid}`);

        setIsUploading(true);
        toast.info('Uploading photo...', { description: 'Please wait.' });

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { photoURL: downloadURL });
            
            setProfileData(prev => prev ? { ...prev, photoURL: downloadURL } : null);

            toast.success('Success!', { description: 'Your profile picture has been updated.' });
        } catch (error) {
            console.error("Error uploading photo:", error);
            toast.error('Upload Failed', { description: 'Could not upload your new photo.' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleSaveHealthInfo = async () => {
        if (!user || !db) return;
        setIsSavingHealthInfo(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                healthProfile,
                insurance,
            });
            toast.success('Health Info Saved', { description: 'Your vital information has been updated.' });
        } catch (error) {
            console.error("Error saving health info:", error);
            toast.error('Save Failed', { description: 'Could not update your health profile.' });
        } finally {
            setIsSavingHealthInfo(false);
        }
    }

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
    }
    
    const stats = React.useMemo(() => {
        const completedRides = rides.filter(r => r.status === 'completed');
        const totalSpend = completedRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
        return {
            totalRides: rides.length,
            totalSpend,
            totalSos: sosCases.length,
            totalAppointments: appointments.length,
            totalResq: garageRequests.length,
            totalLabTests: 0,
            totalHomeServices: 0, 
        };
    }, [rides, sosCases, appointments, garageRequests]);

    const getStatusBadge = (status: string) => {
        const lowerStatus = status.toLowerCase().replace(/_/g, ' ');
        if (lowerStatus.includes('completed')) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
        if (lowerStatus.includes('cancel')) return <Badge variant="destructive">{status}</Badge>;
        if (lowerStatus.includes('pending') || lowerStatus.includes('searching')) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 capitalize">{lowerStatus}</Badge>;
        if (lowerStatus.includes('confirmed') || lowerStatus.includes('accepted') || lowerStatus.includes('arrived') || lowerStatus.includes('in progress')) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 capitalize">{lowerStatus}</Badge>;
        return <Badge variant="secondary" className="capitalize">{lowerStatus}</Badge>;
    }


    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                 <Skeleton className="h-10 w-48" />
                 <Card>
                    <CardHeader className="items-center text-center">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2 mt-4">
                            <Skeleton className="h-8 w-40" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                    </CardHeader>
                 </Card>
                 <Card>
                    <CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent>
                 </Card>
                  <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    if (!user || !profileData) {
        return <p className="p-8 text-center">Please log in to view your profile.</p>
    }
    
    const ActivityIcon = ({ type }: { type: string }) => {
        switch (type) {
            case 'Ride': return <Car className="w-4 h-4 text-primary" />;
            case 'SOS': return <Siren className="w-4 h-4 text-destructive" />;
            case 'Appointment': return <Calendar className="w-4 h-4 text-blue-500" />;
            case 'ResQ': return <Wrench className="w-4 h-4 text-amber-600" />;
            default: return <Activity className="w-4 h-4" />;
        }
    };


    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="animate-fade-in md:pl-0">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    My Profile
                </h2>
                <p className="text-muted-foreground">Manage your account, activity, and preferences.</p>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader className="items-center text-center">
                             <div className="relative">
                                <Avatar className="w-24 h-24 border-4 border-primary">
                                    <AvatarImage src={profileData.photoURL} alt={profileData.name || ''} />
                                    <AvatarFallback className="text-3xl">{getInitials(profileData.name).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/png, image/jpeg" className="hidden" />
                                <Button variant="outline" size="icon" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 bg-background" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4"/>}
                                    <span className="sr-only">Change photo</span>
                                </Button>
                            </div>
                            <div className="pt-2">
                                <CardTitle className="text-2xl">{profileData.name}</CardTitle>
                                <CardDescription>Member since {profileData.createdAt ? profileData.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '2024'}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4">
                             <DetailItem icon={Phone} label="Phone" value={profileData.phone} />
                             <DetailItem icon={VenetianMask} label="Gender" value={profileData.gender} />
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Status</span>
                                <Badge className={profileData.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                    {profileData.isOnline ? 'Online' : 'Offline'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><HeartPulse className="w-5 h-5 text-destructive"/> Health Profile</CardTitle>
                        </CardHeader>
                         <CardContent className="text-sm space-y-4">
                            <DetailItem icon={Droplets} label="Blood Group" value={healthProfile?.bloodGroup} />
                            <div className="space-y-1">
                                <span className="text-muted-foreground">Allergies</span>
                                <p className="font-semibold p-2 bg-muted rounded-md text-xs">{healthProfile?.allergies || 'None specified'}</p>
                            </div>
                             <div className="space-y-1">
                                <span className="text-muted-foreground">Medical Conditions</span>
                                <p className="font-semibold p-2 bg-muted rounded-md text-xs">{healthProfile?.conditions || 'None specified'}</p>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-blue-500"/> Insurance</CardTitle>
                        </CardHeader>
                         <CardContent className="text-sm space-y-4">
                             <DetailItem icon={Briefcase} label="Provider" value={insurance?.provider} />
                             <DetailItem icon={FileText} label="Policy No." value={insurance?.policyNumber} />
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Snapshot</CardTitle>
                        </CardHeader>
                         <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                            <Link href="/user/activity?filter=Ride"><Card className="p-4 hover:bg-muted transition-colors"><Car className="w-6 h-6 mx-auto mb-1 text-primary"/><p className="text-2xl font-bold">{stats.totalRides}</p><p className="text-xs text-muted-foreground">Rides</p></Card></Link>
                            <Link href="/user/activity?filter=ResQ"><Card className="p-4 hover:bg-muted transition-colors"><Wrench className="w-6 h-6 mx-auto mb-1 text-amber-600"/><p className="text-2xl font-bold">{stats.totalResq}</p><p className="text-xs text-muted-foreground">ResQ</p></Card></Link>
                            <Link href="/user/activity?filter=SOS"><Card className="p-4 hover:bg-muted transition-colors"><Siren className="w-6 h-6 mx-auto mb-1 text-destructive"/><p className="text-2xl font-bold">{stats.totalSos}</p><p className="text-xs text-muted-foreground">SOS</p></Card></Link>
                            <Link href="/user/activity?filter=Appointment"><Card className="p-4 hover:bg-muted transition-colors"><Calendar className="w-6 h-6 mx-auto mb-1 text-blue-500"/><p className="text-2xl font-bold">{stats.totalAppointments}</p><p className="text-xs text-muted-foreground">Appointments</p></Card></Link>
                            <Card className="p-4 opacity-50"><FlaskConical className="w-6 h-6 mx-auto mb-1 text-purple-500"/><p className="text-2xl font-bold">{stats.totalLabTests}</p><p className="text-xs text-muted-foreground">Lab Tests</p></Card>
                            <Card className="p-4 opacity-50"><Home className="w-6 h-6 mx-auto mb-1 text-orange-500"/><p className="text-2xl font-bold">{stats.totalHomeServices}</p><p className="text-xs text-muted-foreground">Home Services</p></Card>
                            <Card className="p-4 col-span-full">
                               <p className="text-2xl font-bold text-primary">₹{stats.totalSpend.toLocaleString()}</p>
                               <p className="text-xs text-muted-foreground">Total Spend on Rides</p>
                           </Card>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>A log of your most recent activities with Curocity.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Service</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allActivities.length > 0 ? (
                                        allActivities.slice(0, 5).map(activity => (
                                            <TableRow key={activity.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 font-semibold">
                                                        <ActivityIcon type={activity.type}/>
                                                        {activity.type}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <p className="font-medium truncate">{activity.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                                                </TableCell>
                                                <TableCell>{activity.createdAt ? format(activity.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                                <TableCell>{getStatusBadge(activity.status)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                               No activity history found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                         <CardFooter>
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/user/activity">
                                    View All Activity <ArrowRight className="ml-2 w-4 h-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5"/> Account Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full">
                                        <LogOut className="mr-2 h-4 w-4" /> Logout
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You will be returned to the home page and will need to log in again to book a ride.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                                            Logout
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

