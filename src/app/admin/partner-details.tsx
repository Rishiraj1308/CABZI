'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, DocumentData, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase/client-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Car, Wrench, Ambulance, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

interface PartnerDetailsProps {
    partnerId: string;
    initialPartnerType: 'driver' | 'mechanic' | 'cure' | 'doctor' | null;
    hospitalId?: string | null;
}

const getInitials = (name: string) => {
    if (!name) return 'P';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
}

export default function PartnerDetails({ partnerId, initialPartnerType, hospitalId }: PartnerDetailsProps) {
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

            const getCollectionPath = () => {
                switch(initialPartnerType) {
                    case 'driver': return `partners/${partnerId}`;
                    case 'mechanic': return `mechanics/${partnerId}`;
                    case 'cure': return `ambulances/${partnerId}`;
                    case 'doctor':
                        if (!hospitalId) {
                            console.error("Hospital ID is required for doctor details.");
                            return null;
                        }
                        return `ambulances/${hospitalId}/doctors/${partnerId}`;
                    default: return null;
                }
            }

            const docPath = getCollectionPath();
            if (!docPath) {
                setIsLoading(false);
                return;
            }

            try {
                const docRef = doc(db, docPath);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setPartner({
                        id: docSnap.id,
                        type: initialPartnerType,
                        ...docSnap.data()
                    });

                    // Fetch transactions if applicable (for non-Cure partners)
                    if (initialPartnerType === 'driver' || initialPartnerType === 'mechanic') {
                        const collectionName = initialPartnerType === 'driver' ? 'partners' : 'mechanics';
                        const transQuery = query(collection(db, `${collectionName}/${partnerId}/transactions`), orderBy('date', 'desc'));
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
    }, [partnerId, initialPartnerType, hospitalId, db]);

    if (isLoading) {
        return (
            <div className="space-y-6 p-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    if (!partner) {
         return (
            <div className="text-center p-4">
                <h2 className="text-xl font-bold">Partner Not Found</h2>
                <p className="text-muted-foreground">The partner with ID &apos;{partnerId}&apos; could not be found.</p>
            </div>
        )
    }
    
    const getPartnerIcon = () => {
        switch(partner.type) {
            case 'driver': return <Car className="w-4 h-4 mr-2"/>;
            case 'mechanic': return <Wrench className="w-4 h-4 mr-2"/>;
            case 'cure': return <Ambulance className="w-4 h-4 mr-2"/>;
            case 'doctor': return <Stethoscope className="w-4 h-4 mr-2"/>;
            default: return null;
        }
    }

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-6">
                        <Avatar className="w-16 h-16 border">
                            <AvatarImage src={partner.photoUrl || `https://placehold.co/100x100.png`} alt={partner.name} data-ai-hint="driver portrait" />
                            <AvatarFallback>{getInitials(partner.name).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl">{partner.name}</CardTitle>
                                    <CardDescription>{partner.phone}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="capitalize">
                                        {getPartnerIcon()}
                                        {partner.businessType || partner.type}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-muted-foreground">Vehicle/Firm</p>
                            <p className="font-semibold">{partner.vehicleName || partner.firmName || partner.name}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-muted-foreground">Registration No.</p>
                            <p className="font-semibold">{partner.vehicleNumber || partner.registrationNumber || 'N/A'}</p>
                        </div>
                         <div className="p-4 bg-muted rounded-lg">
                            <p className="text-muted-foreground">Wallet Balance</p>
                            <p className="font-semibold text-lg text-primary">₹{(partner.walletBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                         {(partner.type === 'mechanic' || partner.type === 'cure') && partner.services && (
                            <div className="p-4 bg-muted rounded-lg md:col-span-3">
                                <p className="text-muted-foreground mb-2">Services Offered</p>
                                <div className="flex flex-wrap gap-2">
                                    {partner.services.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Documents for Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="p-3 rounded-lg border flex justify-between items-center">
                        <Label>Driving Licence</Label>
                        <span className="font-mono text-sm">{partner.drivingLicence || 'Not Provided'}</span>
                    </div>
                     <div className="p-3 rounded-lg border flex justify-between items-center">
                        <Label>Aadhaar Number</Label>
                        <span className="font-mono text-sm">{partner.aadhaarNumber || 'Not Provided'}</span>
                    </div>
                     <div className="p-3 rounded-lg border flex justify-between items-center">
                        <Label>PAN Card</Label>
                        <span className="font-mono text-sm">{partner.panCard || 'Not Provided'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Financial Ledger</CardTitle>
                    <CardDescription>All transactions related to this partner&apos;s wallet.</CardDescription>
                </CardHeader>
                <CardContent>
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
        </div>
    );
}
