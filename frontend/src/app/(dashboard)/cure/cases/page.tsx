'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { History, IndianRupee, HandHeart } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useDb } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore'

interface Case {
    id: string;
    caseId: string;
    riderName: string;
    severity?: string;
    status: 'completed' | 'cancelled_by_rider' | 'cancelled_by_partner' | 'cancelled_by_admin';
    createdAt: Timestamp;
    estimatedFare?: number;
}

export default function CureCasesPage() {
    const [cases, setCases] = useState<Case[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const db = useDb();

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const session = localStorage.getItem('curocity-cure-session');
        if (!session) {
            toast.error('Error', { description: 'Could not find your session.' });
            setIsLoading(false);
            return;
        }

        const { partnerId } = JSON.parse(session);

        const q = query(
            collection(db, 'emergencyCases'),
            where('assignedPartner.id', '==', partnerId),
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
            toast.error('Error', { description: 'Could not fetch your case history.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    const financialStats = useMemo(() => {
        const completedCases = cases.filter(c => c.status === 'completed');
        const totalEarnings = completedCases.reduce((sum, c) => sum + (c.estimatedFare || 0), 0);
        return {
            totalCases: cases.length,
            totalEarnings: totalEarnings,
        };
    }, [cases]);


    const getStatusBadge = (status: Case['status']) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">Completed</Badge>;
            case 'cancelled_by_rider':
            case 'cancelled_by_partner':
            case 'cancelled_by_admin':
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    }

    return (
        <div className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Cases Handled</CardTitle>
                        <HandHeart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{financialStats.totalCases}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Estimated Earnings</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">₹{financialStats.totalEarnings.toLocaleString()}</div>}
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="w-5 h-5"/> My Past Cases</CardTitle>
                    <CardDescription>A complete log of all emergency cases you have handled.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Case ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Estimated Fare</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
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
                                        <TableCell>{c.severity || 'N/A'}</TableCell>
                                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {c.estimatedFare ? `₹${c.estimatedFare.toFixed(2)}` : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
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
