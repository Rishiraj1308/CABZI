
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDb } from '@/lib/firebase/client-provider'
import { collection, query, getDocs, orderBy, Timestamp, doc, updateDoc, deleteDoc, collectionGroup } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Search, MoreHorizontal, Handshake, Car, Wrench, Ambulance, Check, X, CircleHelp, AlertTriangle, Building, Hospital, Stethoscope, Clock, BadgeCheck, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type PartnerStatus = 'pending_verification' | 'verified' | 'rejected' | 'suspended';
type DoctorStatus = 'Verified' | 'Pending' | 'Awaiting Final Approval' | 'Rejected';

interface PartnerData {
  id: string;
  name: string;
  phone: string;
  partnerId?: string;
  status?: PartnerStatus;
  docStatus?: DoctorStatus;
  isOnline?: boolean;
  type: 'driver' | 'mechanic' | 'cure' | 'doctor';
  businessType?: 'Hospital' | 'Clinic';
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertAction, setAlertAction] = useState<'approve' | 'reject' | 'delete' | null>(null);

  const { toast } = useToast();
  const db = useDb();
  
  const getCollectionName = (type: PartnerData['type']) => {
    switch (type) {
      case 'driver': return 'pathPartners';
      case 'mechanic': return 'mechanics';
      case 'cure': return 'curePartners';
      case 'doctor': return 'doctors'; // This will be a collection group
    }
  };

  const fetchAllPartners = useCallback(async () => {
    if (!db) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    try {
        const collectionsToFetch = [
            { name: 'pathPartners', type: 'driver' as const },
            { name: 'mechanics', type: 'mechanic' as const },
            { name: 'curePartners', type: 'cure' as const },
        ];

        let combinedData: PartnerData[] = [];

        for (const { name, type } of collectionsToFetch) {
            const q = query(collection(db, name));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                type: type,
                ...doc.data()
            } as PartnerData));
            combinedData.push(...data);
        }

        const doctorQuery = query(collectionGroup(db, 'doctors'));
        const doctorSnapshot = await getDocs(doctorQuery);
        const doctorData = doctorSnapshot.docs.map(doc => {
            const data = doc.data();
            const pathSegments = doc.ref.path.split('/');
            const hospitalId = pathSegments.length > 2 ? pathSegments[pathSegments.length - 3] : undefined;
            return {
                id: doc.id,
                type: 'doctor' as const,
                hospitalId,
                ...data
            } as PartnerData;
        });
        combinedData.push(...doctorData);
        
        setAllPartners(combinedData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));

    } catch (error) {
       console.error("Error fetching partners:", error);
       toast({ variant: 'destructive', title: 'Error fetching partners data.' });
    } finally {
        setIsLoading(false);
    }
  }, [db, toast]);

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

  const handleUpdateStatus = async (partner: PartnerData, newStatus: string) => {
    if (!db) return;
    const isDoctor = partner.type === 'doctor';
    const collectionName = isDoctor 
      ? `curePartners/${partner.hospitalId}/doctors`
      : getCollectionName(partner.type);
    
    if (!collectionName || (isDoctor && !partner.hospitalId)) {
        toast({variant: 'destructive', title: 'Error', description: 'Invalid partner data for status update.'});
        return;
    }

    const partnerRef = doc(db, collectionName, partner.id);
    const fieldToUpdate = isDoctor ? 'docStatus' : 'status';

    try {
        await updateDoc(partnerRef, { [fieldToUpdate]: newStatus });
        toast({
            title: 'Status Updated',
            description: `${partner.name}'s status has been set to ${newStatus}.`,
        });
        fetchAllPartners(); // Refetch data
    } catch(e) {
        console.error("Error updating status:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update partner status.' });
    }
  }
  
  const handleDeletePartner = async (partner: PartnerData) => {
    if (!db) return;
    const isDoctor = partner.type === 'doctor';
    const collectionName = isDoctor 
      ? `curePartners/${partner.hospitalId}/doctors`
      : getCollectionName(partner.type);

    if (!collectionName || (isDoctor && !partner.hospitalId)) {
        toast({variant: 'destructive', title: 'Error', description: 'Invalid partner data for deletion.'});
        return;
    }

    const partnerRef = doc(db, collectionName, partner.id);

    try {
        await deleteDoc(partnerRef);
        toast({
            variant: 'destructive',
            title: 'Partner Deleted',
            description: `${partner.name} has been permanently removed.`
        });
        fetchAllPartners(); // Refetch data
    } catch (e) {
         toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete partner.' });
    }
  }
  
  const openAlertDialog = (partner: PartnerData, action: 'approve' | 'reject' | 'delete') => {
      setSelectedPartner(partner);
      setAlertAction(action);
      setIsAlertOpen(true);
  }

  const confirmAlertAction = () => {
    if (!selectedPartner || !alertAction) return;
    
    if (alertAction === 'approve') handleUpdateStatus(selectedPartner, 'Verified');
    else if (alertAction === 'reject') handleUpdateStatus(selectedPartner, 'Rejected');
    else if (alertAction === 'delete') handleDeletePartner(selectedPartner);
    
    setIsAlertOpen(false);
    setSelectedPartner(null);
    setAlertAction(null);
  }
  
  const alertDetails = useMemo(() => {
    if (!alertAction || !selectedPartner) return {};
    const actionTextMap = {
        'approve': { title: 'Approve Partner?', description: `This will mark ${selectedPartner.name} as verified and allow them to access the platform.`, actionText: 'Yes, Approve' },
        'reject': { title: 'Reject Partner?', description: `This will mark ${selectedPartner.name} as rejected. They will be notified.`, actionText: 'Yes, Reject' },
        'delete': { title: 'Delete Partner?', description: `This action is permanent and cannot be undone. This will remove ${selectedPartner.name} from all records.`, actionText: 'Yes, Delete Permanently', variant: 'destructive' as const },
    };
    return actionTextMap[alertAction] || {};
  }, [alertAction, selectedPartner]);

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
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>
    }
  }

  const renderTable = (partnerTypes: Array<PartnerData['type'] | 'hospital' | 'clinic'>) => {
      let data = filteredPartners.filter(p => {
          if (partnerTypes.includes('hospital') && p.type === 'cure' && p.businessType === 'Hospital') return true;
          if (partnerTypes.includes('clinic') && p.type === 'cure' && p.businessType === 'Clinic') return true;
          return partnerTypes.includes(p.type);
      });
      
      const isDoctorTab = partnerTypes.includes('doctor');
      if (isDoctorTab) {
          data = data.filter(p => p.docStatus !== 'Verified');
      }
      
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              {isDoctorTab && <TableHead>Associated Facility</TableHead>}
              <TableHead>Contact</TableHead>
              <TableHead>Verification Status</TableHead>
              <TableHead>Live Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    {isDoctorTab && <TableCell><Skeleton className="h-5 w-40" /></TableCell>}
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
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
                  {isDoctorTab && (
                    <TableCell className="text-xs text-muted-foreground">{partner.hospitalName || 'N/A'}</TableCell>
                  )}
                  <TableCell>+91 {partner.phone}</TableCell>
                  <TableCell>{getStatusBadge(partner.docStatus || partner.status)}</TableCell>
                  <TableCell>
                    <Badge variant={partner.isOnline ? 'default' : 'secondary'} className={partner.isOnline ? 'bg-green-500 hover:bg-green-500/80' : ''}>
                      {partner.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </TableCell>
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
                                 <Link href={`/admin/partners/${partner.id}?type=${partner.type.toLowerCase()}${partner.hospitalId ? `&hospitalId=${partner.hospitalId}` : ''}`}>View Details</Link>
                              </DropdownMenuItem>
                              {(partner.status === 'pending_verification' || partner.docStatus === 'Awaiting Final Approval' || partner.status === 'rejected' || partner.docStatus === 'Rejected') && (
                                  <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openAlertDialog(partner, 'approve')}>
                                          <Check className="mr-2 h-4 w-4 text-green-500" /> Approve
                                      </DropdownMenuItem>
                                  </>
                              )}
                              {partner.status !== 'rejected' && partner.docStatus !== 'Rejected' && (
                                  <DropdownMenuItem onClick={() => openAlertDialog(partner, 'reject')}>
                                     <X className="mr-2 h-4 w-4 text-red-500" /> Reject
                                  </DropdownMenuItem>
                              )}
                               <DropdownMenuSeparator />
                               <DropdownMenuItem onSelect={() => openAlertDialog(partner, 'delete')} className="text-destructive focus:bg-destructive/10 focus:text-destructive">Delete Partner</DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isDoctorTab ? 6 : 5} className="h-24 text-center">
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
              <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="path">Path Partners (Drivers)</TabsTrigger>
                  <TabsTrigger value="resq">ResQ (Mechanics)</TabsTrigger>
                  <TabsTrigger value="hospitals">Cure (Hospitals)</TabsTrigger>
                  <TabsTrigger value="clinics">Cure (Clinics)</TabsTrigger>
                  <TabsTrigger value="doctors">Doctor Approvals</TabsTrigger>
              </TabsList>
              <TabsContent value="path" className="mt-4">
                {renderTable(['driver'])}
              </TabsContent>
              <TabsContent value="resq" className="mt-4">
                {renderTable(['mechanic'])}
              </TabsContent>
              <TabsContent value="hospitals" className="mt-4">
                {renderTable(['hospital'])}
              </TabsContent>
               <TabsContent value="clinics" className="mt-4">
                {renderTable(['clinic'])}
              </TabsContent>
               <TabsContent value="doctors" className="mt-4">
                {renderTable(['doctor'])}
              </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{alertDetails.title}</AlertDialogTitle>
                    <AlertDialogDescription>{alertDetails.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsAlertOpen(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={confirmAlertAction}
                        className={alertDetails.variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
                    >
                        {alertDetails.actionText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  )
}
