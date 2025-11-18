
'use client'

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ambulance, IndianRupee, Save, BadgeCheck, Phone } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCurePartner } from '../layout';
import { useDb } from '@/lib/firebase';
import { DetailItem } from '@/components/shared/detail-item';

export default function CureProfilePage() {
    const { partnerData, isLoading } = useCurePartner();
    const db = useDb();

    const [baseFare, setBaseFare] = useState<number | string>('');
    const [perKmRate, setPerKmRate] = useState<number | string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (partnerData) {
            setBaseFare(partnerData.baseFare || '');
            setPerKmRate(partnerData.perKmRate || '');
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
        setIsSaving(true);
        const fareData = {
            baseFare: Number(baseFare),
            perKmRate: Number(perKmRate)
        };

        if (isNaN(fareData.baseFare) || isNaN(fareData.perKmRate)) {
             toast.error('Invalid Input', { description: 'Please enter valid numbers for fares.' });
             setIsSaving(false);
            return;
        }
        
        try {
            const partnerRef = doc(db, 'curePartners', partnerData.id);
            await updateDoc(partnerRef, fareData);
            toast.success('Fare Settings Saved', { description: 'Your ambulance fares have been updated.' });
        } catch (error) {
             toast.error('Save Failed', { description: 'Could not update your fare settings.' });
        } finally {
            setIsSaving(false);
        }
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
                    <Card className="overflow-hidden">
                        <CardHeader className="items-center text-center bg-muted/40 pb-6">
                            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                                <AvatarImage src="https://placehold.co/100x100.png" alt={partnerData?.name} data-ai-hint="hospital building" />
                                <AvatarFallback className="text-3xl">{getInitials(partnerData?.name).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="pt-2">
                                <CardTitle className="text-2xl">{partnerData?.name}</CardTitle>
                                <CardDescription className="font-mono">{partnerData?.id}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                           <DetailItem icon={Phone} label="Contact Phone Number" value={partnerData?.phone} />
                           <DetailItem icon={BadgeCheck} label="Govt. Registration No." value={partnerData?.registrationNumber} />
                        </CardContent>
                    </Card>
               </div>
               <div className="lg:col-span-2 space-y-6">
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
                                   <Input id="baseFare" type="number" placeholder="e.g., 500" value={baseFare} onChange={e => setBaseFare(e.target.value)} disabled={isSaving}/>
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor="perKmRate">Per Kilometer Rate (INR)</Label>
                                   <Input id="perKmRate" type="number" placeholder="e.g., 20" value={perKmRate} onChange={e => setPerKmRate(e.target.value)} disabled={isSaving}/>
                               </div>
                           </div>
                      </CardContent>
                      <CardFooter>
                           <Button onClick={handleSaveFares} disabled={isSaving}>
                               {isSaving ? 'Saving...' : <><Save className="mr-2 h-4 w-4"/> Save Fare Settings</>}
                            </Button>
                      </CardFooter>
                    </Card>
                  )}

                  <Card>
                      <CardHeader>
                          <div className="flex items-center gap-2">
                              <Ambulance className="w-5 h-5 text-primary"/>
                              <CardTitle>My Services</CardTitle>
                          </div>
                          <CardDescription>The list of ambulance services you offer.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="flex flex-wrap gap-2">
                              {partnerData?.services && partnerData.services.length > 0 ? (
                                  partnerData.services.map((service: string) => (
                                      <Badge key={service} variant="secondary" className="p-2 text-sm">
                                          <BadgeCheck className="w-4 h-4 mr-1.5 text-green-600"/>
                                          {service}
                                      </Badge>
                                  ))
                              ) : (
                                  <p className="text-sm text-muted-foreground">No services have been configured for this facility yet.</p>
                              )}
                          </div>
                           <Button variant="outline" className="w-full mt-4" disabled>Edit My Services (Coming Soon)</Button>
                      </CardContent>
                  </Card>
               </div>
           </div>
      </div>
  );
}
