'use client'

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDb } from '@/lib/firebase/client-provider';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Car, IndianRupee, User, Shield, HeartPulse, Droplets } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    gender?: 'male' | 'female' | 'other';
    role?: string;
    isOnline?: boolean;
    createdAt?: Timestamp;
    lastSeen?: Timestamp;
    photoURL?: string;
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
    id: string;
    driverName?: string;
    pickup?: { address: string };
    destination?: { address: string };
    fare?: number;
    status: string;
    createdAt: Timestamp;
}

function CustomerDetailsContent() {
    const searchParams = useSearchParams();
    const customerId = searchParams.get('id');
    const db = useDb();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [rides, setRides] = useState<Ride[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!customerId || !db) {
            setIsLoading(false);
            return;
        }

        const fetchCustomerData = async () => {
            setIsLoading(true);
            try {
                // Fetch customer details
                const customerRef = doc(db, 'users', customerId);
                const docSnap = await getDoc(customerRef);

                if (docSnap.exists()) {
                    const customerData = { id: docSnap.id, ...docSnap.data() } as Customer;
                    setCustomer(customerData);

                    // Fetch rides for this customer using their UID
                    const ridesQuery = query(
                        collection(db, 'rides'),
                        where('riderId', '==', customerData.id),
                        orderBy('createdAt', 'desc')
                    );
                    const ridesSnapshot = await getDocs(ridesQuery);
                    const ridesData: Ride[] = ridesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
                    setRides(ridesData);
                } else {
                    setCustomer(null);
                }
            } catch (error) {
                console.error("Error fetching customer data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCustomerData();
    }, [customerId, db]);
    
    const rideStats = useMemo(() => {
        const completedRides = rides.filter(r => r.status === 'completed');
        const totalSpend = completedRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
        return {
            totalRides: rides.length,
            totalSpend,
        };
    }, [rides]);

    const getStatusBadge = (status: string) => {
        switch (status) {
          case 'completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Completed</Badge>
          case 'cancelled_by_driver':
          case 'cancelled_by_rider': return <Badge variant="destructive">Cancelled</Badge>
          default: return <Badge variant="secondary">{status}</Badge>
        }
    }
    
    const getInitials = (name: string | undefined) => {
        if (!name) return 'C';
        const names = name.split(' ');
        return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card><CardHeader><Skeleton className="h-40 w-full" /></CardHeader></Card>
                        <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
                    </div>
                    <div className="lg:col-span-2">
                        <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
                    </div>
                </div>
            </div>
        )
    }

    if (!customer) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold">Customer Not Found</h2>
                <p className="text-muted-foreground">The customer with this ID could not be found.</p>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/admin/customers"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Customers</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button asChild variant="outline" size="sm">
               <Link href="/admin/customers"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Users</Link>
           </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="items-center text-center">
                             <Avatar className="w-24 h-24 border-4 border-primary">
                                <AvatarImage src={customer.photoURL} alt={customer.name} />
                                <AvatarFallback className="text-3xl">{getInitials(customer.name).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="pt-2">
                                <CardTitle className="text-2xl">{customer.name}</CardTitle>
                                <CardDescription>Joined on {customer.createdAt?.toDate().toLocaleDateString() || 'N/A'}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Phone</span>
                                <span className="font-semibold">{customer.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Email</span>
                                <span className="font-semibold">{customer.email || 'N/A'}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Gender</span>
                                <span className="font-semibold capitalize">{customer.gender}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <Badge className={customer.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                    {customer.isOnline ? 'Online' : 'Offline'}
                                </Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Last Seen</span>
                                <span className="font-semibold">{customer.lastSeen?.toDate().toLocaleString() || 'N/A'}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><HeartPulse className="w-5 h-5 text-destructive"/> Health Profile</CardTitle>
                        </CardHeader>
                         <CardContent className="text-sm space-y-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1.5"><Droplets className="w-4 h-4"/>Blood Group</span>
                                <span className="font-semibold">{customer.healthProfile?.bloodGroup || 'N/A'}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground">Allergies</span>
                                <p className="font-semibold p-2 bg-muted rounded-md text-xs">{customer.healthProfile?.allergies || 'None specified'}</p>
                            </div>
                             <div className="space-y-1">
                                <span className="text-muted-foreground">Medical Conditions</span>
                                <p className="font-semibold p-2 bg-muted rounded-md text-xs">{customer.healthProfile?.conditions || 'None specified'}</p>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-blue-500"/> Insurance</CardTitle>
                        </CardHeader>
                         <CardContent className="text-sm space-y-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Provider</span>
                                <span className="font-semibold">{customer.insurance?.provider || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Policy No.</span>
                                <span className="font-semibold">{customer.insurance?.policyNumber || 'N/A'}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Snapshot</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                                <Card className="p-4">
                                    <CardTitle className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground"><Car className="w-4 h-4"/>Total Rides</CardTitle>
                                    <p className="text-2xl font-bold">{rideStats.totalRides}</p>
                                </Card>
                                <Card className="p-4">
                                     <CardTitle className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground"><IndianRupee className="w-4 h-4"/>Total Spend</CardTitle>
                                    <p className="text-2xl font-bold text-primary">₹{rideStats.totalSpend.toLocaleString()}</p>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Ride Ledger</CardTitle>
                            <CardDescription>A complete history of all rides taken by {customer.name}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Partner</TableHead>
                                        <TableHead>Trip Details</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Fare</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rides.length > 0 ? (
                                        rides.map(ride => (
                                            <TableRow key={ride.id}>
                                                <TableCell>{ride.createdAt.toDate().toLocaleDateString()}</TableCell>
                                                <TableCell>{ride.driverName || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-xs">From: {ride.pickup?.address || '...'}</div>
                                                    <div className="text-xs">To: {ride.destination?.address || '...'}</div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(ride.status)}</TableCell>
                                                <TableCell className="text-right font-medium">₹{ride.fare?.toFixed(2) || '0.00'}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                This customer has not taken any rides yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
    );
}


export default function CustomerDetailsPage() {
    return (
        <Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
            <CustomerDetailsContent />
        </Suspense>
    )
}