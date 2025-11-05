
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, DocumentData, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useDb } from '@/firebase/client-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Car, Wrench, Ambulance, Stethoscope, Briefcase, GraduationCap, FileText, IndianRupee, Building, User, Phone, MapPin, BedDouble, Hospital } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

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
                    case 'driver': return `partners/${partnerId}`;
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
                    setPartner({
                        id: docSnap.id,
                        type: initialPartnerType,
                        ...docSnap.data()
                    });

                    if (initialPartnerType === 'driver' || initialPartnerType === 'mechanic') {
                        const collectionName = initialPartnerType === 'driver' ? 'partners' : 'mechanics';
                        const transQuery = query(collection(db, `${collectionName}/${partnerId}/transactions`), orderBy('date', 'desc'));
                        const transSnap = await getDocs(transQuery);
                        setTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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

    const DetailItem = ({ label, value }: { label: string, value: string | undefined | null }) => (
        <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold text-sm">{value || 'N/A'}</p>
        </div>
    );
    
    const renderDriverDetails = () => (
        <Card>
            <CardHeader><CardTitle>Vehicle &amp; License</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailItem label="Vehicle Type" value={partner.vehicleType} />
                <DetailItem label="Vehicle Brand" value={partner.vehicleBrand} />
                <DetailItem label="Vehicle Model" value={partner.vehicleName} />
                <DetailItem label="Vehicle Number" value={partner.vehicleNumber} />
                <DetailItem label="Driving Licence" value={partner.drivingLicence} />
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
                        <DetailItem label="Official Name" value={partner.name} />
                        <DetailItem label="Owner/Contact Name" value={partner.ownerName} />
                        <DetailItem label="Contact Email" value={partner.ownerEmail} />
                        <DetailItem label="Facility Type" value={partner.businessType === 'Clinic' ? partner.clinicType : partner.hospitalType} />
                        <DetailItem label="Registration No." value={partner.registrationNumber} />
                        
                        {partner.businessType === 'Clinic' && (
                            <>
                                <DetailItem label="Lead Doctor" value={partner.doctorName} />
                                <DetailItem label="Medical Reg. No." value={partner.doctorRegNo} />
                            </>
                        )}
                        
                        {partner.businessType === 'Hospital' && (
                            <>
                                <DetailItem label="Total Beds" value={partner.totalBeds} />
                                <DetailItem label="Beds Occupied" value={partner.bedsOccupied} />
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

    const renderDoctorDetails = () => (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary"/> Professional Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <DetailItem label="Specialization" value={partner.specialization} />
                    <DetailItem label="Department" value={partner.department} />
                    <div className="md:col-span-2"><DetailItem label="Qualifications" value={partner.qualifications} /></div>
                    <DetailItem label="Experience" value={`${partner.experience || 'N/A'} years`} />
                    <DetailItem label="Consultation Fee" value={`₹${partner.consultationFee?.toLocaleString() || 'N/A'}`} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> Documents & Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <DetailItem label="Medical Registration No." value={partner.medicalRegNo} />
                    <DetailItem label="Registration Council" value={partner.regCouncil} />
                    <DetailItem label="Registration Year" value={partner.regYear} />
                </CardContent>
            </Card>
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
                                    <CardDescription>
                                        <span className="flex items-center gap-2"><User className="w-3 h-3"/>{partner.ownerName || partner.name}</span>
                                        <span className="flex items-center gap-2"><Phone className="w-3 h-3"/>{partner.phone}</span>
                                        {partner.email && `• ${partner.email}`}
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

           {partner.type !== 'cure' && partner.type !== 'doctor' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Financial Ledger</CardTitle>
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

    