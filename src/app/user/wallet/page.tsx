
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet, PlusCircle, IndianRupee, ShieldCheck, TrendingUp, PiggyBank, CircleHelp, Download, Send } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'


// Mock transaction data for the user's wallet
const mockTransactions = [
    { id: 'TXN789123', type: 'Ride Payment', description: 'To Cyber Hub, Gurgaon', amount: -250.00, date: '2024-08-20' },
    { id: 'TXN456789', type: 'Wallet Top-up', description: 'Added via UPI', amount: 500.00, date: '2024-08-19' },
    { id: 'TXN123456', type: 'Ride Payment', description: 'To IGI Airport, T3', amount: -450.00, date: '2024-08-18' },
    { id: 'TXN987654', type: 'Cashback', description: 'Promotional offer cashback', amount: 50.00, date: '2024-08-18' },
    { id: 'TXN654321', type: 'Ride Payment', description: 'To Select Citywalk, Saket', amount: -180.00, date: '2024-08-17' },
]

export default function UserWalletPage() {
    const [isKycDone, setIsKycDone] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    // In a real app, this would be fetched from the database
    useEffect(() => {
        const kycStatus = localStorage.getItem('curocity-user-kyc');
        if (kycStatus === 'completed') {
            setIsKycDone(true);
        }
    }, [])

    const handleKycSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.target as HTMLFormElement);
        const pan = formData.get('pan-card') as string;
        const aadhaar = formData.get('aadhaar-number') as string;

        if (!pan || !aadhaar) {
            toast({ variant: 'destructive', title: "Missing Details", description: "Please enter both PAN and Aadhaar number." });
            setIsLoading(false);
            return;
        }

        setTimeout(() => {
            // Simulate successful KYC
            localStorage.setItem('curocity-user-kyc', 'completed');
            setIsKycDone(true);
            setIsLoading(false);
            toast({ title: "KYC Submitted!", description: "Your Curocity Wallet is now active.", className: "bg-green-600 text-white border-green-600" });
        }, 1500);
    }
    
    const walletBalance = 1250.75; // Mock balance

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="animate-fade-in">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Wallet className="w-8 h-8 text-primary" /> 
                    Curocity Wallet
                </h2>
                <p className="text-muted-foreground">Your secure wallet for all rides and services on Curocity.</p>
            </div>
            
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Coming Soon!</AlertTitle>
              <AlertDescription>
                The user wallet and UPI features are currently under development. The interface below is a preview.
              </AlertDescription>
            </Alert>
            
            {!isKycDone ? (
                <Card>
                    <form onSubmit={handleKycSubmit}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary"/> Complete Your KYC</CardTitle>
                            <CardDescription>To activate your wallet and enable payments, please complete your KYC verification.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pan-card">PAN Card Number</Label>
                                <Input id="pan-card" name="pan-card" placeholder="e.g., ABCDE1234F" required className="uppercase" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="aadhaar-number">Aadhaar Number</Label>
                                <Input id="aadhaar-number" name="aadhaar-number" placeholder="e.g., 1234 5678 9012" required />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Submit & Activate Wallet'}</Button>
                        </CardFooter>
                    </form>
                </Card>
            ) : (
                <div className="grid gap-6">
                     <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Available Balance</CardDescription>
                            <CardTitle className="text-4xl">₹{walletBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</CardTitle>
                        </CardHeader>
                        <CardFooter className="grid grid-cols-2 gap-4">
                            <Button size="lg"><PlusCircle className="mr-2 h-4 w-4"/> Add Money</Button>
                            <Button size="lg" variant="outline"><Send className="mr-2 h-4 w-4"/> Send Money</Button>
                        </CardFooter>
                    </Card>

                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                              <CardTitle>Transaction History</CardTitle>
                              <CardDescription>Your recent wallet transactions.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => toast({title: 'Coming Soon!'})}><Download className="mr-2 h-4 w-4"/>Download</Button>
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
                               {mockTransactions.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell>{t.date}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{t.type}</div>
                                        <div className="text-xs text-muted-foreground">{t.description}</div>
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${t.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                        {t.amount > 0 ? '+' : ''}₹{t.amount.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                               ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
