
'use server';
/**
 * @fileOverview This file contains server-side Cloud Functions for dispatching
 * ride, garage, and emergency requests, and a scheduled cleanup function for stale statuses.
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, GeoPoint, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const messaging = getMessaging();

// Define a type for our partner data to satisfy TypeScript
interface Partner {
    id: string;
    currentLocation?: GeoPoint;
    fcmToken?: string;
    location?: GeoPoint; // For hospitals
    [key: string]: any; // Allow other properties
}

// Calculate distance between two geopoints in km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
}

const handleRideDispatch = async (rideData: any, rideId: string) => {
    let partnersQuery = db.collection('partners')
        .where('isOnline', '==', true)
        .where('vehicleType', '==', rideData.vehicleType);

    if (rideData.rideType === 'Cabzi Pink') {
        partnersQuery = partnersQuery.where('isCabziPinkPartner', '==', true);
    }

    const partnersSnapshot = await partnersQuery.get();
    
    if (partnersSnapshot.empty) {
        console.log('No online partners found for the ride criteria.');
        await db.doc(`rides/${rideId}`).update({ status: 'no_drivers_available' });
        return;
    }

    const rideLocation = rideData.pickup.location as GeoPoint;
    const nearbyPartners = partnersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Partner))
        .filter(partner => {
            if (!partner.currentLocation) return false;
            const partnerLocation = partner.currentLocation as GeoPoint;
            const distance = getDistance(rideLocation.latitude, rideLocation.longitude, partnerLocation.latitude, partnerLocation.longitude);
            return distance < 10; // 10km radius
        });
    
    if (nearbyPartners.length === 0) {
        console.log('No partners found within the 10km radius for the ride.');
        await db.doc(`rides/${rideId}`).update({ status: 'no_drivers_available' });
        return;
    }

    const tokens = nearbyPartners.map(p => p.fcmToken).filter((t): t is string => !!t);
    if (tokens.length > 0) {
        const message = {
            data: { type: 'new_ride_request', rideId, ...rideData, pickupLocation: JSON.stringify(rideData.pickup.location), destinationLocation: JSON.stringify(rideData.destination.location), },
            tokens: tokens,
        };
        await messaging.sendEachForMulticast(message);
    }
}

const handleGarageRequestDispatch = async (requestData: any, requestId: string) => {
    const mechanicsQuery = db.collection('mechanics').where('isAvailable', '==', true);
    const mechanicsSnapshot = await mechanicsQuery.get();
    
    if (mechanicsSnapshot.empty) {
        console.log('No available ResQ partners found.');
        await db.doc(`garageRequests/${requestId}`).update({ status: 'no_mechanics_available' });
        return;
    }
    
    const driverLocation = requestData.location as GeoPoint;
    const nearbyMechanics = mechanicsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Partner))
        .filter(mechanic => {
            if (!mechanic.currentLocation) return false;
            const mechanicLocation = mechanic.currentLocation as GeoPoint;
            const distance = getDistance(driverLocation.latitude, driverLocation.longitude, mechanicLocation.latitude, mechanicLocation.longitude);
            return distance < 15; // 15km radius for mechanics
        });

    if (nearbyMechanics.length === 0) {
        console.log('No ResQ partners found within the 15km radius.');
        await db.doc(`garageRequests/${requestId}`).update({ status: 'no_mechanics_available' });
        return;
    }
    
    const tokens = nearbyMechanics.map(m => m.fcmToken).filter((t): t is string => !!t);
    if (tokens.length > 0) {
        const message = {
            data: { type: 'new_garage_request', requestId, ...requestData },
            tokens: tokens,
        };
        await messaging.sendEachForMulticast(message);
    }
}

const handleEmergencyDispatch = async (caseData: any, caseId: string) => {
    const hospitalsQuery = db.collection('ambulances').where('isOnline', '==', true);
    const hospitalsSnapshot = await hospitalsQuery.get();

    if (hospitalsSnapshot.empty) {
        console.log('No online hospitals found for emergency case.');
        await db.doc(`emergencyCases/${caseId}`).update({ status: 'no_partners_available' });
        return;
    }

    const patientLocation = caseData.location as GeoPoint;
    const rejectedBy = caseData.rejectedBy || [];

    const availableHospitals = hospitalsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Partner))
        .filter(hospital => !rejectedBy.includes(hospital.id))
        .map(hospital => {
            const hospitalLocation = hospital.location as GeoPoint;
            const distance = getDistance(patientLocation.latitude, patientLocation.longitude, hospitalLocation.latitude, hospitalLocation.longitude);
            return { ...hospital, distance };
        })
        .sort((a, b) => a.distance - b.distance);

    if (availableHospitals.length === 0) {
        console.log('No available hospitals found for the emergency case.');
        await db.doc(`emergencyCases/${caseId}`).update({ status: 'all_partners_busy' });
        return;
    }

    const targetHospital = availableHospitals[0];
    const hospitalFCMToken = targetHospital.fcmToken;

    if (hospitalFCMToken) {
        const message = {
            data: { type: 'new_emergency_request', caseId: caseId, ...caseData },
            token: hospitalFCMToken,
        };
        await messaging.send(message);
        console.log(`Emergency request ${caseId} dispatched to hospital ${targetHospital.id}.`);
    } else {
        console.log(`Hospital ${targetHospital.id} has no FCM token. Cascading to next...`);
        await db.doc(`emergencyCases/${caseId}`).update({ rejectedBy: FieldValue.arrayUnion(targetHospital.id) });
    }
}

// ============== Cloud Function Triggers ==============

export const dispatchRideRequest = onDocumentCreated('rides/{rideId}', async (event) => {
    const { rideId } = event.params;
    const snapshot = event.data;
    if (!snapshot) return;
    const data = snapshot.data();

    if (data.status === 'searching') {
        console.log(`Dispatching ride: ${rideId}`);
        await handleRideDispatch(data, rideId);
    }
});

export const dispatchGarageRequest = onDocumentCreated('garageRequests/{requestId}', async (event) => {
    const { requestId } = event.params;
    const snapshot = event.data;
    if (!snapshot) return;
    const data = snapshot.data();
    
    if(data.status === 'pending') {
        console.log(`Dispatching garage request: ${requestId}`);
        await handleGarageRequestDispatch(data, requestId);
    }
});

export const dispatchEmergencyCase = onDocumentCreated('emergencyCases/{caseId}', async (event) => {
    const { caseId } = event.params;
    const snapshot = event.data;
    if (!snapshot) return;
    const data = snapshot.data();

    if (data.status === 'pending') {
        console.log(`Dispatching emergency case: ${caseId}`);
        await handleEmergencyDispatch(data, caseId);
    }
});


export const emergencyCaseUpdater = onDocumentUpdated('emergencyCases/{caseId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const dataBefore = snapshot.before.data();
    const dataAfter = snapshot.after.data();

    // If a hospital rejects the case (by adding their ID to rejectedBy), re-run dispatch.
    if (dataAfter.status === 'pending' && dataAfter.rejectedBy?.length > dataBefore.rejectedBy?.length) {
        console.log(`Re-dispatching emergency case: ${event.params.caseId} due to rejection.`);
        await handleEmergencyDispatch(dataAfter, event.params.caseId);
    }
});


/**
 * A scheduled Cloud Function that runs every minute to clean up stale online statuses.
 * This is the definitive server-side solution to the "ghost user" problem.
 */
export const statusCleanup = onSchedule("every 1 minutes", async (event) => {
  console.log("Running scheduled status cleanup...");

  const now = Timestamp.now();
  const staleThreshold = new Timestamp(now.seconds - 120, now.nanoseconds); // 2 minutes ago

  const processStaleEntities = async (collectionName: string, statusField: string) => {
    const staleQuery = db.collection(collectionName)
      .where(statusField, '==', true)
      .where('lastSeen', '<', staleThreshold);
      
    const snapshot = await staleQuery.get();
    
    if (snapshot.empty) {
      console.log(`No stale entities found in ${collectionName}.`);
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      console.log(`Marking ${doc.id} in ${collectionName} as offline.`);
      batch.update(doc.ref, { [statusField]: false, currentLocation: null });
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} stale entities from ${collectionName}.`);
  };

  try {
    // Process all three types of active entities
    await processStaleEntities('users', 'isOnline');
    await processStaleEntities('partners', 'isOnline');
    await processStaleEntities('mechanics', 'isAvailable');
    await processStaleEntities('ambulances', 'isOnline');
  } catch (error) {
    console.error("Error during scheduled status cleanup:", error);
  }
});

export const triggerRide = handleRideDispatch;
