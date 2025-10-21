
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { doc, getDoc, DocumentData, collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase/client-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Car, Wrench, IndianRupee, Ambulance, ArrowLeft, Building, User, FileText, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DriverIdCard from '@/components/driver-id-card'; // We'll reuse this for a great visual!

interface PartnerDetailsProps {
    partnerId: string;
    initialPartnerType: 'driver' | 'mechanic' | 'cure' | null;
}

const getInitials = (name: string) => {
    if (!name) return 'P';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
}

function PartnerDetails({ partnerId, initialPartnerType }: PartnerDetailsProps) {
    const [partner, setPartner] = useState<DocumentData | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const db = useFirestore();

    useEffect(() => {
        const fetchPartnerData = async () => {
            if (!db || !partnerId || !initialPartnerType) {
                 setIsLoading(false);
                 return;
            }

            const getCollectionName = () => {
                switch(initialPartnerType) {
                    case 'driver': return 'partners';
                    case 'mechanic': return 'mechanics';
                    case 'cure': return 'ambulances';
                    default: return '';
                }
            }

            const collectionName = getCollectionName();
            if (!collectionName) {
                setIsLoading(false);
                return;
            }

            try {
                const docRef = doc(db, collectionName, partnerId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const partnerData = {
                        id: docSnap.id,
                        type: initialPartnerType,
                        ...docSnap.data()
                    };
                    setPartner(partnerData);

                    // Fetch transactions if applicable
                    if (initialPartnerType === 'driver' || initialPartnerType === 'mechanic') {
                        const transCollectionName = initialPartnerType === 'driver' ? 'partners' : 'mechanics';
                        const transQuery = query(collection(db, `${transCollectionName}/${partnerId}/transactions`), orderBy('date', 'desc'));
                        const transSnap = await getDocs(transQuery);
                        setTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                    }
                } else {
                    setPartner(null);
                }
            } catch (error) {
                console.error("Error fetching partner details:", error);
            } finally {
                 setIsLoading(false);
            }
        };

        fetchPartnerData();
    }, [partnerId, initialPartnerType, db]);

    const totalEarnings = transactions.filter(t => t.status === 'Credit').reduce((sum, t) => sum + t.amount, 0);
    const totalPayouts = transactions.filter(t => t.status === 'Debit').reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48 mb-4" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!partner) {
         return (
            <div className="text-center p-4">
                 <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/admin/partners"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Partners</Link>
                </Button>
                <h2 className="text-xl font-bold">Partner Not Found</h2>
                <p className="text-muted-foreground">The partner with ID '{partnerId}' could not be found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
             <Button asChild variant="outline" size="sm">
                <Link href="/admin/partners"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Partners</Link>
            </Button>
            <Tabs defaultValue="profile">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
                    <TabsTrigger value="financials"><Landmark className="mr-2 h-4 w-4" /> Financials</TabsTrigger>
                    <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" /> Documents</TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="mt-4">
                    <DriverIdCard />
                </TabsContent>
                <TabsContent value="financials" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Financial Ledger</CardTitle>
                            <CardDescription>All wallet transactions for this partner.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Wallet Balance</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold text-primary">₹{(partner.walletBalance || 0).toLocaleString()}</p></CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Earnings</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold text-green-600">₹{totalEarnings.toLocaleString()}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Payouts</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold text-destructive">-₹{totalPayouts.toLocaleString()}</p></CardContent>
                                </Card>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.length > 0 ? (
                                        transactions.map(tx => (
                                            <TableRow key={tx.id}>
                                                <TableCell>{tx.date.toDate().toLocaleDateString()}</TableCell>
                                                <TableCell className="font-medium">{tx.type}</TableCell>
                                                <TableCell className={`text-right font-medium ${tx.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                {tx.amount > 0 ? '+' : ''}₹{tx.amount.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No transactions found for this partner.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="documents" className="mt-4">
                      <Card>
                        <CardHeader>
                            <CardTitle>Documents for Verification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-4 rounded-lg border flex justify-between items-center bg-muted/50">
                                <Label className="font-semibold">Driving Licence</Label>
                                <span className="font-mono text-sm">{partner.drivingLicence || 'Not Provided'}</span>
                            </div>
                             <div className="p-4 rounded-lg border flex justify-between items-center bg-muted/50">
                                <Label className="font-semibold">Aadhaar Number</Label>
                                <span className="font-mono text-sm">{partner.aadhaarNumber || 'Not Provided'}</span>
                            </div>
                             <div className="p-4 rounded-lg border flex justify-between items-center bg-muted/50">
                                <Label className="font-semibold">PAN Card</Label>
                                <span className="font-mono text-sm">{partner.panCard || 'Not Provided'}</span>
                            </div>
                             <div className="p-4 rounded-lg border flex justify-between items-center bg-muted/50">
                                <Label className="font-semibold">Vehicle RC</Label>
                                <span className="font-mono text-sm">{partner.vehicleNumber || 'Not Provided'}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline">Request Re-upload</Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function PartnerDetailsPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const partnerId = params.partnerId as string;
  const partnerType = searchParams.get('type') as 'driver' | 'mechanic' | 'cure' | null;

  if (!partnerId || !partnerType) {
    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold">Invalid Partner Link</h2>
            <p className="text-muted-foreground">The partner ID or type is missing from the URL.</p>
            <Button asChild variant="outline" className="mt-4">
               <Link href="/admin/partners"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Partners</Link>
           </Button>
        </div>
    );
  }

  return <PartnerDetails partnerId={partnerId} initialPartnerType={partnerType} />;
}

export default function PartnerDetailsPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <PartnerDetailsPageContent />
        </Suspense>
    )
}
