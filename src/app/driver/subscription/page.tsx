
      
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Gem, ShieldCheck, Wrench, HeartHandshake, Star, TrendingUp, CircleHelp, Sparkles, Banknote, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { doc, onSnapshot, updateDoc, Timestamp, query, collection, where } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"


interface CompanySettings {
    companyName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
}

interface Subscription {
    planName: string;
    status: 'Active' | 'Expired' | 'Trial' | 'Cancelled';
    endDate: Timestamp;
}

const allPlans = [
    { 
        name: 'Free Trial', 
        price: '₹0', 
        duration: 'for 1 month', 
        features: [
            { text: '0% Commission Rides', icon: Gem },
            { text: 'Standard Support', icon: HeartHandshake },
        ], 
        popular: false,
    },
    { 
        name: 'Basic', 
        price: '₹999', 
        duration: 'per month', 
        features: [
            { text: '0% Commission Rides', icon: Gem },
            { text: 'Standard Support', icon: HeartHandshake },
            { text: 'Instant Loans up to ₹10,000', icon: CircleHelp },
            { text: 'Partner Garage Access', icon: Wrench },
        ], 
        popular: false,
    },
    { 
        name: 'Pro', 
        price: '₹2,500', 
        duration: 'per month', 
        features: [
            { text: '0% Commission Rides', icon: Gem },
            { text: 'Partner Garage Access', icon: Wrench },
            { text: 'Priority Support', icon: HeartHandshake },
            { text: 'Free Accidental Insurance (₹2 Lakh)', icon: ShieldCheck },
            { text: 'Instant Loans up to ₹25,000', icon: CircleHelp },
        ], 
        popular: true,
    },
    { 
        name: 'Ultimate', 
        price: 'Coming Soon', 
        duration: 'per year', 
        features: [
            { text: 'All "Pro" features included', icon: Star },
            { text: 'Free Accidental Insurance (₹5 Lakh)', icon: ShieldCheck },
            { text: '24/7 Priority Helpline', icon: HeartHandshake },
        ], 
        popular: false,
    },
]


export default function SubscriptionPage() {
  const { toast } = useToast();
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (!db) {
        setIsLoading(false);
        return;
    }
    
    // Fetch company settings
    const settingsRef = doc(db, 'company', 'settings');
    const unsubSettings = onSnapshot(settingsRef, (doc) => {
        setCompanySettings(doc.exists() ? doc.data() as CompanySettings : {});
    });

    // Fetch partner subscription details
    const session = localStorage.getItem('cabzi-session');
    if(session) {
        const { phone } = JSON.parse(session);
        const partnerQuery = query(collection(db, 'partners'), where('phone', '==', phone));
        onSnapshot(partnerQuery, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setPartnerId(doc.id);
                setCurrentSubscription(doc.data().subscription as Subscription);
            }
            setIsLoading(false);
        })
    } else {
        setIsLoading(false);
    }
    
    return () => unsubSettings();
  }, []);

  const handleActivatePlan = async (planName: string) => {
    if (!partnerId || !db) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify partner. Please re-login.' });
        return;
    }
    
    // This is a simulation. A real app would handle payment first.
    const partnerRef = doc(db, 'partners', partnerId);
    
    const startDate = new Date();
    const endDate = new Date();
    
    if (planName === 'Daily Pass') {
      endDate.setDate(startDate.getDate() + 1);
    } else {
      endDate.setMonth(startDate.getMonth() + 1);
    }
    
    const newSubscription: Subscription = {
        planName,
        status: 'Active',
        endDate: Timestamp.fromDate(endDate),
    }

    try {
        await updateDoc(partnerRef, { subscription: newSubscription });
        toast({
            title: 'Plan Activated!',
            description: `Your ${planName} plan is now active.`,
            className: 'bg-green-600 text-white border-green-600',
        });
    } catch (error) {
        console.error('Failed to activate plan:', error);
        toast({ variant: 'destructive', title: 'Activation Failed', description: 'Could not update your subscription.' });
    }
  }
  
  const currentPlan = allPlans.find(p => p.name === currentSubscription?.planName) || allPlans[0];


  return (
     <div className="grid gap-6">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Subscription Plans</h2>
            <p className="text-muted-foreground">Choose a plan that works for you. Drive more, earn more with 0% commission.</p>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Please Note</AlertTitle>
          <AlertDescription>
            These are example subscription plans. The final pricing and features are subject to change before the official launch.
          </AlertDescription>
        </Alert>
        
        {currentPlan && (
            <Card className="bg-primary text-primary-foreground border-accent">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gem /> Your Current Plan: {currentPlan.name}</CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                        {currentSubscription?.status === 'Trial' 
                            ? 'Your trial is active. Upgrade to unlock more benefits.' 
                            : `Your plan is active until ${currentSubscription?.endDate.toDate().toLocaleDateString()}.`}
                    </CardDescription>
                </CardHeader>
            </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-6 h-6 text-primary"/>
                    Subscription Payment Details
                </CardTitle>
                <CardDescription>
                    To activate a plan, please transfer the subscription amount to our official company account given below. Your plan will be activated within 2 hours of payment confirmation.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="p-4 rounded-lg bg-muted grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-5 w-3/4" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-5 w-3/4" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-5 w-3/4" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-5 w-3/4" /></div>
                    </div>
                ) : companySettings && companySettings.accountNumber ? (
                    <div className="p-4 rounded-lg bg-muted grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Account Name</p>
                            <p className="font-semibold">{companySettings.companyName || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Bank Account Number</p>
                            <p className="font-semibold font-mono">{companySettings.accountNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">IFSC Code</p>
                            <p className="font-semibold font-mono">{companySettings.ifscCode}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">UPI ID (VPA)</p>
                            <p className="font-semibold font-mono">{companySettings.upiId || 'N/A'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-lg bg-muted text-center text-muted-foreground">
                        <p>Company bank details will be updated soon by the admin. Please check back later.</p>
                    </div>
                )}
            </CardContent>
        </Card>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {allPlans.map(plan => (
                <Card key={plan.name} className={cn(
                    "flex flex-col h-full", 
                    plan.popular && "ring-2 ring-accent border-accent shadow-lg",
                    plan.price === 'Coming Soon' && plan.name !== currentPlan.name && "bg-muted/40",
                    plan.name === currentPlan.name && "border-2 border-green-500"
                )}>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>{plan.name}</CardTitle>
                             {plan.popular && <Badge variant="destructive" className="bg-accent text-accent-foreground"><Star className="w-3 h-3 mr-1" /> Most Popular</Badge>}
                        </div>
                        <CardDescription>
                            <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                            {plan.price !== 'Coming Soon' && !plan.duration.startsWith('for') && <span className="text-sm"> / {plan.duration}</span>}
                            {plan.price !== 'Coming Soon' && plan.duration.startsWith('for') && <span className="text-sm"> {plan.duration}</span>}
                            {plan.price !== '₹0' && plan.price !== 'Coming Soon' && <span className="text-xs text-muted-foreground ml-1">(+ 18% GST)</span>}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            {plan.features.map(f => (
                                <li key={f.text} className="flex items-center gap-3">
                                    <f.icon className="w-5 h-5 text-primary" /> 
                                    <span>{f.text}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter className="flex-col items-stretch gap-2 mt-auto pt-6">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button 
                                 className={cn("w-full", plan.popular && plan.name !== currentPlan.name && "btn-glow bg-accent text-accent-foreground hover:bg-accent/90")} 
                                 disabled={plan.name === currentPlan.name || plan.price === 'Coming Soon'}
                                 variant={plan.name === currentPlan.name ? "outline" : "default"}
                               >
                                {plan.name === currentPlan.name ? 'Current Plan' : (plan.price === 'Coming Soon' ? 'Coming Soon' : 'Activate Plan')}
                               </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Plan Activation</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You are about to activate the <span className="font-bold">{plan.name}</span> plan for <span className="font-bold">{plan.price}</span>. Please confirm after making the payment to the company account.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleActivatePlan(plan.name)}>
                                        I have Paid, Activate
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            ))}
        </div>
     </div>
  )
}

    