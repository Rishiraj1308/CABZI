
import { GeoPoint } from 'firebase-admin/firestore';

export interface Partner {
    id: string;
    location?: GeoPoint;
    fcmToken?: string;
    distance?: number;
    [key: string]: any;
}

export interface EmergencyCase {
    id: string;
    location: GeoPoint;
    status: string;
    rejectedBy?: string[];
    createdAt: any;
}
