'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFirestore } from '@/firebase/client-provider'
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Search, Users } from 'lucide-react'
import Link from 'next/link'

interface Customer {
    id: string;
    customerId?: string; // This might not exist on all user docs yet
    name: string;
    phone: string;
    createdAt: Timestamp;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast();
  const db = useFirestore();

  useEffect(() => {
    const fetchCustomers = async () => {
        if (!db) {
          toast({
            variant: 'destructive',
            title: 'Database Error',
            description: 'Could not connect to Firestore.',
          });
          setIsLoading(false);
          return;
        }

        try {
            const q = query(collection(db, 'users'), where('role', '==', 'rider'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const customersData: Customer[] = [];
            querySnapshot.forEach((doc) => {
              customersData.push({ id: doc.id, ...doc.data() } as Customer);
            });
            setCustomers(customersData);
        } catch(error) {
             console.error("Error fetching customers: ", error);
              toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch customer data.',
              });
        } finally {
            setIsLoading(false);
        }
    }
    fetchCustomers();
  }, [toast, db]);
  
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) {
      return customers;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return customers.filter(customer => 
        customer.name.toLowerCase().includes(lowercasedQuery) ||
        customer.phone.includes(lowercasedQuery) ||
        (customer.customerId && customer.customerId.toLowerCase().includes(lowercasedQuery))
    );
  }, [customers, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="w-6 h-6 text-primary"/> All Customers (Riders)</CardTitle>
            <CardDescription>A list of all registered riders on the platform from the database.</CardDescription>
          </div>
          <div className="relative w-full md:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Search by Name, Phone, ID..."
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
              <TableHead>Customer Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Joined On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
            ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                        <Link
                          href={`/admin/customers/details?id=${customer.id}`}
                          className="hover:underline text-primary">
                          {customer.name}
                        </Link>
                    </TableCell>
                    <TableCell>+91 {customer.phone}</TableCell>
                    <TableCell>{customer.createdAt ? customer.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                ))
            ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                     {searchQuery ? 'No customers found with your search query.' : 'No customers have signed up yet.'}
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    