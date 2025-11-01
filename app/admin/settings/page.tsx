
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useDb, useFunctions } from '@/firebase/client-provider'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Building, Landmark, Save, FileText, IndianRupee, DatabaseZap, Palette } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { httpsCallable } from 'firebase/functions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'


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
    // Theme
    themePrimaryH?: number;
    themePrimaryS?: number;
    themePrimaryL?: number;
    themeAccentH?: number;
    themeAccentS?: number;
    themeAccentL?: number;
}

export default function CompanySettingsPage() {
    const [settings, setSettings] = useState<Partial<CompanySettings>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const { toast } = useToast();
    const db = useDb();
    const functions = useFunctions();

    // Theme state
    const [primaryH, setPrimaryH] = useState(180);
    const [primaryS, setPrimaryS] = useState(35);
    const [primaryL, setPrimaryL] = useState(25);
    const [accentH, setAccentH] = useState(45);
    const [accentS, setAccentS] = useState(100);
    const [accentL, setAccentL] = useState(50);


    useEffect(() => {
        const fetchSettings = async () => {
            if (!db) return;
            const settingsRef = doc(db, 'company', 'settings');
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as CompanySettings;
                setSettings(data);
                // Set theme values from fetched data or defaults
                setPrimaryH(data.themePrimaryH || 180);
                setPrimaryS(data.themePrimaryS || 35);
                setPrimaryL(data.themePrimaryL || 25);
                setAccentH(data.themeAccentH || 45);
                setAccentS(data.themeAccentS || 100);
                setAccentL(data.themeAccentL || 50);
            }
            setIsLoading(false);
        }
        fetchSettings();
    }, [db]);
    
    // Apply theme changes dynamically
    useEffect(() => {
        document.documentElement.style.setProperty('--primary-h', `${primaryH}deg`);
        document.documentElement.style.setProperty('--primary-s', `${primaryS}%`);
        document.documentElement.style.setProperty('--primary-l', `${primaryL}%`);
        document.documentElement.style.setProperty('--primary', `${primaryH} ${primaryS}% ${primaryL}%`);
        
        document.documentElement.style.setProperty('--accent-h', `${accentH}deg`);
        document.documentElement.style.setProperty('--accent-s', `${accentS}%`);
        document.documentElement.style.setProperty('--accent-l', `${accentL}%`);
        document.documentElement.style.setProperty('--accent', `${accentH} ${accentS}% ${accentL}%`);

    }, [primaryH, primaryS, primaryL, accentH, accentS, accentL]);


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
            const newSettings = {
                ...settings,
                themePrimaryH: primaryH,
                themePrimaryS: primaryS,
                themePrimaryL: primaryL,
                themeAccentH: accentH,
                themeAccentS: accentS,
                themeAccentL: accentL,
            }
            await setDoc(settingsRef, newSettings, { merge: true });
            toast({
                title: 'Settings Saved',
                description: 'Company details and theme have been updated successfully.',
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update company settings.' });
        }
    }
    
    const handleSeedDatabase = async () => {
        if (!functions) {
             toast({ variant: 'destructive', title: 'Functions not ready', description: 'Firebase Functions service is not available.' });
            return;
        }
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
    
    const renderBusinessSettings = () => (
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Landmark className="w-6 h-6"/> Official Bank Details</CardTitle>
                    <CardDescription>
                        This is the official company bank account where partners will deposit subscription fees. These details will be shown on the partner's subscription page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Account Name</Label>
                        <Input id="companyName" name="companyName" value={settings.companyName || ''} onChange={handleChange} placeholder="e.g., Curocity FinTech Pvt. Ltd." />
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
                        <Input id="upiId" name="upiId" value={settings.upiId || ''} onChange={handleChange} placeholder="e.g., curocity@bank" />
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
        </div>
    );
    
     const renderThemeSettings = () => (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Theme Customizer</CardTitle>
                    <CardDescription>Adjust the application's color scheme in real-time. Changes are reflected across the app.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold text-lg flex items-center">Primary Color <div className="w-5 h-5 rounded-full ml-2" style={{ backgroundColor: `hsl(${primaryH}, ${primaryS}%, ${primaryL}%)`}}/></h4>
                        <div className="space-y-2">
                            <Label>Hue ({primaryH})</Label>
                            <Slider value={[primaryH]} onValueChange={(v) => setPrimaryH(v[0])} max={360} step={1} />
                        </div>
                         <div className="space-y-2">
                            <Label>Saturation ({primaryS}%)</Label>
                            <Slider value={[primaryS]} onValueChange={(v) => setPrimaryS(v[0])} max={100} step={1} />
                        </div>
                         <div className="space-y-2">
                            <Label>Lightness ({primaryL}%)</Label>
                            <Slider value={[primaryL]} onValueChange={(v) => setPrimaryL(v[0])} max={100} step={1} />
                        </div>
                     </div>
                      <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold text-lg flex items-center">Accent Color <div className="w-5 h-5 rounded-full ml-2" style={{ backgroundColor: `hsl(${accentH}, ${accentS}%, ${accentL}%)`}}/></h4>
                        <div className="space-y-2">
                            <Label>Hue ({accentH})</Label>
                            <Slider value={[accentH]} onValueChange={(v) => setAccentH(v[0])} max={360} step={1} />
                        </div>
                         <div className="space-y-2">
                            <Label>Saturation ({accentS}%)</Label>
                            <Slider value={[accentS]} onValueChange={(v) => setAccentS(v[0])} max={100} step={1} />
                        </div>
                         <div className="space-y-2">
                            <Label>Lightness ({accentL}%)</Label>
                            <Slider value={[accentL]} onValueChange={(v) => setAccentL(v[0])} max={100} step={1} />
                        </div>
                     </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Button>Primary Button</Button>
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Accent Button</Button>
                    <Badge>Badge</Badge>
                </CardContent>
            </Card>
        </div>
    );

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
            </div>
        )
    }

    return (
        <div className="space-y-6">
             <Tabs defaultValue="business" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="business"><Building className="w-4 h-4 mr-2"/>Business</TabsTrigger>
                    <TabsTrigger value="theme"><Palette className="w-4 h-4 mr-2"/>Theme</TabsTrigger>
                    <TabsTrigger value="dev"><DatabaseZap className="w-4 h-4 mr-2"/>Developer</TabsTrigger>
                </TabsList>
                <TabsContent value="business" className="mt-6">{renderBusinessSettings()}</TabsContent>
                <TabsContent value="theme" className="mt-6">{renderThemeSettings()}</TabsContent>
                <TabsContent value="dev" className="mt-6">
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
                </TabsContent>
            </Tabs>
            
            <div className="flex justify-end">
                <Button onClick={handleSave} size="lg">
                    <Save className="mr-2 h-4 w-4" />
                    Save All Settings
                </Button>
            </div>
        </div>
    )
}
