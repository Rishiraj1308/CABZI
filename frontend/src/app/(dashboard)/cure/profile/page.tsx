
'use client'

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ambulance, IndianRupee, Save, Phone, Check, Loader2, FileText, Shield, Building, Edit, View, Hospital, MapPin } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCurePartner } from '../layout';
import { useDb } from '@/lib/firebase';
import { DetailItem } from '@/components/shared/detail-item';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const allServices = [
    // Hospital & Clinic
    "24/7 Emergency", "Ambulance Service", "Pharmacy", "Pathology Lab", "General Consultation",
    // Hospital Specific
    "ICU (Intensive Care Unit)", "IPD (In-Patient Department)", "Radiology (X-Ray/CT)", "Operation Theater",
    "Cardiology", "Orthopedics", "Neurology", "Pediatrics", "Gynecology",
    // Clinic Specific
    "Dental Care", "Dermatology (Skin)", "ENT", "Ophthalmology (Eye)",
];

const requiredDocuments = [
    { name: "Hospital Registration Certificate" },
    { name: "Fire & Safety Certificate (NOC)" },
    { name: "Pollution Control Certificate" },
    { name: "Bio-medical Waste Authorization" },
    { name: "Ambulance Registration (RC)" },
    { name: "Partnership Agreement / MOU" },
];


export default function CureProfilePage() {
    const { partnerData, isLoading } = useCurePartner();
    const db = useDb();

    const [baseFare, setBaseFare] = useState<number | string>('');
    const [perKmRate, setPerKmRate] = useState<number | string>('');
    const [isSavingFares, setIsSavingFares] = useState(false);

    // State for services dialog
    const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [isSavingServices, setIsSavingServices] = useState(false);

    useEffect(() => {
        if (partnerData) {
            setBaseFare(partnerData.baseFare || '');
            setPerKmRate(partnerData.perKmRate || '');
            setSelectedServices(partnerData.services || []);
        }
    }, [partnerData]);
    
     const getInitials = (name: string | null | undefined) => {
        if (!name) return 'C';
        const names = name.split(' ');
        if (names.length > 1) {
          return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2);
      }

    const handleSaveFares = async () => {
        if (!partnerData?.id || !db) {
            toast.error('Error', { description: 'Could not save settings. Partner not found.' });
            return;
        }
        setIsSavingFares(true);
        const fareData = {
            baseFare: Number(baseFare),
            perKmRate: Number(perKmRate)
        };

        if (isNaN(fareData.baseFare) || isNaN(fareData.perKmRate)) {
             toast.error('Invalid Input', { description: 'Please enter valid numbers for fares.' });
             setIsSavingFares(false);
            return;
        }
        
        try {
            const partnerRef = doc(db, 'curePartners', partnerData.id);
            await updateDoc(partnerRef, fareData);
            toast.success('Fare Settings Saved', { description: 'Your ambulance fares have been updated.' });
        } catch (error) {
             toast.error('Save Failed', { description: 'Could not update your fare settings.' });
        } finally {
            setIsSavingFares(false);
        }
    }

    const handleServicesSave = async () => {
        if (!partnerData?.id || !db) {
            toast.error('Error', { description: 'Could not save services. Partner not found.' });
            return;
        }
        setIsSavingServices(true);
        try {
            const partnerRef = doc(db, 'curePartners', partnerData.id);
            await updateDoc(partnerRef, { services: selectedServices });
            toast.success('Services Updated', { description: 'Your offered services have been saved.' });
            setIsServicesDialogOpen(false);
        } catch (error) {
            toast.error('Update Failed', { description: 'Could not save your new services.' });
        } finally {
            setIsSavingServices(false);
        }
    };
    
    const handleServiceCheck = (service: string, checked: boolean) => {
        setSelectedServices(prev => 
            checked ? [...prev, service] : prev.filter(s => s !== service)
        );
    }

    if (isLoading) {
      return (
          <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">Cure Partner Profile</h2>
              <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6">
                      <Skeleton className="h-48 w-full" />
                  </div>
                  <div className="lg:col-span-2 space-y-6">
                      <Skeleton className="h-64 w-full" />
                      <Skeleton className="h-40 w-full" />
                  </div>
              </div>
          </div>
      )
    }

    if (!partnerData) {
        return <p>Could not load your profile.</p>
    }

  return (
      <div className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Cure Partner Profile</h2>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
               <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader className="flex flex-row items-center gap-4 p-4">
                            <Avatar className="w-16 h-16 border">
                                <AvatarImage src="https://placehold.co/100x100.png" alt={partnerData?.name} data-ai-hint="hospital building" />
                                <AvatarFallback className="text-xl">{getInitials(partnerData?.name).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-xl">{partnerData?.name}</CardTitle>
                                <CardDescription className="font-mono text-xs">{partnerData?.id}</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary"/> Documents & Compliance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {requiredDocuments.map(doc => (
                                <div key={doc.name} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
                                    <span className="font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground"/>{doc.name}</span>
                                    {doc.name === "Partnership Agreement / MOU" ? (
                                        <Button variant="outline" size="sm" onClick={() => toast.info('This feature is coming soon!')}>
                                            <View className="w-4 h-4 mr-2"/> View
                                        </Button>
                                    ) : (
                                        <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

               </div>
               <div className="lg:col-span-2 space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2"><Hospital className="w-5 h-5"/> Facility Details</CardTitle>
                          <CardDescription>Your verified business information.</CardDescription>
                      </CardHeader>
                       <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <DetailItem icon={Phone} label="Contact Phone" value={partnerData.phone} />
                                <DetailItem icon={Building} label="Facility Type" value={partnerData.businessType} />
                                <DetailItem icon={FileText} label="Registration No." value={partnerData.registrationNumber} />
                                <DetailItem icon={Building} label="Sub-Type" value={partnerData.clinicType || partnerData.hospitalType} />
                            </div>
                             <div className="p-3 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Registered Address</p>
                                <p className="font-semibold text-sm flex items-start gap-2 pt-1"><MapPin className="w-4 h-4 mt-0.5 shrink-0"/>{partnerData.address || 'N/A'}</p>
                            </div>
                       </CardContent>
                  </Card>

                  {partnerData?.businessType === 'Hospital' && (
                     <Card>
                      <CardHeader>
                           <CardTitle className="flex items-center gap-2"><IndianRupee className="w-5 h-5 text-primary"/> Ambulance Fare Settings</CardTitle>
                           <CardDescription>Set your own pricing for ambulance services. This will be used to calculate estimated fares for patients.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                           <div className="grid md:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                   <Label htmlFor="baseFare">Base Fare (INR)</Label>
                                   <Input id="baseFare" type="number" placeholder="e.g., 500" value={baseFare} onChange={e => setBaseFare(e.target.value)} disabled={isSavingFares}/>
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="perKmRate">Per Kilometer Rate (INR)</Label>
                                   <Input id="perKmRate" type="number" placeholder="e.g., 20" value={perKmRate} onChange={e => setPerKmRate(e.target.value)} disabled={isSavingFares}/>
                               </div>
                           </div>
                      </CardContent>
                      <CardFooter>
                           <Button onClick={handleSaveFares} disabled={isSavingFares}>
                               {isSavingFares ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/> Save Fare Settings</>}
                            </Button>
                      </CardFooter>
                    </Card>
                  )}

                  <Card>
                      <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Ambulance className="w-5 h-5 text-primary"/>
                                <CardTitle>My Services</CardTitle>
                            </div>
                            <Dialog open={isServicesDialogOpen} onOpenChange={setIsServicesDialogOpen}>
                                <DialogTrigger asChild>
                                   <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2"/>Edit</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Edit Your Services</DialogTitle>
                                        <DialogDescription>Select all services and departments available at your facility.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                                        {allServices.map(service => (
                                            <div key={service} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={service}
                                                    checked={selectedServices.includes(service)}
                                                    onCheckedChange={(checked) => handleServiceCheck(service, !!checked)}
                                                />
                                                <label htmlFor={service} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {service}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsServicesDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleServicesSave} disabled={isSavingServices}>
                                            {isSavingServices ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/> Save Changes</>}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                           </Dialog>
                          </div>
                          <CardDescription>The list of services you offer to patients and for emergency response.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="flex flex-wrap gap-2">
                              {partnerData?.services && partnerData.services.length > 0 ? (
                                  partnerData.services.map((service: string) => (
                                      <Badge key={service} variant="secondary" className="p-2 text-sm">
                                          <Check className="w-4 h-4 mr-1.5 text-green-600"/>
                                          {service}
                                      </Badge>
                                  ))
                              ) : (
                                  <p className="text-sm text-muted-foreground">No services have been configured for this facility yet.</p>
                              )}
                          </div>
                      </CardContent>
                  </Card>
               </div>
           </div>
      </div>
  );
}

    