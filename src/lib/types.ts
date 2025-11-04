// lib/types.ts
export interface JobRequest {
  id: string;

  userId: string;
  userName: string;
  userPhone: string;

  issue: string;
  otp: string;

  // Firestore GeoPoint—support both SDK shapes
  location: {
    latitude?: number;
    longitude?: number;
    _lat?: number;
    _long?: number;
  };

  // For the mechanic popup
  locationAddress?: string;   // set by backend
  distance?: number;          // in km (set by backend)
  eta?: number;               // in minutes (set by backend)

  status:
    | 'pending'
    | 'accepted'
    | 'in_progress'
    | 'billing'
    | 'payment'
    | 'completed'
    | 'cancelled_by_user'
    | 'cancelled_by_driver'
    | 'cancelled_by_mechanic'
    | 'no_mechanics_available';

  createdAt: any;
}
