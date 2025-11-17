
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { MessageSquare, Phone, MoreHorizontal, User, Car, Filter, FileText } from 'lucide-react'
import { useDb } from '@/lib/firebase/client-provider'
import { collection, query, onSnapshot, orderBy, Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'


interface SupportQuery {
    id: string;
    ticketId: string;
    customerName: string;
    customerPhone: string;
    query: string;
    status: 'Pending' | 'In Progress' | 'Resolved';
    createdAt: Timestamp;
    userType?: 'rider' | 'partner';
    notes?: { text: string, by: string, at: Timestamp }[];
}

export default function AdminSupportPage() {
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<SupportQuery | null>(null);
  const [note, setNote] = useState('');
  const [isNoteSubmitting, setIsNoteSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [userTypeFilter, setUserTypeFilter] = useState('All');
  const db = useDb();
  
  const adminName = 'Support Exec'; // In a real app, this would come from the admin's session

  useEffect(() => {
    if (!db) {
        toast.error('Database Error');
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    
    const q = query(collection(db, 'supportQueries'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const queriesData: SupportQuery[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportQuery));
        setQueries(queriesData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching support queries: ", error);
        toast.error('Error', { description: 'Could not fetch real-time support queries.' });
        setIsLoading(false);
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, [db]);
  
  const filteredQueries = useMemo(() => {
    return queries
      .filter(q => statusFilter === 'All' || q.status === statusFilter)
      .filter(q => userTypeFilter === 'All' || q.userType === userTypeFilter)
      .sort((a, b) => {
        const statusOrder = { 'Pending': 1, 'In Progress': 2, 'Resolved': 3 };
        return statusOrder[a.status] - statusOrder[b.status] || b.createdAt.toMillis() - a.createdAt.toMillis();
      });
  }, [queries, statusFilter, userTypeFilter]);
  
  const handleUpdateStatus = async (id: string, status: SupportQuery['status']) => {
      if (!db) return;
      const queryRef = doc(db, 'supportQueries', id);
      try {
        await updateDoc(queryRef, { status });
        toast.success(`Ticket status updated to "${status}"`);
        // No need to manually refetch; onSnapshot handles it.
      } catch (error) {
        toast.error('Update Failed', { description: 'Could not update ticket status.' });
      }
  }

  const handleAddNote = async () => {
    if (!note.trim() || !selectedQuery || !db) return;
    setIsNoteSubmitting(true);
    const queryRef = doc(db, 'supportQueries', selectedQuery.id);
    try {
        await updateDoc(queryRef, {
            notes: arrayUnion({
                text: note,
                by: adminName,
                at: Timestamp.now()
            })
        });
        toast.success('Note Added', { description: 'Your internal note has been saved.' });
        setNote('');
        // No need to manually refetch; onSnapshot handles it.
        // We also need to update the selectedQuery state to see the new note in the dialog
        setSelectedQuery(prev => prev ? {...prev, notes: [...(prev.notes || []), {text: note, by: adminName, at: Timestamp.now()}]} : null);

    } catch (error) {
        toast.error('Error', { description: 'Could not add note.' });
    } finally {
        setIsNoteSubmitting(false);
    }
  };

  const getStatusBadge = (status: SupportQuery['status']) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="destructive">{status}</Badge>
      case 'In Progress':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/40 dark:text-yellow-200">{status}</Badge>
      case 'Resolved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/40 dark:text-green-200">{status}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Unified Support Center</CardTitle>
            <CardDescription>Live incoming queries and support tickets from all Riders and Partners.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
            </Select>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by User Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All User Types</SelectItem>
                    <SelectItem value="rider">Riders</SelectItem>
                    <SelectItem value="partner">Partners</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>User Details</TableHead>
              <TableHead>Query</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
            ) : filteredQueries.length > 0 ? (
                filteredQueries.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-xs">{q.ticketId}</TableCell>
                    <TableCell>
                        <div className="font-medium flex items-center gap-2">
                           {q.userType === 'partner' ? 
                             <Car className="w-4 h-4 text-muted-foreground" aria-label="Partner" /> : 
                             <User className="w-4 h-4 text-muted-foreground" arial-label="Rider" />
                           }
                           {q.customerName}
                        </div>
                        <div className="text-xs text-muted-foreground ml-6">{q.customerPhone}</div>
                    </TableCell>
                    <TableCell className="max-w-sm">
                        <p className="truncate">{q.query}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(q.status)}</TableCell>
                    <TableCell className="text-right">
                       <Dialog onOpenChange={(open) => !open && setSelectedQuery(null)}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DialogTrigger asChild>
                                        <DropdownMenuItem onClick={() => setSelectedQuery(q)}>
                                            <FileText className="mr-2 h-4 w-4" /> View Details & Notes
                                        </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DropdownMenuItem asChild>
                                        <a href={`tel:${q.customerPhone}`}><Phone className="mr-2 h-4 w-4" /> Call Customer</a>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(q.id, 'In Progress')}>Set to In Progress</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(q.id, 'Resolved')}>Mark as Resolved</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Ticket Details: {selectedQuery?.ticketId}</DialogTitle>
                                    <DialogDescription>
                                        Query from {selectedQuery?.customerName} ({selectedQuery?.userType})
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Card>
                                        <CardContent className="p-4">
                                            <p className="font-semibold">Original Query:</p>
                                            <p className="text-muted-foreground">{selectedQuery?.query}</p>
                                        </CardContent>
                                    </Card>
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">Internal Notes</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {selectedQuery?.notes?.length ? selectedQuery.notes.map((n, i) => (
                                                <div key={i} className="text-xs p-2 bg-muted rounded-md">
                                                    <p className="font-semibold">{n.by} <span className="text-muted-foreground font-normal">at {n.at.toDate().toLocaleString()}</span></p>
                                                    <p>{n.text}</p>
                                                </div>
                                            )) : <p className="text-xs text-muted-foreground text-center py-4">No internal notes yet.</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="note">Add a new note</Label>
                                        <Textarea id="note" value={note} onChange={e => setNote(e.target.value)} placeholder="Add internal notes for your team..." />
                                        <Button onClick={handleAddNote} disabled={isNoteSubmitting}>
                                            {isNoteSubmitting ? 'Saving...' : 'Add Note'}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No support queries found for the selected filters.
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
