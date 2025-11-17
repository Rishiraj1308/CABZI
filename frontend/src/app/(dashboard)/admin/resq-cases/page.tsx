
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDb } from '@/lib/firebase/client-provider'
import { collection, query, onSnapshot, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Search, Wrench, MoreHorizontal, Trash2 } from 'lucide-react'
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
import Link from 'next/link'

interface ResQCase {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  issue: string;
  mechanicName?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled_by_driver' | 'cancelled_by_mechanic' | 'bill_sent' | 'payment_pending' | 'cancelled_by_user';
  createdAt: Timestamp;
}

export default function AdminResQCasesPage() {
  const [cases, setCases] = useState<ResQCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const db = useDb();

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }
    
    const q = query(collection(db, 'garageRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const casesData: ResQCase[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResQCase));
        setCases(casesData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching ResQ cases: ", error);
        toast.error('Error', { description: 'Could not fetch service request data.'});
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const filteredCases = useMemo(() => {
    if (!searchQuery) {
      return cases;
    }
    return cases.filter(c =>
        c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.mechanicName && c.mechanicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.issue.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cases, searchQuery]);

   const getStatusBadge = (status: ResQCase['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Completed</Badge>
      case 'accepted':
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 capitalize">{status.replace(/_/g, ' ')}</Badge>;
      case 'cancelled_by_driver':
      case 'cancelled_by_mechanic':
      case 'cancelled_by_user':
        return <Badge variant="destructive">Cancelled</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">Pending</Badge>
      case 'bill_sent':
         return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">Bill Sent</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, 'garageRequests', caseId));
        toast.error('Request Deleted', {
            description: `The service request has been permanently removed.`,
        });
        // The onSnapshot listener will update the UI automatically.
    } catch (error) {
        console.error("Error deleting case: ", error);
        toast.error('Deletion Failed', {
            description: 'Could not delete the case from the database.',
        });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Wrench className="w-6 h-6 text-amber-600"/> ResQ Service Requests</CardTitle>
            <CardDescription>A complete log of all roadside assistance jobs handled by ResQ Partners.</CardDescription>
          </div>
          <div className="relative w-full md:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Search by names, issue..."
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
              <TableHead>Request ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Assigned Mechanic</TableHead>
              <TableHead>Date &amp; Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
            ) : filteredCases.length > 0 ? (
                filteredCases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.id.substring(0, 10)}...</TableCell>
                    <TableCell>
                       <Link href={`/admin/user?id=${c.userId}`} className="font-medium hover:underline text-primary">{c.userName}</Link>
                       <div className="text-xs text-muted-foreground">{c.userPhone}</div>
                    </TableCell>
                     <TableCell>
                        <div className="font-medium">{c.issue}</div>
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{c.mechanicName || 'N/A'}</div>
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
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Request
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete this service request from all records.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCase(c.id)} className="bg-destructive hover:bg-destructive/90">
                                        Yes, delete this request
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No service requests have been recorded yet.
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
