
'use client'

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { PlusCircle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface Vendor {
    id: string;
    name: string;
    service: string;
    commissionModel: string;
    totalPayouts: number;
    dueAmount: number;
    status: 'Active' | 'Inactive' | 'Pending';
    phone?: string;
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast();
  
  useEffect(() => {
      if (!db) {
          setIsLoading(false);
          toast({ variant: 'destructive', title: 'Database Error' });
          return;
      }
      const q = query(collection(db, 'vendors'), orderBy('name'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const vendorsData: Vendor[] = [];
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              vendorsData.push({ 
                  id: doc.id, 
                  ...data,
                  status: data.status,
              } as Vendor);
          });
          setVendors(vendorsData);
          setIsLoading(false);
      });
      return () => unsubscribe();
  }, [toast]);
  
  const filteredVendors = useMemo(() => {
    if (!searchQuery) {
      return vendors;
    }
    return vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.service.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vendors, searchQuery]);

  const getStatusBadge = (status: Vendor['status']) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/40 dark:text-green-200">{status}</Badge>
      case 'Inactive':
        return <Badge variant="secondary">{status}</Badge>
       case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/40 dark:text-yellow-200">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }
  
  const handleAddVendor = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!db) return;
      
      const formData = new FormData(event.currentTarget);
      const name = formData.get('name') as string;
      const service = formData.get('service') as string;
      const commissionModel = formData.get('commissionModel') as string;

      if (!name || !service || !commissionModel) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all fields.' });
          return;
      }

      try {
          await addDoc(collection(db, 'vendors'), {
              name,
              service,
              commissionModel,
              totalPayouts: 0,
              dueAmount: 0,
              status: 'Active',
          });
          toast({ title: 'Vendor Added', description: `${name} has been added to the platform.` });
          setIsDialogOpen(false);
          event.currentTarget.reset();
      } catch (error) {
          console.error("Error adding vendor: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to add vendor.' });
      }
  }

  const handleSettleDues = async (vendor: Vendor) => {
    if (!db || vendor.dueAmount === 0) return;
    
    const vendorRef = doc(db, 'vendors', vendor.id);
    try {
      await updateDoc(vendorRef, {
        totalPayouts: vendor.totalPayouts + vendor.dueAmount,
        dueAmount: 0
      });
      toast({
          title: 'Settlement Processed',
          description: `₹${vendor.dueAmount.toLocaleString()} has been paid to ${vendor.name}.`,
      });
    } catch (error) {
      console.error("Error settling dues: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to settle dues.' });
    }
  }

  return (
    <Card>
      <CardHeader>
         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <CardTitle>Vendor & Payouts Management</CardTitle>
                <CardDescription>Oversee all third-party vendors (e.g., Insurance, Spare Parts) and settle their payments. ResQ partners are managed under the main "Partners" panel.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Search by Name, Service..."
                      className="pl-8 sm:w-full md:w-[250px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="shrink-0">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Vendor
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Vendor</DialogTitle>
                            <DialogDescription>
                                Enter the details of the new vendor to add them to the platform.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddVendor}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Vendor Name</Label>
                                    <Input id="name" name="name" className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="service" className="text-right">Service</Label>
                                    <Input id="service" name="service" placeholder="e.g., Insurance Provider" className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="commissionModel" className="text-right">Commission</Label>
                                    <Input id="commissionModel" name="commissionModel" placeholder="e.g., 5% per policy" className="col-span-3" required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Add Vendor</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Commission Model</TableHead>
              <TableHead className="text-right">Total Payouts</TableHead>
              <TableHead className="text-right">Due Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({length: 3}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : filteredVendors.length > 0 ? (
                filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-xs text-muted-foreground">{vendor.service}</div>
                    </TableCell>
                    <TableCell>{vendor.commissionModel}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">₹{vendor.totalPayouts.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">₹{vendor.dueAmount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                    <TableCell className="text-right">
                         <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSettleDues(vendor)}
                            disabled={vendor.dueAmount === 0}
                        >
                            Settle Dues
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        {searchQuery ? 'No vendors found with your search query.' : 'No vendors added yet.'}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
