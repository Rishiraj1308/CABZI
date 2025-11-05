'use client'

import { useState, useEffect } from 'react'
import { IndianRupee, TrendingUp, CircleHelp, TrendingDown, Landmark, Banknote } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDb } from '@/firebase/client-provider'
import { collection, query, Timestamp, getDocs } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'

interface Loan {
    id: string;
    partnerName: string;
    partnerId: string;
    loanAmount: number;
    disbursedOn: Timestamp;
    status: 'Active' | 'Paid Off';
    interestRate: number;
    durationMonths: number;
    processingFee: number;
    totalInterest: number;
    totalPayable: number;
    emi: number;
}

interface Partner {
    id: string;
    walletBalance?: number;
}

interface Transaction {
    id: string;
    partnerName: string;
    type: string;
    amount: number;
    date: Timestamp;
    status: 'Credit' | 'Debit';
}

export default function AdminBankPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const db = useDb();

    useEffect(() => {
        const fetchData = async () => {
            if (!db) {
                setIsLoading(false);
                return;
            }
            
            try {
                const loansQuery = query(collection(db, 'loans'));
                const partnersQuery = query(collection(db, 'partners'));
                const transactionsQuery = query(collection(db, 'transactions'));
                
                const [loansSnap, partnersSnap, transactionsSnap] = await Promise.all([
                    getDocs(loansQuery),
                    getDocs(partnersQuery),
                    getDocs(transactionsQuery)
                ]);

                setLoans(loansSnap.docs.map(d => ({ id: d.id, ...d.data() } as Loan)));
                setPartners(partnersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Partner)));
                setTransactions(transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
            } catch (error) {
                console.error("Error fetching bank data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [db]);

    const totalBalanceInWallets = partners.reduce((acc, p) => acc + (p.walletBalance || 0), 0);
    
    const totalRevenueFromLoans = loans.reduce((acc, loan) => {
        return acc + loan.totalInterest + loan.processingFee;
    }, 0);
    
    const totalLoansDisbursed = loans.reduce((acc, loan) => acc + loan.loanAmount, 0);

    // This is a simplification. In a real app, interest paid would be tracked from transactions.
    const MOCK_INTEREST_PAID = 26250.00;
    const netProfitFromBank = totalRevenueFromLoans - MOCK_INTEREST_PAID;

    const renderSkeleton = () => (
        <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-1/2" />
                        <div className="text-xs text-muted-foreground mt-1"><Skeleton className="h-4 w-1/2" /></div>
                    </CardContent>
                </Card>
                <Card className="col-span-full md:col-span-1 lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-1/2" />
                        <div className="text-xs text-muted-foreground mt-1"><Skeleton className="h-4 w-3/4" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-1/2" />
                        <div className="text-xs text-muted-foreground mt-1"><Skeleton className="h-4 w-1/2" /></div>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
                    <div className="text-sm text-muted-foreground pt-1.5"><Skeleton className="h-4 w-1/2" /></div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-20"/></TableHead>
                                <TableHead><Skeleton className="h-5 w-24"/></TableHead>
                                <TableHead><Skeleton className="h-5 w-24"/></TableHead>
                                <TableHead><Skeleton className="h-5 w-20"/></TableHead>
                                <TableHead><Skeleton className="h-5 w-28"/></TableHead>
                                <TableHead><Skeleton className="h-5 w-16"/></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                   <Skeleton className="h-5 w-48 mx-auto" />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );

    if (isLoading) {
        return renderSkeleton();
    }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance (Float)</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(totalBalanceInWallets / 100000).toFixed(2)} Lac</div>
              <p className="text-xs text-muted-foreground">Funds held by all partners</p>
            </CardContent>
          </Card>
          <Card className="col-span-full md:col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Net Profit from Cabzi Bank</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+₹{netProfitFromBank.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">This is the pure profit from the bank after all expenses.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loans Disbursed</CardTitle>
              <CircleHelp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(totalLoansDisbursed / 100000).toFixed(2)} Lac</div>
               <p className="text-xs text-muted-foreground">Total credit provided</p>
            </CardContent>
          </Card>
        </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Active &amp; Recent Loans</CardTitle>
                <CardDescription>A detailed overview of all disbursed loans from the database.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Partner</TableHead>
                            <TableHead>Loan Details</TableHead>
                            <TableHead>Tenure &amp; Rate</TableHead>
                            <TableHead>EMI</TableHead>
                            <TableHead>Total Payable</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loans.length > 0 ? loans.map(loan => (
                            <TableRow key={loan.id}>
                                <TableCell>
                                    <div className="font-medium">{loan.partnerName}</div>
                                    <div className="text-xs text-muted-foreground">Disbursed: {loan.disbursedOn.toDate().toLocaleDateString()}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">₹{loan.loanAmount.toLocaleString()}</div>
                                    <div className="text-xs text-muted-foreground">Fee (2%): ₹{loan.processingFee.toLocaleString()}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{loan.durationMonths} Months</div>
                                    <div className="text-xs text-muted-foreground">{loan.interestRate}% p.a.</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">₹{loan.emi.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                    <div className="text-xs text-muted-foreground">per month</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium text-green-600">₹{loan.totalPayable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={loan.status === 'Active' ? 'destructive' : 'default'}>{loan.status}</Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No loans have been disbursed yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>A live log of all financial activities in the Cabzi Bank ecosystem.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Partner</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length > 0 ? transactions.map(t => (
                             <TableRow key={t.id}>
                                <TableCell className="font-mono text-xs">{t.id}</TableCell>
                                <TableCell>{t.date.toDate().toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium">{t.partnerName}</TableCell>
                                <TableCell>{t.type}</TableCell>
                                <TableCell className={`text-right font-medium ${t.status === 'Debit' ? 'text-destructive' : 'text-green-600'}`}>
                                    {t.status === 'Debit' ? '-' : '+'}₹{Math.abs(t.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No transactions have occurred yet.
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
