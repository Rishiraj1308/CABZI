
import type { GeoPoint } from 'firebase/firestore';

export interface RideData {
    id: string;
    pickup: { address: string; location: { latitude: number; longitude: number; } };
    destination: { address: string; location: { latitude: number; longitude: number; } };
    status: "searching" | "accepted" | "in-progress" | "completed" | "cancelled_by_driver" | "cancelled_by_rider" | "payment_pending";
    otp?: string;
    driverDetails?: { name: string; vehicle: string; rating: number; photoUrl: string; phone: string; };
    driverEta?: number | null;
    fare?: number;
}

export interface AmbulanceCase {
    id: string;
    caseId: string;
    riderId: string;
    riderName: string;
    phone: string;
    location: GeoPoint;
    status: 'pending' | 'accepted' | 'onTheWay' | 'arrived' | 'inTransit' | 'completed' | 'cancelled_by_rider' | 'cancelled_by_partner';
    otp?: string;
    assignedPartner?: { id: string; name: string; phone: string; ambulanceName?: string; photoUrl?: string; } | null;
    partnerEta?: number | null;
    partnerLocation?: GeoPoint | null;
    hospitalEta?: number | null;
    severity?: 'Non-Critical' | 'Serious' | 'Critical';
}

export interface GarageRequest {
    id: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled_by_driver' | 'cancelled_by_mechanic';
    mechanicName?: string;
    mechanicPhone?: string;
    eta?: number;
    partnerLocation?: GeoPoint | null;
}
