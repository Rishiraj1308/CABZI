
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Ambulance, Siren } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useDb } from '@/lib/firebase/client-provider'
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'

interface EmergencyCase {
    id: string;
    caseId: string;
    riderName: string;
    assignedPartner?: { name: string };
    severity: 'Critical' | 'Serious' | 'Non-Critical';
    createdAt: Timestamp;
    status: 'pending' | 'accepted' | 'onTheWay' | 'inTransit' | 'completed' | 'cancelled';
}

export default function AdminCureCasesPage() {
    const [cases, setCases] = useState<EmergencyCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const db = useDb();
    
    useEffect(() => {
        if (!db) return;
        setIsLoading(true);
        const q = query(collection(db, 'emergencyCases'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const casesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmergencyCase));
            setCases(casesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching emergency cases:", error);
            toast.error("Error", {description: "Could not fetch emergency cases."});
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    const filteredCases = useMemo(() => {
        if (!searchQuery) {
            return cases;
        }
        return cases.filter(c =>
            c.riderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.assignedPartner?.name && c.assignedPartner.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [cases, searchQuery]);

    const getStatusBadge = (status: EmergencyCase['status']) => {
        switch (status) {
            case 'completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Completed</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
            case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">Pending</Badge>;
            case 'accepted':
            case 'onTheWay':
            case 'inTransit':
                return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">In Progress</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    }
    
    const getSeverityBadge = (severity?: EmergencyCase['severity']) => {
        switch (severity) {
            case 'Critical': return <Badge variant="destructive" className="text-base"><Siren className="w-4 h-4 mr-2 animate-pulse-intense"/>{severity}</Badge>;
            case 'Serious': return <Badge className="bg-orange-500 text-white text-base"><Siren className="w-4 h-4 mr-2"/>{severity}</Badge>;
            default: return <Badge variant="secondary" className="text-base">{severity || 'Non-Critical'}</Badge>;
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Ambulance className="w-6 h-6 text-destructive"/>
                            Cure Cases Log
                        </CardTitle>
                        <CardDescription>A complete log of all emergency SOS requests on the platform.</CardDescription>
                    </div>
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by patient, case ID..."
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
                            <TableHead>Case ID</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Assigned Hospital</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredCases.length > 0 ? (
                            filteredCases.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-mono text-xs">{c.caseId}</TableCell>
                                    <TableCell className="font-medium">{c.riderName}</TableCell>
                                    <TableCell>{c.assignedPartner?.name || 'Searching...'}</TableCell>
                                    <TableCell>{getSeverityBadge(c.severity)}</TableCell>
                                    <TableCell>{c.createdAt ? c.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No emergency cases have been logged yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
