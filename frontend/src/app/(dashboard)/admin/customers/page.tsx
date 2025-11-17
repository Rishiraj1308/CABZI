
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
import { Search, Users, MoreHorizontal, Trash2 } from 'lucide-react'
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

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  role: string;
  isOnline: boolean;
  createdAt: Timestamp;
  lastSeen: Timestamp | null;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const db = useDb();

  useEffect(() => {
    if (!db) {
      toast.error('Database Error');
      setIsLoading(false);
      return;
    }
    
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const customersData: Customer[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(customersData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching customers: ", error);
        toast.error('Error', {
          description: 'Could not fetch customer data.',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) {
      return customers;
    }
    return customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [customers, searchQuery]);

  const handleDeleteCustomer = async (customerId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'users', customerId));
      toast.error('Customer Deleted', {
        description: `The user has been permanently removed.`,
      });
      // The onSnapshot listener will automatically update the UI
    } catch (error) {
      console.error("Error deleting customer: ", error);
      toast.error('Deletion Failed', {
        description: 'Could not delete the user from the database.',
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="w-6 h-6 text-primary"/> User Management</CardTitle>
            <CardDescription>View, search, and manage all registered users on the platform.</CardDescription>
          </div>
          <div className="relative w-full md:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Search by name, phone, email..."
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
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Date Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
            ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/user?id=${c.id}`} className="hover:underline hover:text-primary">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                        <div>{c.phone}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                    </TableCell>
                    <TableCell className="capitalize">{c.role}</TableCell>
                    <TableCell>{c.createdAt ? c.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                        <Badge className={c.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {c.isOnline ? 'Online' : 'Offline'}
                        </Badge>
                    </TableCell>
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
                                    <DropdownMenuItem asChild>
                                      <Link href={`/admin/user?id=${c.id}`}>View Details</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>Suspend User</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                     <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                        </DropdownMenuItem>
                                     </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the account for <span className="font-bold">{c.name}</span> and all associated data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCustomer(c.id)} className="bg-destructive hover:bg-destructive/90">
                                        Yes, delete this user
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
                    No users found.
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
