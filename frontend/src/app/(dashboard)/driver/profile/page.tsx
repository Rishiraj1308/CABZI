
'use client'

import * as React from 'react';
import { useDriver } from '@/context/DriverContext'; // Corrected import path
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Cake, VenetianMask, Phone, FileText, Fingerprint, BadgeCheck, Car, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined | null }) => (
    <div className="flex items-start gap-4">
        <Icon className="w-5 h-5 text-muted-foreground mt-1" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-semibold">{value || 'N/A'}</p>
        </div>
    </div>
);


export default function DriverProfilePage() {
    const { partnerData, isLoading } = useDriver();

    const getInitials = (name: string | undefined) => {
        if (!name) return 'P';
        const names = name.split(' ');
        return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
    }

    if (isLoading) {
        return (
             <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                         <Skeleton className="h-48 w-full" />
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </div>
        )
    }
    
    if (!partnerData) {
        return <p>Could not load partner data.</p>
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 space-y-6">
                     <Card className="overflow-hidden">
                        <CardHeader className="items-center text-center bg-muted/40 pb-6">
                            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                                <AvatarImage src={partnerData.photoUrl} alt={partnerData.name} />
                                <AvatarFallback className="text-3xl">{getInitials(partnerData.name).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="pt-2">
                                <CardTitle className="text-2xl">{partnerData.name}</CardTitle>
                                <CardDescription className="font-mono">{partnerData.partnerId}</CardDescription>
                            </div>
                            {partnerData.isCurocityPink && (
                                <Badge className="mt-2 bg-pink-500 text-white"><Shield className="w-4 h-4 mr-2"/> Curocity Pink Partner</Badge>
                            )}
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                           <DetailItem icon={Phone} label="Phone Number" value={partnerData.phone} />
                           <DetailItem icon={VenetianMask} label="Gender" value={partnerData.gender} />
                           <DetailItem icon={Cake} label="Date of Birth" value={partnerData.dob ? format(new Date(partnerData.dob), 'PPP') : 'N/A'} />
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> Documents</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DetailItem icon={Fingerprint} label="Aadhaar Number" value={partnerData.aadhaarNumber} />
                            <DetailItem icon={FileText} label="PAN Card" value={partnerData.panCard} />
                            <DetailItem icon={BadgeCheck} label="Driving Licence" value={partnerData.drivingLicence} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5 text-primary"/> Vehicle Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DetailItem label="Vehicle Type" value={partnerData.vehicleType} />
                            <DetailItem label="Brand" value={partnerData.vehicleBrand} />
                            <DetailItem label="Model" value={partnerData.vehicleName} />
                            <DetailItem label="Registration No." value={partnerData.vehicleNumber} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
