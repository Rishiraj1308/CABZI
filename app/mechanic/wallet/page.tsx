
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet, PlusCircle, IndianRupee, ShieldCheck, TrendingUp, PiggyBank, CircleHelp, Download, Send, Building, Landmark, Sparkles, ScanLine, KeyRound } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import Image from 'next/image'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'


interface BankDetails {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
}

interface Mechanic {
    id: string;
    phone: string;
    walletBalance: number;
    bankDetails?: BankDetails;
    upiId?: string;
    qrCodeUrl?: string;
}

interface Transaction {
    id: string;
    type: string;
    amount: number;
    status: 'Credit' | 'Debit';
    date: Timestamp;
}

export default function ResQWalletPage() {
    const [mechanic, setMechanic] = useState<Mechanic | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBankDetailsDialogOpen, setIsBankDetailsDialogOpen] = useState(false);
    const { toast } = useToast();
    const db = useDb();

    // PIN Management State
    const [isPinSet, setIsPinSet] = useState(false);
    const [isWalletVisible, setIsWalletVisible] = useState(false);
    const [enteredPin, setEnteredPin] = useState('');
    const [pinStep, setPinStep] = useState(1); // 1: Enter new, 2: Confirm new
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    
    // Loan State
    const [isLoanConfirmOpen, setIsLoanConfirmOpen] = useState(false);
    const loanOffer = { amount: 8000, interestRate: 15, durationMonths: 6, processingFee: 160 };
    const emi = (loanOffer.amount * (1 + (loanOffer.interestRate/100))) / loanOffer.durationMonths;

    useEffect(() => {
        // This effect only checks if a PIN exists in localStorage.
        // It does not fetch any data.
        const storedPin = localStorage.getItem('curocity-user-pin');
        if (storedPin) {
            setIsPinSet(true);
        }
    }, []);


    useEffect(() => {
        // This effect fetches data only if the wallet is visible (i.e., PIN is entered).
        if (!isWalletVisible) {
            setIsLoading(false);
            return;
        };

        const fetchWalletData = async () => {
             const session = localStorage.getItem('curocity-resq-session');
            if (!session || !db) {
                setIsLoading(false);
                return;
            }
            
            const { phone } = JSON.parse(session);

            const mechanicsRef = collection(db, "mechanics");
            const q = query(mechanicsRef, where("phone", "==", phone));

            try {
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const mechanicDoc = querySnapshot.docs[0];
                     const mechanicData = { 
                        id: mechanicDoc.id, 
                        ...mechanicDoc.data(),
                        upiId: mechanicDoc.data().upiId || `${mechanicDoc.data().phone}@curocity`,
                        qrCodeUrl: mechanicDoc.data().qrCodeUrl || `https://placehold.co/300x300/FBBF24/1E293B?text=CurocityUPI`
                    } as Mechanic
                    setMechanic(mechanicData);
                    
                    const transactionsQuery = query(collection(db, `mechanics/${mechanicDoc.id}/transactions`), orderBy('date', 'desc'));
                    const transSnap = await getDocs(transactionsQuery);
                    setTransactions(transSnap.docs.map(d => (({
                        id: d.id,
                        ...d.data()
                    }) as Transaction)));
                }
            } catch (error) {
                console.error("Error fetching wallet data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWalletData();

    }, [isWalletVisible, toast, db]);

    const handlePinSubmit = () => {
        const storedPin = localStorage.getItem('curocity-user-pin');
        if (enteredPin === storedPin) {
            setIsWalletVisible(true);
            toast({ title: 'Access Granted', description: 'Welcome to your Curocity Bank.' });
        } else {
            toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter the correct 4-digit PIN.' });
        }
    }
    
     const handleCreatePin = () => {
        if (newPin.length !== 4) {
            toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter a 4-digit PIN.' });
            return;
        }
        
        if (pinStep === 1) { // Move to confirmation step
            setPinStep(2);
            return;
        }

        if (newPin !== confirmPin) {
            toast({ variant: 'destructive', title: 'PIN Mismatch', description: 'The new PINs you entered do not match.' });
            return;
        }

        localStorage.setItem('curocity-user-pin', newPin);
        toast({ title: 'PIN Set Successfully!', description: 'Your Curocity Bank is now secure.', className: 'bg-green-600 text-white border-green-600' });
        setIsPinSet(true);
    }

    const handleBankDetailsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!mechanic || !db) return;
        
        const formData = new FormData(e.currentTarget);
        const accountHolderName = formData.get('holderName') as string;
        const accountNumber = formData.get('accountNumber') as string;
        const confirmAccountNumber = formData.get('confirmAccountNumber') as string;
        const ifscCode = formData.get('ifscCode') as string;

        if (accountNumber !== confirmAccountNumber) {
            toast({ variant: 'destructive', title: 'Account Numbers Do Not Match' });
            return;
        }
        
        const bankDetails: BankDetails = { accountHolderName, accountNumber, ifscCode };
        
        try {
            const mechanicRef = doc(db, 'mechanics', mechanic.id);
            await updateDoc(mechanicRef, { bankDetails });
            toast({ title: 'Bank Account Added', description: 'Your bank account has been successfully linked.' });
            setIsBankDetailsDialogOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save bank details.' });
        }
    }

    const handleLoanDisbursement = async () => {
        // This is a placeholder for a future Cloud Function call
        toast({
            title: 'Loan Disbursement!',
            description: `₹${loanOffer.amount.toLocaleString()} has been credited to your wallet (simulation).`,
            className: 'bg-green-600 text-white border-green-600'
        });
        setIsLoanConfirmOpen(false);
    };

    const handleDownloadStatement = () => {
        if (!mechanic || transactions.length === 0) {
            toast({ variant: 'destructive', title: 'No Data', description: 'No transactions to download.' });
            return;
        }

        let statementContent = `Curocity Bank Statement for ${mechanic.name}\n`;
        statementContent += `Partner ID: ${mechanic.id}\n`;
        statementContent += `Date Generated: ${new Date().toLocaleDateString()}\n\n`;
        statementContent += '-------------------------------------------------\n';
        statementContent += 'Date\t\tType\t\t\tAmount (INR)\n';
        statementContent += '-------------------------------------------------\n';

        transactions.forEach(tx => {
            const date = tx.date.toDate().toLocaleDateString();
            const type = tx.type.padEnd(20, ' ');
            const amount = `${tx.status === 'Debit' ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}`.padStart(10, ' ');
            statementContent += `${date}\t${type}\t${amount}\n`;
        });
        
        statementContent += '-------------------------------------------------\n';
        statementContent += `Closing Balance: ₹${mechanic.walletBalance.toFixed(2)}\n`;


        const blob = new Blob([statementContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Curocity_Statement_${mechanic.phone}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: 'Download Started',
            description: 'Your wallet statement has been downloaded.',
        });
    }

    if (!isPinSet) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-primary/10 p-3 rounded-full mb-2">
                           <KeyRound className="w-8 h-8 text-primary"/>
                        </div>
                        <CardTitle>Create a Secure PIN</CardTitle>
                        <CardDescription>
                            {pinStep === 1 
                                ? "Welcome to Curocity Bank! Let's create your 4-digit UPI PIN to secure your wallet."
                                : "Please re-enter the PIN to confirm."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center justify-center gap-4">
                           <Label htmlFor="pin-input-create" className="sr-only">Enter PIN</Label>
                           {pinStep === 1 ? (
                                <Input 
                                    id="pin-input-create" 
                                    type="password" 
                                    inputMode="numeric" 
                                    maxLength={4}
                                    value={newPin}
                                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                                    className="text-center text-2xl font-bold tracking-[1em] w-40" 
                                    placeholder="••••"
                                    autoFocus
                                />
                           ) : (
                                <Input 
                                    id="pin-input-confirm" 
                                    type="password" 
                                    inputMode="numeric" 
                                    maxLength={4}
                                    value={confirmPin}
                                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                    className="text-center text-2xl font-bold tracking-[1em] w-40" 
                                    placeholder="••••"
                                    autoFocus
                                />
                           )}
                       </div>
                        <Button className="w-full" onClick={handleCreatePin} disabled={pinStep === 1 ? newPin.length !== 4 : confirmPin.length !== 4}>
                            {pinStep === 1 ? "Next" : "Confirm & Create PIN"}
                        </Button>
                        {pinStep === 2 && <Button variant="link" size="sm" className="w-full" onClick={() => setPinStep(1)}>Back</Button>}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isWalletVisible) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-primary/10 p-3 rounded-full mb-2">
                           <KeyRound className="w-8 h-8 text-primary"/>
                        </div>
                        <CardTitle>Enter PIN to Continue</CardTitle>
                        <CardDescription>For your security, please enter your UPI PIN to access your Curocity Bank.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center justify-center gap-4">
                           <Label htmlFor="pin-input-wallet" className="sr-only">Enter PIN</Label>
                           <Input 
                               id="pin-input-wallet" 
                               type="password" 
                               inputMode="numeric" 
                               maxLength={4}
                               value={enteredPin}
                               onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                               className="text-center text-2xl font-bold tracking-[1em] w-40" 
                               placeholder="••••"
                               autoFocus
                           />
                       </div>
                        <Button className="w-full" onClick={handlePinSubmit}>Unlock Curocity Bank</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }


    if (isLoading) {
        return (
             <div className="grid gap-6 animate-fade-in">
                <Skeleton className="h-8 w-48" />
                <Card><CardContent className="p-6 grid md:grid-cols-2 gap-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></CardContent></Card>
                <div className="grid md:grid-cols-2 gap-6"><Card><CardContent className="p-6"><Skeleton className="h-32 w-full"/></CardContent></Card><Card><CardContent className="p-6"><Skeleton className="h-32 w-full"/></CardContent></Card></div>
                <Card><CardContent className="p-6"><Skeleton className="h-48 w-full"/></CardContent></Card>
            </div>
        )
    }

    return (
        <div className="grid gap-6 animate-fade-in">
            <h2 className="text-3xl font-bold tracking-tight">Curocity Bank</h2>
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2"><Landmark /> Your Financial Hub</CardTitle>
                <CardDescription>
                    Your free bank account to manage your earnings, watch them grow with interest, and utilize them within the Curocity ecosystem.
                </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="rounded-lg bg-primary text-primary-foreground p-6 flex flex-col justify-between">
                    <div>
                    <p className="text-sm">Available Balance</p>
                    <p className="text-4xl font-bold">₹{(mechanic?.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-primary-foreground/80 mt-1">No minimum balance required</p>
                    </div>
                    <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 mt-4">
                        Withdraw Money
                    </Button>
                </div>
                <div className="space-y-4">
                    <Card className="bg-green-100 dark:bg-green-900/40 border-green-500">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <div>
                                <CardDescription className="text-green-700 dark:text-green-300">Interest Rate</CardDescription>
                                <CardTitle className="text-3xl text-green-800 dark:text-green-200">Up to 5% p.a.</CardTitle>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600"/>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Interest Earned (This Month)</CardDescription>
                            <CardTitle className="text-3xl">₹0.00</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Quick Payments
                    </CardTitle>
                    <CardDescription>Pay for supplies or send money to any UPI ID instantly from your wallet.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="flex-col h-24">
                        <Send className="w-8 h-8 mb-2 text-primary" />
                        Pay UPI ID
                    </Button>
                    <Button variant="outline" className="flex-col h-24">
                        <IndianRupee className="w-8 h-8 mb-2 text-primary" />
                        Pay Number
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex-col h-24">
                                <ScanLine className="w-8 h-8 mb-2 text-primary"/>
                                Scan & Pay
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xs">
                            <DialogHeader><DialogTitle className="text-center">My Curocity UPI QR Code</DialogTitle></DialogHeader>
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="p-4 bg-white rounded-lg border">
                                    <Image 
                                        src={mechanic?.qrCodeUrl || ''}
                                        alt="UPI QR Code"
                                        width={200}
                                        height={200}
                                    />
                                </div>
                                <p className="font-semibold text-lg text-center">{mechanic?.upiId || '...'}</p>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isBankDetailsDialogOpen} onOpenChange={setIsBankDetailsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex-col h-24 border-dashed">
                                <Building className="w-8 h-8 mb-2 text-primary" />
                                {mechanic?.bankDetails ? 'Manage Bank' : 'Link Account'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Link Your Bank Account</DialogTitle>
                                <DialogDescription>Enter your bank details to enable withdrawals.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleBankDetailsSubmit}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="holderName">Account Holder Name</Label>
                                        <Input id="holderName" name="holderName" required defaultValue={mechanic?.bankDetails?.accountHolderName || ''}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="accountNumber">Bank Account Number</Label>
                                        <Input id="accountNumber" name="accountNumber" type="number" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmAccountNumber">Confirm Account Number</Label>
                                        <Input id="confirmAccountNumber" name="confirmAccountNumber" type="number" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ifscCode">IFSC Code</Label>
                                        <Input id="ifscCode" name="ifscCode" required className="uppercase" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Save Bank Details</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
            
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CircleHelp className="text-primary"/> Instant Loans
                        </CardTitle>
                        <CardDescription>Emergency funds for tools, fuel, or personal needs, instantly.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AlertDialog open={isLoanConfirmOpen} onOpenChange={setIsLoanConfirmOpen}>
                            <DialogTrigger asChild>
                                <div className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover:bg-muted">
                                    <p className="font-semibold">Pre-approved Loan Offer</p>
                                    <p className="text-3xl font-bold my-2 text-primary">₹{loanOffer.amount.toLocaleString()}</p>
                                    <Button className="w-full">Get Instant Credit</Button>
                                </div>
                            </DialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Instant Loan</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Please review the loan details below. The amount will be credited to your wallet instantly.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="text-sm space-y-2 my-4">
                                    <div className="flex justify-between"><span>Loan Amount:</span> <span className="font-semibold">₹{loanOffer.amount.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Interest Rate:</span> <span className="font-semibold">{loanOffer.interestRate}% p.a.</span></div>
                                    <div className="flex justify-between"><span>Processing Fee:</span> <span className="font-semibold">₹{loanOffer.processingFee.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Tenure:</span> <span className="font-semibold">{loanOffer.durationMonths} Months</span></div>
                                    <div className="flex justify-between font-bold border-t pt-2 mt-2"><span>Monthly EMI:</span> <span>~₹{emi.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-bold"><span>Total Repayable:</span> <span>₹{(loanOffer.amount + (loanOffer.amount * loanOffer.interestRate/100)).toLocaleString()}</span></div>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleLoanDisbursement}>Confirm &amp; Get Money</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PiggyBank className="text-primary"/> AI Goal Planner
                        </CardTitle>
                        <CardDescription>Save for your goals and get smart tips from our AI planner.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <p className="font-semibold">Buy New Tools</p>
                                    <p className="text-sm text-muted-foreground">₹0 / ₹10,000</p>
                                </div>
                                <Progress value={0} />
                                <div className="flex gap-2 items-start mt-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted">
                                    <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                    <span>To meet your goal, you need to save about **₹85 per day**. Start saving today!</span>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full">+ Create New Goal</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>A record of all your earnings and payments.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadStatement}><Download className="mr-2 h-4 w-4"/>Download Statement</Button>
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
                        transactions.map(t => (
                        <TableRow key={t.id}>
                            <TableCell>{t.date.toDate().toLocaleDateString()}</TableCell>
                            <TableCell>{t.type}</TableCell>
                            <TableCell className={`text-right font-medium ${t.status === 'Debit' ? 'text-destructive' : 'text-green-600'}`}>
                                {t.status === 'Debit' ? '-' : '+'}₹{Math.abs(t.amount).toFixed(2)}
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center h-24">No transactions yet.</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
    )

    