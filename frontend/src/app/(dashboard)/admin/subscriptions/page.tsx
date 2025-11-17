
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Gem, MoreHorizontal, Search, Check, CircleX, Calendar, Star } from 'lucide-react'
import { useDb } from '@/lib/firebase/client-provider'
import { collection, query, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorEmitter, FirestorePermissionError } from '@/lib/error-handling'

interface PartnerSubscription {
    id: string;
    name: string;
    phone: string;
    subscription: {
        planName: string;
        status: 'Active' | 'Expired' | 'Trial' | 'Cancelled';
        startDate: Timestamp;
        endDate: Timestamp;
    };
}

export default function AdminSubscriptionsPage() {
    const [partners, setPartners] = useState<PartnerSubscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<PartnerSubscription | null>(null);
    const [newPlan, setNewPlan] = useState('');
    const db = useDb();

    useEffect(() => {
         if (!db) {
            toast.error('Database Error');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const q = query(collection(db, 'pathPartners'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const partnersData: PartnerSubscription[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.name) { 
                    partnersData.push({
                        id: doc.id,
                        name: data.name,
                        phone: data.phone,
                        subscription: data.subscription || {
                            planName: 'Free Trial',
                            status: 'Trial',
                            startDate: data.createdAt || Timestamp.now(),
                            endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                        },
                    });
                }
            });
            setPartners(partnersData.sort((a, b) => b.subscription.endDate.toMillis() - a.subscription.endDate.toMillis()));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching subscriptions:", error);
            toast.error('Error', { description: 'Could not fetch subscription data.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    const filteredPartners = useMemo(() => {
        return partners.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.phone.includes(searchQuery)
        );
    }, [partners, searchQuery]);

    const getStatusBadge = (status: PartnerSubscription['subscription']['status']) => {
        switch (status) {
            case 'Active': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
            case 'Trial': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
            case 'Expired': return <Badge variant="secondary">{status}</Badge>;
            case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleUpdatePlan = async () => {
        if (!selectedPartner || !newPlan || !db) {
            toast.error('Error', { description: 'Please select a partner and a plan.' });
            return;
        }

        const partnerRef = doc(db, 'pathPartners', selectedPartner.id);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + 1);
        
        const updatedData = {
            'subscription.planName': newPlan,
            'subscription.status': 'Active',
            'subscription.startDate': Timestamp.fromDate(startDate),
            'subscription.endDate': Timestamp.fromDate(endDate),
        };

        updateDoc(partnerRef, updatedData)
          .then(() => {
            toast.success('Subscription Updated', { description: `${selectedPartner.name}'s plan has been updated to ${newPlan}.` });
            setIsDialogOpen(false);
            setSelectedPartner(null);
            setNewPlan('');
          })
          .catch((serverError) => {
             const permissionError = new FirestorePermissionError({
                path: partnerRef.path,
                operation: 'update',
                requestResourceData: updatedData,
             });
             errorEmitter.emit('permission-error', permissionError);
          });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Gem className="w-6 h-6 text-primary"/> Subscription Management</CardTitle>
                        <CardDescription>View, manage, and activate partner subscription plans.</CardDescription>
                    </div>
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by Partner Name/Phone..."
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
                            <TableHead>Current Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expires On</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredPartners.length > 0 ? (
                            filteredPartners.map((partner) => (
                                <TableRow key={partner.id}>
                                    <TableCell>
                                        <div className="font-medium">{partner.name}</div>
                                        <div className="text-xs text-muted-foreground">{partner.phone}</div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{partner.subscription.planName}</Badge></TableCell>
                                    <TableCell>{getStatusBadge(partner.subscription.status)}</TableCell>
                                    <TableCell>{partner.subscription.endDate.toDate().toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => {
                                                        e.preventDefault();
                                                        setSelectedPartner(partner);
                                                        setIsDialogOpen(true);
                                                    }}>
                                                        <Star className="mr-2 h-4 w-4"/> Activate/Change Plan
                                                    </DropdownMenuItem>
                                                </DialogTrigger>
                                                <DropdownMenuItem disabled><CircleX className="mr-2 h-4 w-4"/> Cancel Subscription</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {searchQuery ? 'No partners found with that query.' : 'No partners available.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                 <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setSelectedPartner(null);
                        setNewPlan('');
                    }
                    setIsDialogOpen(isOpen);
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Activate/Change Plan for {selectedPartner?.name}</DialogTitle>
                            <DialogDescription>
                                Select a new plan to activate for this partner. The plan will be active for 30 days from today.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="plan">Select New Plan</Label>
                            <Select onValueChange={setNewPlan} value={newPlan}>
                                <SelectTrigger id="plan">
                                    <SelectValue placeholder="Select a subscription plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Daily Pass">Daily Pass (₹17)</SelectItem>
                                    <SelectItem value="Basic">Basic (₹999)</SelectItem>
                                    <SelectItem value="Pro">Pro (₹2,500)</SelectItem>
                                    <SelectItem value="Ultimate">Ultimate (Coming Soon)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdatePlan}>Activate Plan</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}
