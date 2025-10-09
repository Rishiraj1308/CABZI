
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

interface Case {
    id: string;
    caseId: string;
    riderName: string;
    severity?: string;
    status: 'completed' | 'cancelled_by_rider' | 'cancelled_by_partner';
    createdAt: Timestamp;
    estimatedFare?: number;
}

export default function AmbulanceCasesPage() {
    const [cases, setCases] = useState<Case[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const session = localStorage.getItem('cabzi-ambulance-session');
        if (!session) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find your session.' });
            setIsLoading(false);
            return;
        }

        const { partnerId } = JSON.parse(session);

        const q = query(
            collection(db, 'emergencyCases'),
            where('assignedAmbulanceId', '==', partnerId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const casesData: Case[] = [];
            querySnapshot.forEach((doc) => {
                casesData.push({ id: doc.id, ...doc.data() } as Case);
            });
            setCases(casesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching cases: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your case history.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const getStatusBadge = (status: Case['status']) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">Completed</Badge>;
            case 'cancelled_by_rider':
            case 'cancelled_by_partner':
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    }

    return (
        <div className="grid gap-6">
            <h2 className="text-3xl font-bold tracking-tight">My Case History</h2>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="w-5 h-5"/> Past Cases</CardTitle>
                    <CardDescription>A complete log of all emergency cases you have handled.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Case ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Fare</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : cases.length > 0 ? (
                                cases.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-mono text-xs">{c.caseId}</TableCell>
                                        <TableCell>{c.createdAt.toDate().toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{c.riderName}</TableCell>
                                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {c.estimatedFare ? `₹${c.estimatedFare.toFixed(2)}` : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        You have not handled any cases yet.
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
