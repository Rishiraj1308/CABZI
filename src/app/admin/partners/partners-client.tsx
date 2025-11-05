
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Car, Wrench, MoreHorizontal, Trash2, Search, Check, X, Ban, Ambulance, Stethoscope, Clock, BadgeCheck, Handshake, CheckCircle, CircleHelp, AlertTriangle } from 'lucide-react'
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
import { useDb } from '@/firebase/client-provider'
import { collection, getDocs, query, doc, updateDoc, deleteDoc, onSnapshot, collectionGroup, where, Timestamp } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PartnerData {
  id: string;
  name: string;
  phone: string;
  partnerId?: string;
  status?: string;
  docStatus?: 'Verified' | 'Pending' | 'Awaiting Final Approval' | 'Rejected';
  type: 'driver' | 'mechanic' | 'cure' | 'doctor';
  createdAt: Timestamp;
  specialization?: string;
  hospitalName?: string;
  hospitalId?: string;
}

interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
}

const StatCard = ({ title, value, description, icon: Icon }: StatCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);


export default function PartnersClient() {
  const [allPartners, setAllPartners] = useState<PartnerData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const db = useDb();

  const fetchAllPartners = useCallback(async () => {
    if(!db) return;
    setIsLoading(true);

    const collectionsToFetch = [
        { name: 'partners', type: 'driver' },
        { name: 'mechanics', type: 'mechanic' },
        { name: 'ambulances', type: 'cure' }
    ];
    
    let allPartnersData: PartnerData[] = [];

    const partnerPromises = collectionsToFetch.map(async ({ name, type }) => {
        try {
            const q = query(collection(db, name));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    type: type,
                } as PartnerData;
            });
        } catch (error) {
            console.error(`Error fetching from ${name}:`, error);
            return [];
        }
    });

    const doctorQuery = query(collectionGroup(db, 'doctors'));
    const doctorPromise = getDocs(doctorQuery).then(snapshot => 
        snapshot.docs.map(doc => {
            const data = doc.data();
            const pathParts = doc.ref.path.split('/');
            const hospitalId = pathParts[1]; 
            return {
                id: doc.id,
                name: `Dr. ${data.name}`,
                phone: data.phone,
                partnerId: data.partnerId,
                docStatus: data.docStatus, 
                type: 'doctor',
                createdAt: data.createdAt,
                specialization: data.specialization,
                hospitalId: hospitalId,
            } as PartnerData;
        })
    );


    try {
        const results = await Promise.all([...partnerPromises, doctorPromise]);
        allPartnersData = results.flat();
        
        // Add hospital names to doctors
        const hospitalIds = allPartnersData.filter(p => p.type === 'doctor' && p.hospitalId).map(p => p.hospitalId!);
        if (hospitalIds.length > 0) {
            const uniqueHospitalIds = [...new Set(hospitalIds)];
            const hospitalsQuery = query(collection(db, 'ambulances'), where('__name__', 'in', uniqueHospitalIds));
            const hospitalsSnap = await getDocs(hospitalsQuery);
            const hospitalNames: Record<string, string> = {};
            hospitalsSnap.forEach(doc => {
                hospitalNames[doc.id] = doc.data().name;
            });
            allPartnersData = allPartnersData.map(p => {
                if (p.type === 'doctor' && p.hospitalId && hospitalNames[p.hospitalId]) {
                    return { ...p, hospitalName: hospitalNames[p.hospitalId] };
                }
                return p;
            });
        }
        
        allPartnersData.sort((a, b) => (b.createdAt?.toDate?.().getTime() || 0) - (a.createdAt?.toDate?.().getTime() || 0));
        setAllPartners(allPartnersData);
    } catch(error) {
        console.error("Error fetching all partners:", error);
    } finally {
        setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchAllPartners();
  }, [fetchAllPartners]);

  const filteredPartners = useMemo(() => {
    if (!searchQuery) {
        return allPartners;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return allPartners.filter(partner => 
        (partner.name && partner.name.toLowerCase().includes(lowercasedQuery)) ||
        (partner.phone && partner.phone.includes(lowercasedQuery)) ||
        (partner.partnerId && partner.partnerId.toLowerCase().includes(lowercasedQuery))
    );
  }, [allPartners, searchQuery]);
  
  const stats = useMemo(() => {
    return {
      total: allPartners.length,
      verified: allPartners.filter(p => p.status === 'verified' || p.docStatus === 'Verified').length,
      pending: allPartners.filter(p => p.status === 'pending_verification' || p.docStatus === 'Pending' || p.docStatus === 'Awaiting Final Approval').length,
      flagged: allPartners.filter(p => p.status === 'rejected' || p.docStatus === 'Rejected' || p.status === 'suspended').length,
    }
  }, [allPartners]);


  const getCollectionName = (type: string, hospitalId?: string) => {
    switch (type) {
      case 'driver': return 'partners';
      case 'mechanic': return 'mechanics';
      case 'cure': return 'ambulances';
      case 'doctor': return `ambulances/${hospitalId}/doctors`;
      default: return null;
    }
  };

  const handleUpdateStatus = async (partner: PartnerData, newStatus: string) => {
    const { id, type, hospitalId, name } = partner;
    const collectionName = getCollectionName(type, hospitalId);
    if (!collectionName || !db) return;
    
    const partnerRef = doc(db, collectionName, id);
    
    // For doctors, the status field is 'docStatus', for others it is 'status'.
    const fieldToUpdate = type === 'doctor' ? 'docStatus' : 'status';

    try {
        await updateDoc(partnerRef, { [fieldToUpdate]: newStatus });
        toast({
            title: 'Status Updated',
            description: `${name}'s status has been set to ${newStatus}.`,
        });
        fetchAllPartners();
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update partner status.' });
    }
  }
  
  const handleDeletePartner = async (partner: PartnerData) => {
    const { id, type, hospitalId, name } = partner;
    const collectionName = getCollectionName(type, hospitalId);
    if (!collectionName || !db) return;

    const docId = id;
    const partnerRef = doc(db, collectionName, docId);
    try {
        await deleteDoc(partnerRef);
        toast({
            variant: 'destructive',
            title: 'Partner Deleted',
            description: `${name} has been permanently removed from the system.`
        });
        fetchAllPartners();
    } catch (e) {
         toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete partner.' });
    }
  }

  const getStatusBadge = (status?: string | 'Verified' | 'Pending' | 'Awaiting Final Approval' | 'Rejected') => {
    switch (status) {
      case 'verified':
      case 'Verified':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/40 dark:text-green-200">Verified</Badge>
      case 'pending_verification':
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/40 dark:text-yellow-200">Pending</Badge>
      case 'rejected':
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'suspended':
        return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-500/80">Suspended</Badge>
       case 'Awaiting Final Approval':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900/40 dark:text-blue-200"><Clock className="w-3 h-3 mr-1"/> Awaiting Approval</Badge>
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  }

  const getPartnerTypeContent = (partner: PartnerData) => {
      switch(partner.type) {
          case 'mechanic':
              return <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-amber-600"/><span>ResQ Partner</span></div>;
          case 'cure':
              return <div className="flex items-center gap-2"><Ambulance className="h-4 w-4 text-red-600"/><span>Cure Partner</span></div>;
          case 'doctor':
              return <div className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-blue-600"/><span>Doctor</span></div>;
          case 'driver':
          default:
              return <div className="flex items-center gap-2"><Car className="h-4 w-4 text-primary"/><span>Path Partner</span></div>;
      }
  }

  const renderTable = (partnerType: 'driver' | 'mechanic' | 'cure' | 'doctor') => {
      const data = filteredPartners.filter(p => p.type === partnerType);
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              {partnerType === 'doctor' && <TableHead>Hospital</TableHead>}
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    {partnerType === 'doctor' && <TableCell><Skeleton className="h-5 w-40" /></TableCell>}
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
            ) : data.length > 0 ? (
              data.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">
                     <Link
                        href={`/admin/partners/${partner.id}?type=${partner.type.toLowerCase()}${partner.hospitalId ? `&hospitalId=${partner.hospitalId}` : ''}`}
                        className="hover:underline text-primary">
                        {partner.name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">{partner.partnerId || 'N/A'}</p>
                  </TableCell>
                  {partnerType === 'doctor' && (
                    <TableCell className="text-xs text-muted-foreground">{partner.hospitalName || 'N/A'}</TableCell>
                  )}
                  <TableCell>+91 {partner.phone}</TableCell>
                  <TableCell>{getStatusBadge(partner.docStatus || partner.status)}</TableCell>
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
                                 <Link href={`/admin/partners/${partner.id}?type=${partner.type.toLowerCase()}${partner.hospitalId ? `&hospitalId=${partner.hospitalId}` : ''}`}>View Details</Link>
                              </DropdownMenuItem>
                              {(partner.status === 'pending_verification' || partner.docStatus === 'Awaiting Final Approval' || partner.status === 'Rejected' || partner.docStatus === 'Rejected') && (
                                  <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(partner, 'Verified')}>
                                          <Check className="mr-2 h-4 w-4 text-green-500" /> Approve
                                      </DropdownMenuItem>
                                  </>
                              )}
                              {partner.status !== 'rejected' && partner.docStatus !== 'Rejected' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(partner, 'rejected')}>
                                     <X className="mr-2 h-4 w-4 text-red-500" /> Reject
                                  </DropdownMenuItem>
                              )}
                               <DropdownMenuSeparator />
                               <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete Partner
                                  </DropdownMenuItem>
                               </AlertDialogTrigger>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the partner <span className="font-bold">{partner.name}</span> and all their associated data.
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
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No partners of this type found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Partners" value={isLoading ? '...' : stats.total} description="Path, ResQ, and Cure" icon={Handshake} />
        <StatCard title="Verified" value={isLoading ? '...' : stats.verified} description="Active on the platform" icon={CheckCircle} />
        <StatCard title="Pending Verification" value={isLoading ? '...' : stats.pending} description="Awaiting admin approval" icon={CircleHelp} />
        <StatCard title="Flagged/Rejected" value={isLoading ? '...' : stats.flagged} description="Suspended or rejected partners" icon={AlertTriangle} />
      </div>
      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                  <CardTitle>Unified Partner Management</CardTitle>
                  <CardDescription>View, approve, or reject all partners across the CPR ecosystem.</CardDescription>
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
          <Tabs defaultValue="path">
              <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="path">Path (Drivers)</TabsTrigger>
                  <TabsTrigger value="resq">ResQ (Mechanics)</TabsTrigger>
                  <TabsTrigger value="cure">Cure (Hospitals)</TabsTrigger>
                  <TabsTrigger value="doctors">Doctor Approvals</TabsTrigger>
              </TabsList>
              <TabsContent value="path" className="mt-4">
                {renderTable('driver')}
              </TabsContent>
              <TabsContent value="resq" className="mt-4">
                {renderTable('mechanic')}
              </TabsContent>
              <TabsContent value="cure" className="mt-4">
                {renderTable('cure')}
              </TabsContent>
               <TabsContent value="doctors" className="mt-4">
                {renderTable('doctor')}
              </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  )
}

    