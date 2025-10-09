
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Car, Wrench, Handshake, CircleHelp, CheckCircle, AlertTriangle, MoreHorizontal, Trash2, Search, Check, X, Ban, Ambulance } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, deleteDoc, orderBy } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input'
import Link from 'next/link'


interface Partner {
    id: string;
    type: 'driver' | 'mechanic' | 'cure';
    partnerId?: string; // For the custom ID like CZD...
    name: string;
    phone: string;
    vehicleType?: string;
    vehicleName?: string;
    vehicleNumber?: string;
    services?: string[];
    garageName?: string;
    status: 'verified' | 'pending_verification' | 'rejected' | 'suspended';
    createdAt: Timestamp;
    suspensionEndDate?: Timestamp | null;
}

export default function AdminPartnersPage() {
  const [allPartners, setAllPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      toast({ variant: 'destructive', title: 'Database Error', description: 'Could not connect to Firestore.' });
      setIsLoading(false);
      return;
    }

    const collectionsToWatch: { name: 'partners' | 'mechanics' | 'ambulances', type: Partner['type'] }[] = [
        { name: 'partners', type: 'driver' },
        { name: 'mechanics', type: 'mechanic' },
        { name: 'ambulances', type: 'cure' }
    ];

    const unsubscribes = collectionsToWatch.map(({ name, type }) => {
        const q = query(collection(db, name), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                type: type,
                ...doc.data()
            } as Partner));
            
            setAllPartners(prev => {
                // Create a map of the new data for quick lookup
                const newDocsMap = new Map(data.map(d => [d.id, d]));
                
                // Filter out old docs from this source and add the new ones
                const otherSources = prev.filter(p => p.type !== type);
                
                // Combine and sort
                const combined = [...otherSources, ...Array.from(newDocsMap.values())];
                combined.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                return combined;
            });
            setIsLoading(false);
        }, (error) => {
            console.error(`Error fetching ${name}: `, error);
            toast({
              variant: 'destructive',
              title: 'Permission Denied',
              description: `Could not fetch data from the '${name}' collection. Check Firestore rules.`,
            });
            setIsLoading(false);
        });
    });

    return () => {
        unsubscribes.forEach(unsub => unsub());
    };
  }, [toast]);
  

  const partnerStats = useMemo(() => {
      return {
          total: allPartners.length,
          verified: allPartners.filter(p => p.status === 'verified').length,
          pending: allPartners.filter(p => p.status === 'pending_verification').length,
          rejected: allPartners.filter(p => p.status === 'rejected' || p.status === 'suspended').length
      }
  }, [allPartners])

  const filteredPartners = useMemo(() => {
    if (!searchQuery) {
        return allPartners;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return allPartners.filter(partner => 
        partner.name.toLowerCase().includes(lowercasedQuery) ||
        partner.phone.includes(lowercasedQuery) ||
        (partner.partnerId && partner.partnerId.toLowerCase().includes(lowercasedQuery))
    );
  }, [allPartners, searchQuery]);


  const handleUpdateStatus = async (partner: Partner, newStatus: Partner['status']) => {
    if (!db) return;
    const collectionName = partner.type === 'driver' 
      ? 'partners' 
      : partner.type === 'mechanic' 
          ? 'mechanics' 
          : 'ambulances';
    const partnerRef = doc(db, collectionName, partner.id);
    
    try {
      let updateData: any = { status: newStatus };
      if (newStatus === 'suspended') {
          const suspensionEndDate = new Date();
          suspensionEndDate.setDate(suspensionEndDate.getDate() + 7);
          updateData.suspensionEndDate = Timestamp.fromDate(suspensionEndDate);
      } else {
          updateData.suspensionEndDate = null;
      }
      
      await updateDoc(partnerRef, updateData);
      toast({
        title: 'Status Updated',
        description: `Partner has been ${newStatus}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the partner status.',
      });
    }
  }
  
  const handleDeletePartner = async (partner: Partner) => {
      if (!db) return;
      const collectionName = partner.type === 'driver' 
        ? 'partners' 
        : partner.type === 'mechanic' 
            ? 'mechanics' 
            : 'ambulances';
      
      const partnerRef = doc(db, collectionName, partner.id);
      try {
        await deleteDoc(partnerRef);
        toast({
            variant: 'destructive',
            title: 'Partner Deleted',
            description: `${partner.name} has been permanently removed from the system.`
        });
      } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the partner.',
          });
      }
  }

  const getStatusBadge = (status: Partner['status']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/40 dark:text-green-200">Verified</Badge>
      case 'pending_verification':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/40 dark:text-yellow-200">Pending</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'suspended':
        return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-500/80">Suspended</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPartnerTypeContent = (partner: Partner) => {
      switch(partner.type) {
          case 'mechanic':
              return <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground"/><span>ResQ Partner</span></div>;
          case 'cure':
              return <div className="flex items-center gap-2"><Ambulance className="h-4 w-4 text-muted-foreground"/><span>Cure Partner</span></div>;
          case 'driver':
          default:
              return <div className="flex items-center gap-2"><Car className="h-4 w-4 text-muted-foreground"/><span>Path Partner</span></div>;
      }
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
                <Handshake className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{partnerStats.total}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{partnerStats.verified}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
                <CircleHelp className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{partnerStats.pending}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flagged/Rejected</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{partnerStats.rejected}</div></CardContent>
            </Card>
        </div>
        <Card>
          <CardHeader>
             <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <CardTitle>Unified Partner Management</CardTitle>
                    <CardDescription>A unified list of all Path, ResQ, and Cure partners.</CardDescription>
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
                  <TableHead>Partner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPartners.length > 0 ? (
                  filteredPartners.map((partner) => (
                    <TableRow key={`${partner.type}-${partner.id}`}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/partners/details?id=${partner.id}`} className="hover:underline text-primary">
                          {partner.name}
                        </Link>
                         <p className="text-xs text-muted-foreground font-mono">{partner.partnerId || 'N/A'}</p>
                      </TableCell>
                      <TableCell>
                         {getPartnerTypeContent(partner)}
                      </TableCell>
                      <TableCell>+91 {partner.phone}</TableCell>
                      <TableCell>{getStatusBadge(partner.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                    <Link href={`/admin/partners/details?id=${partner.id}`}>View Details</Link>
                                </DropdownMenuItem>
                                {partner.status === 'pending_verification' && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(partner, 'verified')}>
                                            <Check className="mr-2 h-4 w-4 text-green-500" /> Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(partner, 'rejected')}>
                                           <X className="mr-2 h-4 w-4 text-red-500" /> Reject
                                        </DropdownMenuItem>
                                    </>
                                )}
                                 <DropdownMenuSeparator />
                                 <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-orange-600 focus:bg-orange-100 focus:text-orange-700">
                                           <Ban className="mr-2 h-4 w-4" /> Suspend Account
                                        </DropdownMenuItem>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Suspend {partner.name} for 7 days?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will temporarily block the partner from logging in and receiving jobs. The account will be automatically unsuspended after 7 days. Are you sure?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleUpdateStatus(partner, 'suspended')} className="bg-orange-500 hover:bg-orange-600">
                                                Yes, suspend for 7 days
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                 </AlertDialog>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Partner
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the partner <span className="font-bold">{partner.name}</span> and all their associated data from the servers.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeletePartner(partner)} className="bg-destructive hover:bg-destructive/90">
                                                Yes, delete partner
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {searchQuery ? `No partners found for "${searchQuery}".` : 'No partners have signed up yet.'}
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
