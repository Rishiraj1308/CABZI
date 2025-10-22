
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Search, FileText, MoreHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

type ClaimStatus = 'Pending Verification' | 'Approved' | 'Rejected' | 'Query Raised';

interface Claim {
    id: string;
    patientName: string;
    caseId: string;
    policyNumber: string;
    insurer: string;
    claimAmount: number;
    status: ClaimStatus;
    submittedOn: string;
}

const mockClaims: Claim[] = [
    { id: 'CLAIM001', patientName: 'Rohan Sharma', caseId: 'CASE-EMG-123', policyNumber: 'HDFCERG-123456', insurer: 'HDFC Ergo', claimAmount: 45000, status: 'Pending Verification', submittedOn: '2024-09-04' },
    { id: 'CLAIM002', patientName: 'Priya Verma', caseId: 'CASE-EMG-121', policyNumber: 'ICICILOM-789012', insurer: 'ICICI Lombard', claimAmount: 120000, status: 'Approved', submittedOn: '2024-09-03' },
    { id: 'CLAIM003', patientName: 'Amit Singh', caseId: 'CASE-EMG-119', policyNumber: 'BAJAJ-ALL-345678', insurer: 'Bajaj Allianz', claimAmount: 75000, status: 'Query Raised', submittedOn: '2024-09-02' },
    { id: 'CLAIM004', patientName: 'Sunita Menon', caseId: 'CASE-EMG-115', policyNumber: 'STAR-HEALTH-901234', insurer: 'Star Health', claimAmount: 32000, status: 'Rejected', submittedOn: '2024-09-01' },
];


export default function InsurancePage() {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

    useEffect(() => {
        setTimeout(() => {
            setClaims(mockClaims);
            setIsLoading(false);
        }, 1500);
    }, []);

    const filteredClaims = claims.filter(claim =>
        claim.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.policyNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: ClaimStatus) => {
        switch (status) {
            case 'Approved':
                return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
            case 'Pending Verification':
                return <Badge className="bg-yellow-100 text-yellow-800">{status}</Badge>;
            case 'Query Raised':
                return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
            case 'Rejected':
                return <Badge variant="destructive">{status}</Badge>;
        }
    };
    
    const handleUpdateStatus = (claimId: string, status: ClaimStatus) => {
        setClaims(prevClaims => prevClaims.map(claim => 
            claim.id === claimId ? { ...claim, status: status } : claim
        ));
        toast({
            title: "Claim Status Updated",
            description: `Claim ${claimId} has been marked as ${status}.`
        });
        setSelectedClaim(null);
    }


    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Insurance Claims Dashboard</h2>
                <p className="text-muted-foreground">Manage and track all patient insurance claims.</p>
            </div>
             <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary"/> Claims Management</CardTitle>
                            <CardDescription>A unified view of all ongoing and past insurance claims.</CardDescription>
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
                                <TableHead>Patient & Case ID</TableHead>
                                <TableHead>Insurer & Policy</TableHead>
                                <TableHead className="text-right">Claim Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                 Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredClaims.length > 0 ? (
                                filteredClaims.map(claim => (
                                    <TableRow key={claim.id}>
                                        <TableCell>
                                            <div className="font-medium">{claim.patientName}</div>
                                            <div className="text-xs text-muted-foreground">{claim.caseId}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div>{claim.insurer}</div>
                                            <div className="font-mono text-xs text-muted-foreground">{claim.policyNumber}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">₹{claim.claimAmount.toLocaleString()}</TableCell>
                                        <TableCell>{getStatusBadge(claim.status)}</TableCell>
                                        <TableCell className="text-right">
                                           <Dialog onOpenChange={(open) => !open && setSelectedClaim(null)}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" onClick={() => setSelectedClaim(claim)}>
                                                        <FileText className="mr-2 h-3.5 w-3.5"/> Manage Claim
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>Manage Claim: {selectedClaim?.id}</DialogTitle>
                                                        <DialogDescription>
                                                           Update the status for {selectedClaim?.patientName}&apos;s claim based on communication from the insurer.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4 text-sm">
                                                         <div className="flex justify-between"><span>Patient Name:</span> <span className="font-semibold">{selectedClaim?.patientName}</span></div>
                                                         <div className="flex justify-between"><span>Insurer:</span> <span className="font-semibold">{selectedClaim?.insurer}</span></div>
                                                         <div className="flex justify-between"><span>Policy Number:</span> <span className="font-mono">{selectedClaim?.policyNumber}</span></div>
                                                         <div className="flex justify-between"><span>Submitted On:</span> <span className="font-semibold">{selectedClaim?.submittedOn}</span></div>
                                                         <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2"><span>Claim Amount:</span> <span className="text-primary">₹{selectedClaim?.claimAmount.toLocaleString()}</span></div>
                                                    </div>
                                                    <DialogFooter className="grid grid-cols-1 gap-2">
                                                        <Button variant="secondary" onClick={() => selectedClaim && handleUpdateStatus(selectedClaim.id, 'Query Raised')}>Mark as &apos;Query Raised&apos;</Button>
                                                        <Button variant="destructive" onClick={() => selectedClaim && handleUpdateStatus(selectedClaim.id, 'Rejected')}>Mark as Rejected</Button>
                                                        <Button onClick={() => selectedClaim && handleUpdateStatus(selectedClaim.id, 'Approved')} className="bg-green-600 hover:bg-green-700">Mark as Approved</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No claims found.
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
