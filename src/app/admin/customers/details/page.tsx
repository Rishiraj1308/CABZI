
'use client'

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Car, IndianRupee, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Customer {
    id: string;
    name: string;
    phone: string;
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

                    // Fetch rides for this customer using their phone number from the `users` doc
                    const ridesQuery = query(
                        collection(db, 'rides'),
                        where('riderId', '==', customerData.phone),
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
    }, [customerId]);
    
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
    
    const getInitials = (name: string) => {
        if (!name) return 'C';
        const names = name.split(' ');
        return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Card>
                    <CardHeader><Skeleton className="h-24 w-full" /></CardHeader>
                </Card>
                <Card>
                    <CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent>
                </Card>
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
               <Link href="/admin/customers"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Customers</Link>
           </Button>
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-6">
                        <Avatar className="w-16 h-16 border">
                            <AvatarImage src={`https://placehold.co/100x100.png`} alt={customer.name} data-ai-hint="customer portrait" />
                            <AvatarFallback>{getInitials(customer.name).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-3xl">{customer.name}</CardTitle>
                            <CardDescription>+91 {customer.phone}</CardDescription>
                        </div>
                    </div>
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
    );
}


export default function CustomerDetailsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CustomerDetailsContent />
        </Suspense>
    )
}
