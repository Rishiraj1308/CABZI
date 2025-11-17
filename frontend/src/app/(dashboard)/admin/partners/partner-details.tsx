
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, DocumentData, collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { useDb } from '@/lib/firebase/client-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Car, Wrench, Ambulance, Stethoscope, Briefcase, GraduationCap, FileText, IndianRupee, Building, User, Phone, MapPin, BedDouble, Hospital, Calendar, Cake, Clock, VenetianMask } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInYears } from 'date-fns';
import type { RideData } from '@/lib/types';
import { DetailItem } from '@/components/shared/detail-item';


interface PartnerDetailsProps {
    partnerId: string;
    initialPartnerType: 'driver' | 'mechanic' | 'cure' | 'doctor' | 'clinic' | null;
    hospitalId?: string | null;
}

const getInitials = (name: string) => {
    if (!name) return 'P';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
}

export default function PartnerDetails({ partnerId, initialPartnerType, hospitalId }: PartnerDetailsProps) {
    const [partner, setPartner] = useState<DocumentData | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [rides, setRides] = useState<RideData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const db = useDb();

    useEffect(() => {
        const fetchPartnerData = async () => {
            if (!db || !partnerId || !initialPartnerType) {
                 setIsLoading(false);
                 return;
            }

            const getCollectionPath = () => {
                switch(initialPartnerType) {
                    case 'driver': return `pathPartners/${partnerId}`;
                    case 'mechanic': return `mechanics/${partnerId}`;
                    case 'cure': return `curePartners/${partnerId}`;
                    case 'clinic': return `curePartners/${partnerId}`; 
                    case 'doctor':
                        if (!hospitalId) {
                            console.error("Hospital ID is required for doctor details.");
                            return null;
                        }
                        return `curePartners/${hospitalId}/doctors/${partnerId}`;
                    default: return null;
                }
            }

            const docPath = getCollectionPath();
            if (!docPath) {
                setIsLoading(false);
                return;
            }

            try {
                const docRef = doc(db, docPath);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const partnerData = {
                        id: docSnap.id,
                        type: initialPartnerType,
                        ...docSnap.data()
                    };
                    setPartner(partnerData);

                    // Fetch transactions for drivers/mechanics
                    if (initialPartnerType === 'driver' || initialPartnerType === 'mechanic') {
                        const collectionName = initialPartnerType === 'driver' ? 'pathPartners' : 'mechanics';
                        const transQuery = query(collection(db, `${collectionName}/${partnerId}/transactions`), orderBy('date', 'desc'));
                        const transSnap = await getDocs(transQuery);
                        setTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                    }

                    // Fetch rides for drivers
                    if (initialPartnerType === 'driver') {
                        const ridesQuery = query(collection(db, 'rides'), where('driverId', '==', partnerData.id), orderBy('createdAt', 'desc'));
                        const ridesSnap = await getDocs(ridesQuery);
                        setRides(ridesSnap.docs.map(d => ({ id: d.id, ...d.data() } as RideData)));
                    }

                } else {
                    setPartner(null);
                }
            } catch (error) {
                console.error("Error fetching partner details:", error);
            } finally {
                 setIsLoading(false);
            }
        };

        fetchPartnerData();
    }, [partnerId, initialPartnerType, hospitalId, db]);

    if (isLoading) {
        return (
            <div className="space-y-6 p-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
                 <Skeleton className="h-32 w-full" />
            </div>
        )
    }

    if (!partner) {
         return (
            <div className="text-center p-4">
                <h2 className="text-xl font-bold">Partner Not Found</h2>
                <p className="text-muted-foreground">The partner with ID '{partnerId}' could not be found.</p>
            </div>
        )
    }
    
    const getPartnerIcon = () => {
        switch(partner.type) {
            case 'driver': return <Car className="w-4 h-4 mr-2"/>;
            case 'mechanic': return <Wrench className="w-4 h-4 mr-2"/>;
            case 'cure': 
                return partner.businessType === 'Clinic' 
                    ? <Building className="w-4 h-4 mr-2" /> 
                    : <Ambulance className="w-4 h-4 mr-2" />;
            case 'doctor': return <Stethoscope className="w-4 h-4 mr-2"/>;
            default: return null;
        }
    }

    const getPartnerTypeLabel = () => {
        if (partner.type === 'cure') {
            return partner.businessType || 'Cure Partner';
        }
        return partner.type;
    };
    
    const calculateAge = (dob: string | undefined): string => {
        if (!dob) return 'N/A';
        try {
            return differenceInYears(new Date(), new Date(dob)).toString();
        } catch {
            return 'N/A';
        }
    };
    
    const getStatusBadge = (status: string) => {
        switch (status) {
          case 'completed':
            return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Completed</Badge>
          case 'cancelled_by_driver':
          case 'cancelled_by_rider':
            return <Badge variant="destructive">Cancelled</Badge>
          case 'searching':
            return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">Searching</Badge>
          default:
            return <Badge variant="secondary" className="capitalize">{status.replace(/_/g, ' ')}</Badge>
        }
      }
    
    const renderDriverDetails = () => (
        <Card>
            <CardHeader><CardTitle>Vehicle &amp; License</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Vehicle Type</p><p className="font-semibold text-sm">{partner.vehicleType || 'N/A'}</p></div>
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Vehicle Brand</p><p className="font-semibold text-sm">{partner.vehicleBrand || 'N/A'}</p></div>
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Vehicle Model</p><p className="font-semibold text-sm">{partner.vehicleName || 'N/A'}</p></div>
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Vehicle Number</p><p className="font-semibold text-sm">{partner.vehicleNumber || 'N/A'}</p></div>
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Driving Licence</p><p className="font-semibold text-sm">{partner.drivingLicence || 'N/A'}</p></div>
            </CardContent>
        </Card>
    );
    
    const renderCureDetails = () => (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {partner.businessType === 'Clinic' ? <Building className="w-5 h-5 text-primary"/> : <Hospital className="w-5 h-5 text-primary"/>}
                        Facility Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Official Name</p><p className="font-semibold text-sm">{partner.name || 'N/A'}</p></div>
                        <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Owner/Contact Name</p><p className="font-semibold text-sm">{partner.ownerName || 'N/A'}</p></div>
                        <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Contact Email</p><p className="font-semibold text-sm">{partner.ownerEmail || 'N/A'}</p></div>
                        <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Facility Type</p><p className="font-semibold text-sm">{partner.businessType === 'Clinic' ? partner.clinicType : partner.hospitalType || 'N/A'}</p></div>
                        <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Registration No.</p><p className="font-semibold text-sm">{partner.registrationNumber || 'N/A'}</p></div>
                        
                        {partner.businessType === 'Clinic' && (
                            <>
                                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Lead Doctor</p><p className="font-semibold text-sm">{partner.doctorName || 'N/A'}</p></div>
                                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Medical Reg. No.</p><p className="font-semibold text-sm">{partner.doctorRegNo || 'N/A'}</p></div>
                            </>
                        )}
                        
                        {partner.businessType === 'Hospital' && (
                            <>
                                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Total Beds</p><p className="font-semibold text-sm">{partner.totalBeds || 'N/A'}</p></div>
                                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Beds Occupied</p><p className="font-semibold text-sm">{partner.bedsOccupied || 'N/A'}</p></div>
                            </>
                        )}
                    </div>
                     <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="font-semibold text-sm flex items-start gap-2 pt-1"><MapPin className="w-4 h-4 mt-0.5 shrink-0"/>{partner.address || 'N/A'}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Services &amp; Departments</CardTitle>
                </CardHeader>
                <CardContent>
                     {partner.services && partner.services.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {partner.services.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No services listed for this facility.</p>
                    )}
                    {partner.businessType === 'Hospital' && (
                        <div className="mt-4">
                            <h4 className="font-semibold mb-2">Ambulance Fleet</h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 rounded-md bg-muted"><p className="text-xs">BLS</p><p className="font-bold text-lg">{partner.blsAmbulances || 0}</p></div>
                                <div className="p-2 rounded-md bg-muted"><p className="text-xs">ALS</p><p className="font-bold text-lg">{partner.alsAmbulances || 0}</p></div>
                                <div className="p-2 rounded-md bg-muted"><p className="text-xs">Cardiac</p><p className="font-bold text-lg">{partner.cardiacAmbulances || 0}</p></div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );

    const renderMechanicDetails = () => (
        <Card>
            <CardHeader><CardTitle>Service Details</CardTitle></CardHeader>
            <CardContent>
                {partner.services && partner.services.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {partner.services.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No services listed.</p>
                )}
            </CardContent>
        </Card>
    );
    
    const renderDoctorAvailability = () => {
      if (!partner.weeklyAvailability) return null;
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const sortedOverrides = partner.dateOverrides ? Object.entries(partner.dateOverrides).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()) : [];

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary"/> Availability Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Weekly Recurring Schedule</h4>
              <div className="grid grid-cols-1 divide-y border rounded-lg">
                {daysOfWeek.map(day => {
                  const availability = partner.weeklyAvailability[day];
                  return (
                    <div key={day} className="flex items-center justify-between p-3">
                      <span className="font-medium w-24">{day}</span>
                      {availability?.available ? (
                        <span className="font-mono text-sm text-green-600">{availability.start} - {availability.end}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unavailable</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {sortedOverrides.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Date Overrides / Holidays</h4>
                <div className="grid grid-cols-2 gap-2">
                    {sortedOverrides.map(([date, override]: [string, any]) => (
                        <div key={date} className="p-2 bg-muted rounded-md text-center">
                            <p className="font-semibold text-sm">{format(new Date(date), 'PPP')}</p>
                             <Badge variant={override.available ? 'default' : 'destructive'} className="mt-1">
                                {override.available ? 'Available' : 'Unavailable'}
                             </Badge>
                        </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    const renderDoctorDetails = () => (
        <>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary"/> Personal Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Full Name</p><p className="font-semibold text-sm">{partner.name || 'N/A'}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Gender</p><p className="font-semibold text-sm">{partner.gender || 'N/A'}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Date of Birth</p><p className="font-semibold text-sm">{partner.dob || 'N/A'}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Contact Number</p><p className="font-semibold text-sm">{partner.phone || 'N/A'}</p></div>
                    <div className="md:col-span-2 p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Email Address</p><p className="font-semibold text-sm">{partner.email || 'N/A'}</p></div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary"/> Professional Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Specialization</p><p className="font-semibold text-sm">{partner.specialization || 'N/A'}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Department</p><p className="font-semibold text-sm">{partner.department || 'N/A'}</p></div>
                    <div className="md:col-span-2 p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Qualifications</p><p className="font-semibold text-sm">{partner.qualifications || 'N/A'}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Experience</p><p className="font-semibold text-sm">{`${partner.experience || 'N/A'} years`}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Designation</p><p className="font-semibold text-sm">{partner.designation || 'N/A'}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Consultation Fee</p><p className="font-semibold text-sm">{`₹${partner.consultationFee?.toLocaleString() || 'N/A'}`}</p></div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> Medical Council Verification</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Medical Registration No.</p><p className="font-semibold text-sm">{partner.medicalRegNo || 'N/A'}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Registration Council</p><p className="font-semibold text-sm">{partner.regCouncil || 'N/A'}</p></div>
                    <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Registration Year</p><p className="font-semibold text-sm">{partner.regYear || 'N/A'}</p></div>
                </CardContent>
            </Card>
            {renderDoctorAvailability()}
        </>
    );

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        <Avatar className="w-16 h-16 border">
                            <AvatarImage src={partner.photoUrl || undefined} alt={partner.name} data-ai-hint="partner portrait" />
                            <AvatarFallback>{getInitials(partner.name).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl">{partner.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-3">
                                        <span className="flex items-center gap-2"><Phone className="w-3 h-3"/>{partner.phone}</span>
                                        {partner.email && <span className="hidden sm:inline">• {partner.email}</span>}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="capitalize">
                                        {getPartnerIcon()}
                                        {getPartnerTypeLabel()}
                                    </Badge>
                                </div>
                            </div>
                             {partner.type === 'doctor' && partner.hospitalName && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                    <Building className="w-4 h-4" />
                                    <span>{partner.hospitalName}</span>
                                </div>
                            )}
                             <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <VenetianMask className="w-4 h-4"/>
                                    <span className="font-semibold capitalize">{partner.gender || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Cake className="w-4 h-4"/>
                                    <span>{calculateAge(partner.dob)} years old</span>
                                </div>
                             </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                   {partner.type === 'doctor' ? renderDoctorDetails() 
                    : partner.type === 'cure' ? renderCureDetails() 
                    : partner.type === 'driver' ? renderDriverDetails() 
                    : partner.type === 'mechanic' ? renderMechanicDetails() 
                    : null
                   }
                </CardContent>
            </Card>

           {partner.type === 'driver' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Ride Ledger</CardTitle>
                        <CardDescription>All rides assigned to this partner.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Trip Details</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Fare</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {rides.length > 0 ? (
                                    rides.map(ride => (
                                        <TableRow key={ride.id}>
                                            <TableCell>{ride.createdAt ? format(ride.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-xs">From: {ride.pickup?.address || '...'}</div>
                                                <div className="text-xs">To: {ride.destination?.address || '...'}</div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(ride.status)}</TableCell>
                                            <TableCell className="text-right font-medium">₹{ride.fare?.toFixed(2) || '0.00'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            This partner has not completed any rides yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
           )}

           {(partner.type === 'driver' || partner.type === 'mechanic') && (
                <Card>
                    <CardHeader>
                        <CardTitle>Wallet Transactions</CardTitle>
                        <CardDescription>All transactions related to this partner&apos;s wallet.</CardDescription>
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
                                    transactions.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{tx.date.toDate().toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium">{tx.type}</TableCell>
                                            <TableCell className={`text-right font-medium ${tx.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                            {tx.amount > 0 ? '+' : ''}₹{tx.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            No transactions found for this partner.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
           )}
        </div>
    );
}
