
'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Building } from "lucide-react"

const mockSettings = {
    platformFee: 20,
    driverCancellationFee: 50,
    riderCancellationFee: 50,
    supportEmail: 'support@curocity.com',
    supportPhone: '+91-888-888-8888',
    emergencyNumber: '112',
    enableReferrals: true,
    referralBonus: 100,
    defaultCurrency: 'INR',
    driverAppMinVersion: '2.1.0',
    riderAppMinVersion: '2.1.0',
    companyName: 'Curocity Technologies Pvt. Ltd.',
    companyAddress: 'WeWork, DLF Two Horizon Centre, Golf Course Road, Gurgaon, Haryana',
    companyCIN: 'U12345DL2024PTC67890',
    companyGST: '07AAPCU1234A1Z5'
}

export default function SettingsPage() {
    const [settings, setSettings] = useState(mockSettings);
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({...prev, [id]: value}));
    }

    const handleSave = () => {
        setIsSaving(true);
        // Simulate an API call
        setTimeout(() => {
            setIsSaving(false);
            toast.success('Settings Saved!', {
                description: 'Your changes have been successfully saved.',
            })
        }, 1500);
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5"/> Company Profile</CardTitle>
                    <CardDescription>Manage your company's legal and official information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="companyName">Legal Company Name</Label>
                            <Input id="companyName" value={settings.companyName} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="companyAddress">Registered Address</Label>
                            <Input id="companyAddress" value={settings.companyAddress} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="companyCIN">Company CIN</Label>
                            <Input id="companyCIN" value={settings.companyCIN} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="companyGST">GST Number</Label>
                            <Input id="companyGST" value={settings.companyGST} onChange={handleInputChange} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Financial Settings</CardTitle>
                    <CardDescription>Manage fees, commissions, and currency for the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="platformFee">Platform Fee (%)</Label>
                            <Input id="platformFee" type="number" value={settings.platformFee} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="driverCancellationFee">Driver Cancellation Fee (₹)</Label>
                            <Input id="driverCancellationFee" type="number" value={settings.driverCancellationFee} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="riderCancellationFee">Rider Cancellation Fee (₹)</Label>
                            <Input id="riderCancellationFee" type="number" value={settings.riderCancellationFee} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-1.5">
                            <Label htmlFor="referralBonus">Referral Bonus (₹)</Label>
                            <Input id="referralBonus" type="number" value={settings.referralBonus} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="defaultCurrency">Default Currency</Label>
                             <Select value={settings.defaultCurrency} onValueChange={(value) => setSettings(prev => ({...prev, defaultCurrency: value}))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INR">INR (Indian Rupee)</SelectItem>
                                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                        <Switch id="enableReferrals" checked={settings.enableReferrals} onCheckedChange={(checked) => setSettings(prev => ({...prev, enableReferrals: checked}))} />
                        <Label htmlFor="enableReferrals">Enable Referral Program</Label>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Contact & Support</CardTitle>
                    <CardDescription>Update the main contact points for your users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="supportEmail">Support Email</Label>
                            <Input id="supportEmail" type="email" value={settings.supportEmail} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="supportPhone">Support Phone</Label>
                            <Input id="supportPhone" type="tel" value={settings.supportPhone} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emergencyNumber">National Emergency Number</Label>
                            <Input id="emergencyNumber" type="tel" value={settings.emergencyNumber} onChange={handleInputChange} />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>App Version Control</CardTitle>
                    <CardDescription>Manage minimum required app versions for users and partners.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="riderAppMinVersion">Rider App Minimum Version</Label>
                            <Input id="riderAppMinVersion" placeholder="e.g., 2.1.0" value={settings.riderAppMinVersion} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="driverAppMinVersion">Partner App Minimum Version</Label>
                            <Input id="driverAppMinVersion" placeholder="e.g., 2.1.0" value={settings.driverAppMinVersion} onChange={handleInputChange} />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
             <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                   {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Save Changes
                </Button>
            </div>
        </div>
    )
}
