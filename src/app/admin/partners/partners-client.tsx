'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Car, Wrench, MoreHorizontal, Trash2, Search, Check, X, Ban, Ambulance } from 'lucide-react'
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
import { useFirestore } from '@/firebase/client-provider'
import { collection, getDocs, query, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'

interface PartnerData {
  id: string;
  name: string;
  phone: string;
  partnerId?: string;
  status: string;
  type: 'driver' | 'mechanic' | 'cure';
  createdAt: { toDate: () => Date };
}

export default function PartnersClient() {
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const db = useFirestore();

  const fetchAllPartners = async () => {
    if(!db) return;
    setIsLoading(true);

    const collectionsToFetch = [
        { name: 'partners', type: 'driver' },
        { name: 'mechanics', type: 'mechanic' },
        { name: 'ambulances', type: 'cure' }
    ];
    
    let allPartnersData: PartnerData[] = [];

    for (const { name, type } of collectionsToFetch) {
        try {
            const q = query(collection(db, name));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    name: docData.name,
                    phone: docData.phone,
                    partnerId: docData.partnerId,
                    status: docData.status,
                    type: type as 'driver' | 'mechanic' | 'cure',
                    createdAt: docData.createdAt,
                } as PartnerData;
            });
            allPartnersData = [...allPartnersData, ...data];
        } catch (error) {
            console.error(`Error fetching from ${name}:`, error);
        }
    }

    allPartnersData.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    setPartners(allPartnersData);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchAllPartners();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const filteredPartners = useMemo(() => {
    if (!searchQuery) {
        return partners;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return partners.filter(partner => 
        (partner.name && partner.name.toLowerCase().includes(lowercasedQuery)) ||
        (partner.phone && partner.phone.includes(lowercasedQuery)) ||
        (partner.partnerId && partner.partnerId.toLowerCase().includes(lowercasedQuery))
    );
  }, [partners, searchQuery]);
  
  const getCollectionName = (type: string) => {
    switch (type) {
      case 'driver': return 'partners';
      case 'mechanic': return 'mechanics';
      case 'cure': return 'ambulances';
      default: return null;
    }
  };


  const handleUpdateStatus = async (partnerId: string, type: string, status: 'verified' | 'rejected' | 'suspended') => {
    const collectionName = getCollectionName(type);
    if (!collectionName || !db) return;
    
    const partnerRef = doc(db, collectionName, partnerId);
    try {
        await updateDoc(partnerRef, { status });
        toast({
            title: 'Status Updated',
            description: `Partner has been ${status}.`,
        });
        fetchAllPartners(); // Re-fetch to update UI
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update partner status.' });
    }
  }
  
  const handleDeletePartner = async (partnerId: string, partnerName: string, type: string) => {
    const collectionName = getCollectionName(type);
    if (!collectionName || !db) return;

    const partnerRef = doc(db, collectionName, partnerId);
    try {
        await deleteDoc(partnerRef);
        toast({
            variant: 'destructive',
            title: 'Partner Deleted',
            description: `${partnerName} has been permanently removed from the system.`
        });
        fetchAllPartners(); // Re-fetch to update UI
    } catch (e) {
         toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete partner.' });
    }
  }

  const getStatusBadge = (status: string) => {
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

  const getPartnerTypeContent = (partner: PartnerData) => {
      switch(partner.type) {
          case 'mechanic':
              return <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-amber-600"/><span>ResQ Partner</span></div>;
          case 'cure':
              return <div className="flex items-center gap-2"><Ambulance className="h-4 w-4 text-red-600"/><span>Cure Partner</span></div>;
          case 'driver':
          default:
              return <div className="flex items-center gap-2"><Car className="h-4 w-4 text-primary"/><span>Path Partner</span></div>;
      }
  }

  return (
    <Card>
      <CardHeader>
         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <CardTitle>Unified Partner Management</CardTitle>
                <CardDescription>A list of all Path, ResQ, and Cure partners from the database.</CardDescription>
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
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
            ) : filteredPartners.length > 0 ? (
              filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">
                    <Link
                        href={`/admin/partners/${partner.id}?type=${partner.type.toLowerCase()}`}
                        className="hover:underline text-primary">
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
                                 <Link href={`/admin/partners/${partner.id}?type=${partner.type.toLowerCase()}`}>View Details</Link>
                              </DropdownMenuItem>
                              {partner.status === 'pending_verification' && (
                                  <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => handleUpdateStatus(partner.id, partner.type, 'verified')}>
                                          <Check className="mr-2 h-4 w-4 text-green-500" /> Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => handleUpdateStatus(partner.id, partner.type, 'rejected')}>
                                         <X className="mr-2 h-4 w-4 text-red-500" /> Reject
                                      </DropdownMenuItem>
                                  </>
                              )}
                               <DropdownMenuSeparator />
                               <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-orange-600 focus:bg-orange-100 focus:text-orange-700">
                                     <Ban className="mr-2 h-4 w-4" /> Suspend Account
                                  </DropdownMenuItem>
                               </AlertDialogTrigger>
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
                                              <AlertDialogAction onClick={() => handleDeletePartner(partner.id, partner.name || '', partner.type)} className="bg-destructive hover:bg-destructive/90">
                                                  Yes, delete partner
                                              </AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                               </AlertDialog>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Suspend {partner.name} for 7 days?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This will temporarily block the partner from logging in and receiving jobs.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleUpdateStatus(partner.id, partner.type, 'suspended')} className="bg-orange-500 hover:bg-orange-600">
                                  Yes, suspend for 7 days
                              </AlertDialogAction>
                          </AlertDialogFooter>
                       </AlertDialogContent>
                    </AlertDialog>
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
  )
}
