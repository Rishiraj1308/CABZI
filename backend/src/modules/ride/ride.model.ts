
import { GeoPoint } from 'firebase-admin/firestore';

export interface Partner {
    id: string;
    currentLocation?: GeoPoint;
    fcmToken?: string;
    distanceToRider?: number;
    [key: string]: any;
}

export interface Ride {
    id: string;
    pickup: {
        location: GeoPoint;
        address: string;
    };
    destination: {
        location: GeoPoint;
        address: string;
    };
    rideType: string;
    status: string;
    rejectedBy?: string[];
    createdAt: any;
    fare: number;
}
