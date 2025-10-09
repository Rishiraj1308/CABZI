
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Gem, ShieldCheck, TrendingUp, Star, Sparkles, Server, BarChart, Users, AlertTriangle, Check, Layers, Bot, Database, Clock, Banknote } from 'lucide-react'
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
        name: 'Basic', 
        price: '₹2,499', 
        duration: 'per month', 
        description: 'For small clinics & hospitals starting out.',
        features: [
            { text: 'Mission Control Dashboard', icon: Layers, available: true },
            { text: 'Real-time Ambulance Tracking', icon: TrendingUp, available: true },
            { text: 'Smart Cascade for Requests', icon: Server, available: true },
            { text: 'Emergency Severity Categorization', icon: AlertTriangle, available: true },
            { text: 'Driver/Paramedic App Access', icon: Users, available: true },
            { text: 'Basic Reporting', icon: BarChart, available: false },
        ], 
        current: true, // This is the currently active/available plan
        popular: false,
    },
    { 
        name: 'Growth', 
        price: '₹5,999', 
        duration: 'per month', 
        description: 'For growing hospitals needing advanced tools.',
        features: [
            { text: 'All "Basic" features', icon: Gem, available: true },
            { text: 'Priority Dispatch in Rider App', icon: Star, available: false },
            { text: 'Bed Availability Sync', icon: Database, available: true },
            { text: 'Advanced Analytics & Reports', icon: BarChart, available: true },
            { text: 'Automated Billing Integration', icon: Sparkles, available: false },
        ], 
        current: false,
        popular: true,
    },
    { 
        name: 'Enterprise', 
        price: '₹12,999+', 
        duration: 'per month', 
        description: 'For large hospitals and chains.',
        features: [
            { text: 'All "Growth" features', icon: Gem, available: true },
            { text: 'API Integration with HIS/ERP', icon: Bot, available: false },
            { text: 'AI Predictive Dispatch', icon: Bot, available: false },
            { text: 'Dedicated Account Manager', icon: ShieldCheck, available: false },
        ], 
        current: false,
        popular: false,
    },
]


export default function CureSubscriptionPage() {
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
    const session = localStorage.getItem('cabzi-cure-session');
    if(session) {
        const { phone } = JSON.parse(session);
        const partnerQuery = query(collection(db, 'ambulances'), where('phone', '==', phone));
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
    const partnerRef = doc(db, 'ambulances', partnerId);
    
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
            <h2 className="text-3xl font-bold tracking-tight">Cure Partner Subscriptions</h2>
            <p className="text-muted-foreground">Choose a plan that fits your hospital's operational needs and scale.</p>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Please Note</AlertTitle>
          <AlertDescription>
            This is a sample pricing structure. Final plans and features will be tailored after consultation. Some advanced features are still under development.
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {allPlans.map(plan => (
                <Card key={plan.name} className={cn(
                    "flex flex-col h-full",
                    plan.popular && "ring-2 ring-primary border-primary shadow-lg",
                    plan.current && "border-2 border-green-500"
                )}>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>{plan.name}</CardTitle>
                            {plan.popular && <Badge><Star className="w-3 h-3 mr-1" /> Most Popular</Badge>}
                            {plan.current && <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">Current Plan</Badge>}
                        </div>
                        <CardDescription className="pt-2">
                            <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                            <span className="text-sm"> {plan.duration}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            {plan.features.map(f => (
                                <li key={f.text} className={cn("flex items-center gap-3", !f.available && "opacity-50")}>
                                    <f.icon className={cn("w-5 h-5", f.available ? "text-green-600" : "text-muted-foreground")} />
                                    <span>{f.text}</span>
                                    {!f.available && <Badge variant="outline" className="ml-auto text-xs"><Clock className="w-3 h-3 mr-1"/>Coming Soon</Badge>}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button 
                                 className={cn("w-full", plan.popular && !plan.current && "btn-glow")} 
                                 disabled={plan.current || plan.price === 'Coming Soon'}
                                 variant={plan.current ? "outline" : "default"}
                               >
                                {plan.current ? 'Your Current Plan' : 'Choose Plan'}
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
