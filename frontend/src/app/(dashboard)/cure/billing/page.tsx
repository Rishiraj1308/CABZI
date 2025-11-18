'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { History, IndianRupee, Landmark, Download, TrendingUp, TrendingDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useDb } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useCurePartner } from '../layout'

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    date: Timestamp;
}

export default function CureBillingPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const db = useDb();
    const { partnerData } = useCurePartner();

    useEffect(() => {
        if (!db || !partnerData?.id) {
            setIsLoading(false);
            return;
        }

        const casesQuery = query(
            collection(db, 'emergencyCases'),
            where('assignedPartner.id', '==', partnerData.id),
            where('status', '==', 'completed'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(casesQuery, (querySnapshot) => {
            const derivedTransactions: Transaction[] = [];
            querySnapshot.forEach((doc) => {
                const caseData = doc.data();
                if (caseData.estimatedFare > 0) {
                    derivedTransactions.push({
                        id: doc.id,
                        description: `Fare from case: ${caseData.caseId}`,
                        amount: caseData.estimatedFare,
                        type: 'credit',
                        date: caseData.createdAt,
                    });
                }
            });
            // TODO: Add mock debit transactions for payouts
            setTransactions(derivedTransactions);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching billing data: ", error);
            toast.error('Error', { description: 'Could not fetch billing history.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db, partnerData]);

    const financialStats = useMemo(() => {
        const totalEarnings = transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalPayouts = transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            walletBalance: totalEarnings - totalPayouts,
            totalEarnings,
            totalPayouts,
        };
    }, [transactions]);
    
    const handleDownloadStatement = () => {
        if (transactions.length === 0) {
            toast.error('No Data', { description: 'No transactions to download.' });
            return;
        }

        let statementContent = `Curocity CURE Statement for ${partnerData?.name || 'Your Facility'}\n`;
        statementContent += `Date Generated: ${new Date().toLocaleDateString()}\n\n`;
        statementContent += '-------------------------------------------------\n';
        statementContent += 'Date\t\tDescription\t\tAmount (INR)\n';
        statementContent += '-------------------------------------------------\n';

        transactions.forEach(tx => {
            const date = tx.date.toDate().toLocaleDateString();
            const description = tx.description.padEnd(30, ' ');
            const amount = `${tx.type === 'debit' ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}`.padStart(10, ' ');
            statementContent += `${date}\t${description}\t${amount}\n`;
        });
        
        statementContent += '-------------------------------------------------\n';
        statementContent += `Current Due Amount: ₹${financialStats.walletBalance.toFixed(2)}\n`;


        const blob = new Blob([statementContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Curocity_CURE_Statement_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Download Started', {
            description: 'Your billing statement has been downloaded.',
        });
    }

    return (
        <div className="grid gap-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Billing & Payouts</h2>
                <p className="text-muted-foreground">Track your earnings from completed cases and manage payouts.</p>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                        <Landmark className="w-4 h-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-32"/> : <div className="text-2xl font-bold">₹{financialStats.walletBalance.toLocaleString()}</div>}
                        <p className="text-xs text-muted-foreground">Amount to be paid out by Curocity.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-32"/> : <div className="text-2xl font-bold text-green-600">₹{financialStats.totalEarnings.toLocaleString()}</div>}
                        <p className="text-xs text-muted-foreground">All-time earnings from cases.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
                        <TrendingDown className="w-4 h-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-32"/> : <div className="text-2xl font-bold text-destructive">-₹{financialStats.totalPayouts.toLocaleString()}</div>}
                         <p className="text-xs text-muted-foreground">All-time payouts received.</p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><History className="w-5 h-5"/> Transaction Ledger</CardTitle>
                        <CardDescription>A complete log of all credits and debits.</CardDescription>
                    </div>
                     <Button variant="outline" size="sm" onClick={handleDownloadStatement}>
                        <Download className="mr-2 h-4 w-4"/>
                        Download Statement
                    </Button>
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
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length > 0 ? (
                                transactions.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.date.toDate().toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{t.description}</TableCell>
                                        <TableCell className={`text-right font-semibold ${t.type === 'credit' ? 'text-green-600' : 'text-destructive'}`}>
                                            {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">
                                        No transactions recorded yet.
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
