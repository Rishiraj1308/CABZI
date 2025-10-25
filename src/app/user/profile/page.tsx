
'use client'

import * as React from "react"
import { useState, useEffect } from 'react'
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
import { Home, Briefcase, Settings, FileText, User, LogOut, Camera, Shield, Wallet, CreditCard, PlusCircle, Activity, ArrowRight } from 'lucide-react'
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
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { Separator } from '@/components/ui/separator'

interface UserProfileData {
    name: string;
    phone: string;
    email: string;
    photoURL?: string;
    createdAt?: Timestamp;
}

interface Ride {
    fare?: number;
    status: string;
}

export default function UserProfilePage() {
    const { user, isUserLoading, auth, db } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [profileData, setProfileData] = useState<UserProfileData | null>(null);
    const [rides, setRides] = useState<Ride[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                    setProfileData(docSnap.data() as UserProfileData);
                } else {
                    // Fallback to auth data if firestore doc is missing
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

            <Card>
                <CardHeader className="flex-row items-center gap-4">
                    <div className="relative">
                        <Avatar className="w-20 h-20 border-4 border-primary">
                            <AvatarImage src={profileData.photoURL || 'https://placehold.co/100x100.png'} alt={profileData.name || ''} data-ai-hint="customer portrait" />
                            <AvatarFallback className="text-3xl">{getInitials(profileData.name).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" size="icon" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 bg-background">
                            <Camera className="w-4 h-4"/>
                            <span className="sr-only">Change photo</span>
                        </Button>
                    </div>
                    <div>
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
                        <p className="text-2xl font-bold">{rideStats.totalRides}</p>
                        <p className="text-sm text-muted-foreground">Total Rides</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">₹{rideStats.totalSpend.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Total Spend</p>
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
            
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5"/> Curocity Wallet</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                        <p className="text-sm text-muted-foreground">Available Balance</p>
                        <p className="text-2xl font-bold">₹1,250.75</p>
                    </div>
                    <Button><PlusCircle className="mr-2 h-4 w-4"/>Add Money</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5"/> Emergency Contact</CardTitle>
                    <CardDescription>Add a trusted contact to be notified in case of an emergency.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Input placeholder="Enter contact's name & number" />
                        <Button><PlusCircle className="w-4 h-4 mr-2"/> Add Contact</Button>
                    </div>
                </CardContent>
            </Card>
            
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5"/> Payment Methods</CardTitle>
                     <CardDescription>Manage your saved payment options for quick and easy checkout.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center p-3 rounded-lg border">
                        <CreditCard className="w-6 h-6 mr-4 text-muted-foreground"/>
                        <div className="flex-1">
                            <p className="font-semibold">HDFC Bank Credit Card</p>
                            <p className="text-sm text-muted-foreground">**** **** **** 1234</p>
                        </div>
                         <Button variant="outline" size="sm">Remove</Button>
                    </div>
                     <div className="flex items-center p-3 rounded-lg border">
                        <Wallet className="w-6 h-6 mr-4 text-muted-foreground"/>
                        <div className="flex-1">
                            <p className="font-semibold">UPI</p>
                            <p className="text-sm text-muted-foreground">user@okicici</p>
                        </div>
                         <Button variant="outline" size="sm">Remove</Button>
                    </div>
                     <Button variant="outline" className="w-full mt-2"><PlusCircle className="w-4 h-4 mr-2"/> Add New Payment Method</Button>
                </CardContent>
            </Card>
            
             <Card>
                <CardHeader>
                    <CardTitle>Settings & Legal</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                             <Label>Saved Locations</Label>
                             <div className="space-y-2 mt-2">
                                <div className="flex items-center gap-4">
                                    <Home className="w-5 h-5 text-muted-foreground"/>
                                    <Input placeholder="Add Home address" />
                                </div>
                                 <div className="flex items-center gap-4">
                                    <Briefcase className="w-5 h-5 text-muted-foreground"/>
                                    <Input placeholder="Add Work address" />
                                </div>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex flex-col gap-2">
                            <Button variant="ghost" className="w-full justify-start gap-2"><Settings className="w-5 h-5"/> Account Settings</Button>
                            <Button asChild variant="ghost" className="w-full justify-start gap-2"><Link href="/terms"><FileText className="w-5 h-5"/> Terms of Service</Link></Button>
                            <Button asChild variant="ghost" className="w-full justify-start gap-2"><Link href="/privacy"><FileText className="w-5 h-5"/> Privacy Policy</Link></Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
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
    )
}
