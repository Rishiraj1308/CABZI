
import { GeoPoint } from 'firebase-admin/firestore';

export interface Partner {
    id: string;
    currentLocation?: GeoPoint;
    fcmToken?: string;
    distanceToUser?: number;
    [key: string]: any;
}

export interface GarageRequest {
    id: string;
    location: GeoPoint;
    locationAddress?: string;
    status: string;
    rejectedBy?: string[];
    createdAt: any;
}
