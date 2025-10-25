
'use client'

import * as React from "react"
import { useState, useEffect, useRef } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Home, Briefcase, Settings, FileText, User, LogOut, Camera, Shield, Wallet, CreditCard, PlusCircle, Activity, ArrowRight, Loader2, HeartPulse, Droplets, Car, IndianRupee } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
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
import { useFirebase } from '@/firebase/client-provider'
import { doc, getDoc, collection, query, where, getDocs, Timestamp, updateDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

interface UserProfileData {
    name: string;
    phone: string;
    email: string;
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

interface Ride {
    fare?: number;
    status: string;
}

export default function UserProfilePage() {
    const { user, isUserLoading, auth, db, firebaseApp } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [profileData, setProfileData] = useState<UserProfileData | null>(null);
    const [rides, setRides] = useState<Ride[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingHealthInfo, setIsSavingHealthInfo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for the new fields
    const [healthProfile, setHealthProfile] = useState({ bloodGroup: '', allergies: '', conditions: '' });
    const [insurance, setInsurance] = useState({ provider: '', policyNumber: '' });

    useEffect(() => {
        if (isUserLoading) return;
        if (!user || !db) {
            router.push('/login?role=user');
            return;
        }

        const fetchProfileAndRides = async () => {
            setIsLoading(true);
            try {
                // Fetch profile
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
                
                // Fetch rides
                const ridesQuery = query(collection(db, 'rides'), where('riderId', '==', user.uid));
                const ridesSnapshot = await getDocs(ridesQuery);
                const ridesData: Ride[] = ridesSnapshot.docs.map(doc => doc.data() as Ride);
                setRides(ridesData);

            } catch (error) {
                console.error("Error fetching user data:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load profile data."});
            } finally {
                setIsLoading(false);
            }
        }

        fetchProfileAndRides();

    }, [user, isUserLoading, db, router, toast]);


    const handleLogout = () => {
        if (!auth) return;
        auth.signOut().then(() => {
            localStorage.removeItem('curocity-session');
            toast({
                title: 'Logged Out',
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
        toast({ title: 'Uploading photo...', description: 'Please wait.' });

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { photoURL: downloadURL });
            
            setProfileData(prev => prev ? { ...prev, photoURL: downloadURL } : null);

            toast({ title: 'Success!', description: 'Your profile picture has been updated.', className: 'bg-green-600 text-white' });
        } catch (error) {
            console.error("Error uploading photo:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your new photo.' });
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
            toast({ title: 'Health Info Saved', description: 'Your vital information has been updated.', className: 'bg-green-600 text-white' });
        } catch (error) {
            console.error("Error saving health info:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update your health profile.' });
        } finally {
            setIsSavingHealthInfo(false);
        }
    }


    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
    }
    
    const rideStats = React.useMemo(() => {
        const completedRides = rides.filter(r => r.status === 'completed');
        const totalSpend = completedRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
        return {
            totalRides: rides.length,
            totalSpend,
        };
    }, [rides]);

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
                                    <AvatarImage src={profileData.photoURL || 'https://placehold.co/100x100.png'} alt={profileData.name || ''} data-ai-hint="customer portrait" />
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
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5"/> Activity Snapshot</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-muted rounded-lg">
                                <Car className="w-6 h-6 mx-auto mb-1 text-primary"/>
                                <p className="text-2xl font-bold">{rideStats.totalRides}</p>
                                <p className="text-xs text-muted-foreground">Total Rides</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <IndianRupee className="w-6 h-6 mx-auto mb-1 text-primary"/>
                                <p className="text-2xl font-bold">₹{rideStats.totalSpend.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Total Spend</p>
                            </div>
                        </CardContent>
                         <CardFooter>
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/user/activity">
                                    View All Activity <ArrowRight className="ml-2 w-4 h-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-green-600"/> Emergency Contacts</CardTitle>
                            <CardDescription>Add trusted contacts to notify during an SOS. This is a vital part of our CURE safety net.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Mocked Contact */}
                            <div className="p-3 rounded-lg border flex items-center gap-3">
                                <User className="w-5 h-5 text-muted-foreground"/>
                                <div className="flex-1">
                                    <p className="font-semibold">Abhishek Sharma</p>
                                    <p className="text-xs text-muted-foreground">Father</p>
                                </div>
                                <Button variant="ghost" size="sm">Remove</Button>
                            </div>
                            <Button variant="outline" className="w-full border-dashed">
                               <PlusCircle className="w-4 h-4 mr-2"/> Add Contact
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><HeartPulse className="w-5 h-5 text-destructive"/> Health &amp; Insurance</CardTitle>
                            <CardDescription>This information is critical for emergencies and will be shared with CURE partners when you use the SOS feature.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="blood-group" className="flex items-center gap-1.5"><Droplets className="w-4 h-4"/>Blood Group</Label>
                                    <Input id="blood-group" placeholder="e.g., O+" value={healthProfile.bloodGroup} onChange={(e) => setHealthProfile(prev => ({...prev, bloodGroup: e.target.value}))}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="allergies">Known Allergies</Label>
                                    <Input id="allergies" placeholder="e.g., Peanuts, Penicillin" value={healthProfile.allergies} onChange={(e) => setHealthProfile(prev => ({...prev, allergies: e.target.value}))}/>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="conditions">Pre-existing Medical Conditions</Label>
                                <Textarea id="conditions" placeholder="e.g., Asthma, Diabetes, Hypertension" value={healthProfile.conditions} onChange={(e) => setHealthProfile(prev => ({...prev, conditions: e.target.value}))}/>
                            </div>
                            <Separator />
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="insurance-provider">Insurance Provider</Label>
                                    <Input id="insurance-provider" placeholder="e.g., HDFC Ergo, Star Health" value={insurance.provider} onChange={(e) => setInsurance(prev => ({...prev, provider: e.target.value}))}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="policy-number">Policy Number</Label>
                                    <Input id="policy-number" placeholder="e.g., P123456789" value={insurance.policyNumber} onChange={(e) => setInsurance(prev => ({...prev, policyNumber: e.target.value}))}/>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveHealthInfo} disabled={isSavingHealthInfo}>
                                {isSavingHealthInfo ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Shield className="w-4 h-4 mr-2"/>}
                                Save Health Info
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5"/> Account Settings</CardTitle>
                     <CardDescription>Manage your saved locations, payment methods, and legal information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Saved Locations</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg border flex items-center gap-3">
                                <Home className="w-5 h-5 text-muted-foreground"/>
                                <div className="flex-1"><p className="font-medium">Home</p><p className="text-xs text-muted-foreground">A-123, Sector 5, Noida</p></div>
                                <Button variant="ghost" size="sm">Edit</Button>
                            </div>
                            <div className="p-3 rounded-lg border flex items-center gap-3">
                                <Briefcase className="w-5 h-5 text-muted-foreground"/>
                                <div className="flex-1"><p className="font-medium">Work</p><p className="text-xs text-muted-foreground">Cyber Hub, Gurgaon</p></div>
                                <Button variant="ghost" size="sm">Edit</Button>
                            </div>
                        </div>
                    </div>
                     <Separator />
                    <div className="flex flex-col md:flex-row gap-4">
                        <Button asChild variant="ghost" className="w-full justify-start gap-2"><Link href="/terms"><FileText className="w-5 h-5"/> Terms of Service</Link></Button>
                        <Button asChild variant="ghost" className="w-full justify-start gap-2"><Link href="/privacy"><FileText className="w-5 h-5"/> Privacy Policy</Link></Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full md:w-auto">
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
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
