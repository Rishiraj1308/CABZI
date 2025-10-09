
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/firebase'
import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface Ride {
  id: string;
  riderName?: string;
  driverName?: string;
  pickup?: { address: string };
  destination?: { address: string };
  fare?: number;
  status: string;
  createdAt: Timestamp;
}

export default function AdminRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchRides = async () => {
        if (!db) {
          toast({ variant: 'destructive', title: 'Database Error' });
          setIsLoading(false);
          return;
        }

        try {
            const q = query(collection(db, 'rides'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setRides([]);
            } else {
                const ridesData: Ride[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
                setRides(ridesData);
            }
        } catch (error) {
            console.error("Error fetching rides: ", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch rides data.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    fetchRides();
  }, [toast]);

  const filteredRides = useMemo(() => {
    if (!searchQuery) {
      return rides;
    }
    return rides.filter(ride =>
        ride.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ride.riderName && ride.riderName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ride.driverName && ride.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ride.pickup?.address && ride.pickup.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ride.destination?.address && ride.destination.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [rides, searchQuery]);

   const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Completed</Badge>
      case 'accepted':
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">In Progress</Badge>
      case 'cancelled_by_driver':
      case 'cancelled_by_rider':
        return <Badge variant="destructive">Cancelled</Badge>
      case 'searching':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">Searching</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>All Rides</CardTitle>
            <CardDescription>A complete audit trail of all rides taken on the platform.</CardDescription>
          </div>
          <div className="relative w-full md:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Search by names, locations, ID..."
                  className="pl-8 sm:w-full md:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rider</TableHead>
              <TableHead>Trip Details</TableHead>
              <TableHead>Fare</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  </TableRow>
                ))
            ) : filteredRides.length > 0 ? (
                filteredRides.map((ride) => (
                  <TableRow key={ride.id}>
                    <TableCell className="font-medium">{ride.riderName || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="text-sm"><strong>From:</strong> {ride.pickup?.address || '...'}</div>
                      <div className="text-sm"><strong>To:</strong> {ride.destination?.address || '...'}</div>
                    </TableCell>
                    <TableCell>₹{ride.fare?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>{ride.createdAt ? ride.createdAt.toDate().toLocaleString() : 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(ride.status)}</TableCell>
                  </TableRow>
                ))
            ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No rides have been recorded yet.
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
