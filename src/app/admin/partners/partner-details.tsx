
'use client'

import { useState, useEffect } from 'react';
import { doc, onSnapshot, DocumentData, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Car, Wrench, IndianRupee, Ambulance } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';


interface PartnerDetailsProps {
    partnerId: string;
    initialPartnerType: 'driver' | 'mechanic' | 'cure' | null;
}

const getInitials = (name: string) => {
    if (!name) return 'P';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
}

export default function PartnerDetails({ partnerId, initialPartnerType }: PartnerDetailsProps) {
    const [partner, setPartner] = useState<DocumentData | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
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

        const docRef = doc(db, collectionName, partnerId);

        const unsubscribePartner = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setPartner({
                    id: docSnap.id,
                    type: initialPartnerType,
                    ...docSnap.data()
                });
            } else {
                setPartner(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching partner details:", error);
            setIsLoading(false);
        });

        // Fetch transactions (assuming only drivers and mechanics have wallets for now)
        if (initialPartnerType === 'driver' || initialPartnerType === 'mechanic') {
            const transQuery = query(collection(db, `${collectionName}/${partnerId}/transactions`), orderBy('date', 'desc'));
            const unsubscribeTransactions = onSnapshot(transQuery, (snap) => {
                setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
             return () => {
                unsubscribePartner();
                unsubscribeTransactions();
            }
        }


        return () => {
            unsubscribePartner();
        }
    }, [partnerId, initialPartnerType]);

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
                <p className="text-muted-foreground">The partner with ID '{partnerId}' could not be found.</p>
            </div>
        )
    }
    
    const getPartnerIcon = () => {
        switch(partner.type) {
            case 'driver': return <Car className="w-4 h-4 mr-2"/>;
            case 'mechanic': return <Wrench className="w-4 h-4 mr-2"/>;
            case 'cure': return <Ambulance className="w-4 h-4 mr-2"/>;
            default: return null;
        }
    }

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-6">
                        <Avatar className="w-16 h-16 border">
                            <AvatarImage src={partner.photoUrl || `https://picsum.photos/100/100?random=${partner.id}`} alt={partner.name} data-ai-hint="driver portrait" />
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
                                        {partner.businessType}
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
                    <CardDescription>All transactions related to this partner's wallet.</CardDescription>
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
    )
}
