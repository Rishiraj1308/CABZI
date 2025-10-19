
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useFirestore } from '@/firebase/client-provider'
import { collection, query, getDocs, orderBy, Timestamp, doc, deleteDoc, updateDoc, writeBatch, getDoc } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Search, Ambulance, MoreHorizontal, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface EmergencyCase {
  id: string;
  caseId: string;
  riderName: string;
  phone: string;
  assignedPartner?: { id: string; name: string, ambulanceName?: string }; // ambulanceName is new
  assignedAmbulanceId?: string;
  status: 'pending' | 'accepted' | 'onTheWay' | 'inTransit' | 'completed' | 'cancelled_by_rider' | 'cancelled_by_partner' | 'cancelled_by_admin';
  createdAt: Timestamp;
}

export default function AdminCureCasesPage() {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const db = useFirestore();

  const fetchCases = async () => {
    if (!db) {
      toast({ variant: 'destructive', title: 'Database Error' });
      setIsLoading(false);
      return;
    }
    
    try {
        const q = query(collection(db, 'emergencyCases'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const casesData: EmergencyCase[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmergencyCase));
        setCases(casesData);
    } catch (error) {
        console.error("Error fetching emergency cases: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch emergency cases data.',
        });
    } finally {
        setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCases();
  }, [toast, db]);

  const filteredCases = useMemo(() => {
    if (!searchQuery) {
      return cases;
    }
    return cases.filter(c =>
        c.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.riderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.assignedPartner?.name && c.assignedPartner.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [cases, searchQuery]);

   const getStatusBadge = (status: EmergencyCase['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Completed</Badge>
      case 'accepted':
      case 'onTheWay':
      case 'inTransit':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 capitalize">{status.replace(/([A-Z])/g, ' $1')}</Badge>;
      case 'cancelled_by_rider':
      case 'cancelled_by_partner':
      case 'cancelled_by_admin':
        return <Badge variant="destructive">Cancelled</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }
  
  const freeUpAmbulance = async (caseData: EmergencyCase) => {
      if (!db || !caseData.assignedPartner?.id || !caseData.assignedAmbulanceId) {
          return null; // No ambulance was assigned, nothing to do
      }
      
      const ambulanceRef = doc(db, `ambulances/${caseData.assignedPartner.id}/fleet`, caseData.assignedAmbulanceId);
      const ambulanceSnap = await getDoc(ambulanceRef);

      if (ambulanceSnap.exists()) {
          return { ref: ambulanceRef, needsUpdate: ambulanceSnap.data().status === 'On-Duty' };
      }
      return null;
  }

  const handleCancelCase = async (caseInfo: EmergencyCase) => {
    if (!db) return;
    try {
        const batch = writeBatch(db);
        
        // 1. Mark the case as cancelled
        const caseRef = doc(db, 'emergencyCases', caseInfo.id);
        batch.update(caseRef, { status: 'cancelled_by_admin' });
        
        // 2. Free up the ambulance if it was on duty
        const ambulanceToFree = await freeUpAmbulance(caseInfo);
        if (ambulanceToFree?.needsUpdate) {
            batch.update(ambulanceToFree.ref, { status: 'Available' });
        }

        await batch.commit();

        toast({
            title: 'Case Cancelled',
            description: `The emergency case has been manually cancelled.`,
        });
        fetchCases(); // Re-fetch data to update UI
    } catch (error) {
        console.error("Error cancelling case: ", error);
        toast({
            variant: 'destructive',
            title: 'Action Failed',
            description: 'Could not cancel the case from the database.',
        });
    }
  }

  const handleDeleteCase = async (caseInfo: EmergencyCase) => {
    if (!db) return;
    try {
        const batch = writeBatch(db);
        
        // 1. Mark the case for deletion
        const caseRef = doc(db, 'emergencyCases', caseInfo.id);
        batch.delete(caseRef);

        // 2. Free up the ambulance if it was on duty
        const ambulanceToFree = await freeUpAmbulance(caseInfo);
        if (ambulanceToFree?.needsUpdate) {
            batch.update(ambulanceToFree.ref, { status: 'Available' });
        }
        
        await batch.commit();
        
        toast({
            variant: 'destructive',
            title: 'Case Deleted',
            description: `The emergency case has been permanently removed.`,
        });
        fetchCases(); // Re-fetch data to update UI
    } catch (error) {
        console.error("Error deleting case: ", error);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the case from the database.',
        });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Ambulance className="w-6 h-6 text-destructive"/> Cure Emergency Cases</CardTitle>
            <CardDescription>A complete log of all emergency requests handled by Cure Partners.</CardDescription>
          </div>
          <div className="relative w-full md:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Search by Case ID, Names..."
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
              <TableHead>Assigned Hospital / Ambulance</TableHead>
              <TableHead>Date &amp; Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
            ) : filteredCases.length > 0 ? (
                filteredCases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.caseId}</TableCell>
                    <TableCell>
                        <div className="font-medium">{c.riderName}</div>
                        <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{c.assignedPartner?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{c.assignedPartner?.ambulanceName || 'N/A'}</div>
                    </TableCell>
                    <TableCell>{c.createdAt ? c.createdAt.toDate().toLocaleString() : 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell className="text-right">
                         <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                     <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-orange-600 focus:bg-orange-100 focus:text-orange-700">
                                            <XCircle className="mr-2 h-4 w-4" /> Cancel Case
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                     <AlertDialog>
                                         <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Case
                                            </DropdownMenuItem>
                                         </AlertDialogTrigger>
                                         <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the case <span className="font-bold">{c.caseId}</span> and remove it from all records.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteCase(c)} className="bg-destructive hover:bg-destructive/90">
                                                        Yes, delete this case
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                     </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will manually cancel the case <span className="font-bold">{c.caseId}</span>. The assigned ambulance will be freed up. This should only be done if the case is stuck or invalid.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleCancelCase(c)} className="bg-orange-500 hover:bg-orange-600">
                                        Yes, cancel this case
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No emergency cases have been recorded yet.
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
