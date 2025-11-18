
'use client'

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ambulance, IndianRupee, Save, BadgeCheck } from 'lucide-react';
import { useDb } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCurePartner } from '../layout';
import { DetailItem } from '@/components/shared/detail-item';
import { Phone } from 'lucide-react';

export default function CureProfilePage() {
    const { partnerData, isLoading } = useCurePartner();
    const db = useDb();

    // Fare management state
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
          <div className="grid gap-6">
              <h2 className="text-3xl font-bold tracking-tight">Cure Partner Profile</h2>
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-40 w-full" />
          </div>
      )
    }

    if (!partnerData) {
        return <p>Could not load your profile.</p>
    }

  return (
      <div className="grid gap-6">
          <h2 className="text-3xl font-bold tracking-tight">Cure Partner Profile</h2>
           <Card className="shadow-lg overflow-hidden">
              <CardHeader>
                  <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                          <AvatarImage src="https://placehold.co/100x100.png" alt={partnerData?.name} data-ai-hint="hospital building" />
                          <AvatarFallback>{getInitials(partnerData?.name).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                          <CardTitle className="text-2xl font-bold">{partnerData?.name}</CardTitle>
                          <CardDescription>Your verified business information.</CardDescription>
                      </div>
                  </div>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                      <DetailItem icon={Phone} label="Contact Phone Number" value={partnerData?.phone} />
                      <DetailItem icon={BadgeCheck} label="Govt. Registration No." value={partnerData?.registrationNumber} />
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
                          partnerData.services.map(service => (
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
  );
}

