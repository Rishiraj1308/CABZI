
import type { Timestamp, GeoPoint } from 'firebase/firestore';

export interface ClientSession {
    userId: string;
    name: string;
    phone: string;
    gender: 'male' | 'female' | 'other';
    photoURL?: string;
    role?: string;
    adminRole?: string;
    partnerId?: string;
    id?: string;
    hospitalId?: string;
}

export interface RideData {
  id: string;
  status: 'searching' | 'accepted' | 'in-progress' | 'arrived' | 'payment_pending' | 'completed' | 'cancelled_by_rider' | 'cancelled_by_driver' | 'no_drivers_available';
  pickup?: { address: string; location: GeoPoint };
  destination?: { address: string; location: GeoPoint };
  riderId: string;
  riderName?: string;
  riderGender?: string;
  driverId?: string;
  driverDetails?: { 
    name: string; 
    vehicle: string; 
    rating: number; 
    photoUrl: string; 
    phone: string;
    location: GeoPoint;
  };
  vehicleNumber?: string;
  rideType?: string;
  otp?: string;
  fare?: number;
  driverEta?: number;
  driverDistance?: number;
  createdAt: Timestamp;
}

export interface AmbulanceCase {
    id: string;
    caseId: string;
    riderId: string;
    riderName: string;
    phone: string;
    severity?: 'Non-Critical' | 'Serious' | 'Critical';
    location: GeoPoint;
    assignedPartner?: {
        id: string;
        name: string;
        phone?: string;
    };
    assignedAmbulanceId?: string;
    assignedAmbulanceName?: string;
    partnerEta?: number;
    hospitalEta?: number;
    status: 'pending' | 'accepted' | 'onTheWay' | 'inTransit' | 'completed' | 'cancelled_by_rider' | 'cancelled_by_partner';
    createdAt: Timestamp;
}

export interface GarageRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  issue: string;
  location: GeoPoint;
  locationAddress?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'bill_sent' | 'completed' | 'cancelled_by_user' | 'cancelled_by_mechanic';
  otp: string;
  mechanicId?: string;
  mechanicName?: string;
  mechanicPhone?: string;
  eta?: number;
  distance?: number;
  billItems?: { description: string; amount: number }[];
  totalAmount?: number;
  createdAt: Timestamp;
}

export interface Appointment {
    id: string;
    patientId: string;
    doctorName?: string;
    hospitalName?: string;
    appointmentDate: Timestamp;
    status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
    createdAt: Timestamp;
}
