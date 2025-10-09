
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { History, IndianRupee } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore'

interface Job {
    id: string;
    driverName: string;
    issue: string;
    totalAmount?: number;
    status: 'completed' | 'cancelled_by_driver' | 'cancelled_by_mechanic';
    createdAt: Timestamp;
    invoiceId?: string;
}

export default function ResQJobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const session = localStorage.getItem('cabzi-resq-session');
        if (!session) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find your session.' });
            setIsLoading(false);
            return;
        }

        const { partnerId } = JSON.parse(session);

        const q = query(
            collection(db, 'garageRequests'),
            where('mechanicId', '==', partnerId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const jobsData: Job[] = [];
            querySnapshot.forEach((doc) => {
                jobsData.push({ id: doc.id, ...doc.data() } as Job);
            });
            setJobs(jobsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching jobs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your job history.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const getStatusBadge = (status: Job['status']) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">Completed</Badge>;
            case 'cancelled_by_driver':
            case 'cancelled_by_mechanic':
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    }

    return (
        <div className="grid gap-6">
            <h2 className="text-3xl font-bold tracking-tight">My Jobs</h2>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="w-5 h-5"/> Job History</CardTitle>
                    <CardDescription>A complete log of all your past service requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer (Driver)</TableHead>
                                <TableHead>Issue</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : jobs.length > 0 ? (
                                jobs.map(job => (
                                    <TableRow key={job.id}>
                                        <TableCell className="font-mono text-xs">{job.invoiceId || 'N/A'}</TableCell>
                                        <TableCell>{job.createdAt.toDate().toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{job.driverName}</TableCell>
                                        <TableCell>{job.issue}</TableCell>
                                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {job.totalAmount ? `₹${job.totalAmount.toFixed(2)}` : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        You have not completed any jobs yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
