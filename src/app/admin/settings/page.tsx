
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { db, functions } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Building, Landmark, Save, FileText, IndianRupee, DatabaseZap } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { httpsCallable } from 'firebase/functions'


interface CompanySettings {
    // Bank Details
    companyName: string;
    accountNumber: string;
    branchName: string;
    ifscCode: string;
    upiId: string;
    // Tax Info
    gstNumber: string;
    companyPan: string;
    companyTan: string;
    // Legal Info
    businessType: string;
    cinNumber: string;
    tradeLicense: string;
    aggregatorLicense: string;
}

export default function CompanySettingsPage() {
    const [settings, setSettings] = useState<Partial<CompanySettings>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            if (!db) return;
            const settingsRef = doc(db, 'company', 'settings');
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                setSettings(docSnap.data() as CompanySettings);
            }
            setIsLoading(false);
        }
        fetchSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }
    
    const handleSelectChange = (name: keyof CompanySettings, value: string) => {
        setSettings(prev => ({ ...prev, [name]: value }));
    }

    const handleSave = async () => {
        if (!db) {
            toast({ variant: 'destructive', title: 'Database Error' });
            return;
        }
        try {
            const settingsRef = doc(db, 'company', 'settings');
            await setDoc(settingsRef, settings, { merge: true });
            toast({
                title: 'Settings Saved',
                description: 'Company details have been updated successfully.',
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update company settings.' });
        }
    }
    
    const handleSeedDatabase = async () => {
        setIsSeeding(true);
        try {
            const seedDatabase = httpsCallable(functions, 'seedDatabase');
            const result = await seedDatabase();
            toast({
                title: 'Database Seeding Complete',
                description: (result.data as any).message,
            });
        } catch (error) {
            console.error('Error seeding database:', error);
            toast({
                variant: 'destructive',
                title: 'Seeding Failed',
                description: 'Could not populate the database. Check console for errors.',
            });
        } finally {
            setIsSeeding(false);
        }
    }
    
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/2"/><Skeleton className="h-4 w-3/4"/></CardHeader>
                    <CardContent className="space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardContent>
                </Card>
                 <Card>
                    <CardHeader><Skeleton className="h-8 w-1/2"/><Skeleton className="h-4 w-3/4"/></CardHeader>
                    <CardContent className="space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardContent>
                </Card>
                 <Card>
                    <CardHeader><Skeleton className="h-8 w-1/2"/><Skeleton className="h-4 w-3/4"/></CardHeader>
                    <CardContent className="space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DatabaseZap className="w-6 h-6"/> Developer Actions</CardTitle>
                    <CardDescription>
                       These actions are for development purposes and help in setting up the initial state of the application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleSeedDatabase} disabled={isSeeding}>
                       {isSeeding ? 'Seeding...' : 'Seed Database with Sample Data'}
                    </Button>
                     <p className="text-xs text-muted-foreground mt-2">
                        This will populate your Firestore database with sample partners, mechanics, and hospitals to help you test the platform.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Landmark className="w-6 h-6"/> Official Bank Details</CardTitle>
                    <CardDescription>
                        This is the official company bank account where partners will deposit subscription fees. These details will be shown on the partner subscription page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Account Name</Label>
                        <Input id="companyName" name="companyName" value={settings.companyName || ''} onChange={handleChange} placeholder="e.g., Cabzi FinTech Pvt. Ltd." />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input id="accountNumber" name="accountNumber" value={settings.accountNumber || ''} onChange={handleChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="branchName">Branch Name</Label>
                            <Input id="branchName" name="branchName" value={settings.branchName || ''} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ifscCode">IFSC Code</Label>
                            <Input id="ifscCode" name="ifscCode" value={settings.ifscCode || ''} onChange={handleChange} className="uppercase" />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="upiId">UPI ID (VPA)</Label>
                        <Input id="upiId" name="upiId" value={settings.upiId || ''} onChange={handleChange} placeholder="e.g., cabzi@bank" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><IndianRupee className="w-6 h-6"/> Business &amp; Tax Information</CardTitle>
                    <CardDescription>
                        Enter your company's official tax and identification details for compliance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="companyPan">Company PAN</Label>
                            <Input id="companyPan" name="companyPan" value={settings.companyPan || ''} onChange={handleChange} className="uppercase" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companyTan">Company TAN</Label>
                            <Input id="companyTan" name="companyTan" value={settings.companyTan || ''} onChange={handleChange} className="uppercase" />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="gstNumber">GST Number</Label>
                        <Input id="gstNumber" name="gstNumber" value={settings.gstNumber || ''} onChange={handleChange} className="uppercase" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-6 h-6"/> Legal &amp; Registrations</CardTitle>
                    <CardDescription>
                        Manage your business registration and license details.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessType">Business Registration Type</Label>
                            <Select value={settings.businessType || ''} onValueChange={(value) => handleSelectChange('businessType', value)}>
                                <SelectTrigger id="businessType">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="proprietorship">Proprietorship</SelectItem>
                                    <SelectItem value="partnership">Partnership</SelectItem>
                                    <SelectItem value="llp">LLP</SelectItem>
                                    <SelectItem value="pvt_ltd">Private Limited Company</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="cinNumber">CIN (Corporate Identification No.)</Label>
                            <Input id="cinNumber" name="cinNumber" value={settings.cinNumber || ''} onChange={handleChange} className="uppercase" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="tradeLicense">Trade License Number</Label>
                            <Input id="tradeLicense" name="tradeLicense" value={settings.tradeLicense || ''} onChange={handleChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="aggregatorLicense">Aggregator License Number</Label>
                            <Input id="aggregatorLicense" name="aggregatorLicense" value={settings.aggregatorLicense || ''} onChange={handleChange} />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <div className="flex justify-end">
                <Button onClick={handleSave} size="lg">
                    <Save className="mr-2 h-4 w-4" />
                    Save All Settings
                </Button>
            </div>
        </div>
    )
}
