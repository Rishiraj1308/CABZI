
"use strict";
'use server';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateHighDemand = exports.onNewCurePartner = exports.onNewResQPartner = exports.onNewPathPartner = exports.emergencyCaseTimeout = exports.statusCleanup = exports.emergencyCaseUpdater = exports.dispatchEmergencyCase = exports.dispatchGarageRequest = exports.dispatchRideRequest = void 0;
/**
 * @fileOverview This file contains server-side Cloud Functions for dispatching
 * ride, garage, and emergency requests, and a scheduled cleanup function for stale statuses.
 */
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_2 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Initialize Firebase Admin SDK if not already initialized
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_2.getFirestore)();
const messaging = (0, messaging_1.getMessaging)();
// Calculate distance between two geopoints in km
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}
const handleRideDispatch = async (rideData, rideId) => {
    let partnersQuery = db.collection('partners')
        .where('isOnline', '==', true)
        .where('status', '==', 'online') // Ensure partner is not on a trip
        .where('vehicleType', '==', rideData.rideType);
    // If ride type is "Cabzi Pink", filter for women partners who have opted in.
    if (rideData.rideType === 'Cabzi Pink') {
        partnersQuery = partnersQuery.where('isCabziPinkPartner', '==', true)
            .where('gender', '==', 'female');
    }
    const partnersSnapshot = await partnersQuery.get();
    if (partnersSnapshot.empty) {
        console.log('No online partners found for the ride criteria.');
        await db.doc(`rides/${rideId}`).update({ status: 'no_drivers_available' });
        return;
    }
    const rideLocation = rideData.pickup.location;
    const nearbyPartners = partnersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(partner => {
        if (!partner.currentLocation)
            return false;
        const partnerLocation = partner.currentLocation;
        const distance = getDistance(rideLocation.latitude, rideLocation.longitude, partnerLocation.latitude, partnerLocation.longitude);
        return distance < 10; // 10km radius
    });
    if (nearbyPartners.length === 0) {
        console.log('No partners found within the 10km radius for the ride.');
        await db.doc(`rides/${rideId}`).update({ status: 'no_drivers_available' });
        return;
    }
    const tokens = nearbyPartners.map(p => p.fcmToken).filter((t) => !!t);
    if (tokens.length > 0) {
        // Create a serializable payload by converting complex objects to strings/numbers.
        const payloadData = {
            type: 'new_ride_request',
            rideId: rideId,
            pickupAddress: rideData.pickup.address,
            destinationAddress: rideData.destination.address,
            pickupLocation: JSON.stringify(rideData.pickup.location),
            destinationLocation: JSON.stringify(rideData.destination.location),
            createdAt: rideData.createdAt.toMillis().toString(),
            fare: String(rideData.fare),
            rideType: rideData.rideType,
            status: rideData.status,
            riderName: rideData.riderName,
            riderId: rideData.riderId,
            riderGender: rideData.riderGender,
            otp: rideData.otp,
        };
        const message = {
            data: payloadData,
            tokens: tokens,
        };
        await messaging.sendEachForMulticast(message);
        console.log(`Ride request ${rideId} sent to ${tokens.length} partners.`);
    }
    else {
        console.log('No partners with FCM tokens found for this ride request.');
    }
};
const handleGarageRequestDispatch = async (requestData, requestId) => {
    const mechanicsQuery = db.collection('mechanics').where('isAvailable', '==', true);
    const mechanicsSnapshot = await mechanicsQuery.get();
    if (mechanicsSnapshot.empty) {
        console.log('No available ResQ partners found.');
        await db.doc(`garageRequests/${requestId}`).update({ status: 'no_mechanics_available' });
        return;
    }
    const driverLocation = requestData.location;
    const nearbyMechanics = mechanicsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(mechanic => {
        if (!mechanic.currentLocation)
            return false;
        const mechanicLocation = mechanic.currentLocation;
        const distance = getDistance(driverLocation.latitude, driverLocation.longitude, mechanicLocation.latitude, mechanicLocation.longitude);
        return distance < 15; // 15km radius for mechanics
    });
    if (nearbyMechanics.length === 0) {
        console.log('No ResQ partners found within the 15km radius.');
        await db.doc(`garageRequests/${requestId}`).update({ status: 'no_mechanics_available' });
        return;
    }
    const tokens = nearbyMechanics.map(m => m.fcmToken).filter((t) => !!t);
    if (tokens.length > 0) {
        const message = {
            data: { type: 'new_garage_request', requestId, ...requestData },
            tokens: tokens,
        };
        await messaging.sendEachForMulticast(message);
    }
};
const handleEmergencyDispatch = async (caseData, caseId) => {
    const hospitalsQuery = db.collection('ambulances').where('isOnline', '==', true);
    const hospitalsSnapshot = await hospitalsQuery.get();
    if (hospitalsSnapshot.empty) {
        console.log('No online hospitals found for emergency case.');
        await db.doc(`emergencyCases/${caseId}`).update({ status: 'no_partners_available' });
        return;
    }
    const patientLocation = caseData.location;
    const rejectedBy = caseData.rejectedBy || [];
    const availableHospitals = hospitalsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(hospital => !rejectedBy.includes(hospital.id))
        .map(hospital => {
        const hospitalLocation = hospital.location;
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
    }
    else {
        console.log(`Hospital ${targetHospital.id} has no FCM token. Cascading to next...`);
        await db.doc(`emergencyCases/${caseId}`).update({ rejectedBy: (0, firestore_2.arrayUnion)(targetHospital.id) });
    }
};
// ============== Cloud Function Triggers ==============
exports.dispatchRideRequest = (0, firestore_1.onDocumentCreated)('rides/{rideId}', async (event) => {
    const { rideId } = event.params;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    if (data.status === 'searching') {
        console.log(`Dispatching ride: ${rideId}`);
        await handleRideDispatch(data, rideId);
    }
});
exports.dispatchGarageRequest = (0, firestore_1.onDocumentCreated)('garageRequests/{requestId}', async (event) => {
    const { requestId } = event.params;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    if (data.status === 'pending') {
        console.log(`Dispatching garage request: ${requestId}`);
        await handleGarageRequestDispatch(data, requestId);
    }
});
exports.dispatchEmergencyCase = (0, firestore_1.onDocumentCreated)('emergencyCases/{caseId}', async (event) => {
    const { caseId } = event.params;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    if (data.status === 'pending') {
        console.log(`Dispatching emergency case: ${caseId}`);
        await handleEmergencyDispatch(data, caseId);
    }
});
exports.emergencyCaseUpdater = (0, firestore_1.onDocumentUpdated)('emergencyCases/{caseId}', async (event) => {
    var _a, _b;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const dataBefore = snapshot.before.data();
    const dataAfter = snapshot.after.data();
    // If a hospital rejects the case (by adding their ID to rejectedBy), re-run dispatch.
    if (dataAfter.status === 'pending' && ((_a = dataAfter.rejectedBy) === null || _a === void 0 ? void 0 : _a.length) > ((_b = dataBefore.rejectedBy) === null || _b === void 0 ? void 0 : _b.length)) {
        console.log(`Re-dispatching emergency case: ${event.params.caseId} due to rejection.`);
        await handleEmergencyDispatch(dataAfter, event.params.caseId);
    }
});
/**
 * A scheduled Cloud Function that runs every minute to clean up stale online statuses.
 * This is the definitive server-side solution to the "ghost user" problem.
 */
exports.statusCleanup = (0, scheduler_1.onSchedule)("every 1 minutes", async (event) => {
    console.log("Running scheduled status cleanup...");
    const now = firestore_2.Timestamp.now();
    const staleThreshold = new firestore_2.Timestamp(now.seconds - 120, now.nanoseconds); // 2 minutes ago
    const processStaleEntities = async (collectionName, statusField) => {
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
    }
    catch (error) {
        console.error("Error during scheduled status cleanup:", error);
    }
});
// New scheduled function to handle timeouts for emergency cases
exports.emergencyCaseTimeout = (0, scheduler_1.onSchedule)("every 1 minutes", async (event) => {
    console.log("Running scheduled emergency case timeout check...");
    const now = firestore_2.Timestamp.now();
    // A case is considered timed out if it's pending for more than 2 minutes
    const timeoutThreshold = new firestore_2.Timestamp(now.seconds - 120, now.nanoseconds);
    const pendingCasesQuery = db.collection('emergencyCases')
        .where('status', '==', 'pending')
        .where('createdAt', '<', timeoutThreshold);
    const snapshot = await pendingCasesQuery.get();
    if (snapshot.empty) {
        console.log("No timed-out emergency cases found.");
        return;
    }
    for (const doc of snapshot.docs) {
        const caseData = doc.data();
        const caseId = doc.id;
        const dispatchedHospitals = await db.collection('ambulances')
            .where('fcmToken', '!=', null) // Crude way to check who it could have been sent to
            .get();
        // This is a simplified logic. A more robust system would log which hospital the request was sent to.
        // For now, we assume it was sent to the first available one that hasn't rejected it.
        const allHospitals = (await db.collection('ambulances').get()).docs.map(d => d.id);
        const rejectedBy = caseData.rejectedBy || [];
        const potentialTargets = allHospitals.filter(id => !rejectedBy.includes(id));
        if (potentialTargets.length > 0) {
            const timedOutHospitalId = potentialTargets[0];
            console.log(`Case ${caseId} timed out for hospital ${timedOutHospitalId}. Cascading...`);
            // Mark the hospital as having rejected (timed out) and trigger the update function
            await db.doc(`emergencyCases/${caseId}`).update({
                rejectedBy: (0, firestore_2.arrayUnion)(timedOutHospitalId)
            });
        }
    }
});
// ============== AUTOMATION TRIGGERS ==============
const callAutomationWebhook = async (payload, partnerType) => {
    const webhookUrl = process.env.AUTOMATION_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log(`AUTOMATION_WEBHOOK_URL not set. Skipping alert for new ${partnerType}. Payload:`, payload);
        return;
    }
    try {
        const response = await (0, node_fetch_1.default)(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: `new_${partnerType}_partner`,
                data: payload
            }),
        });
        if (response.ok) {
            console.log(`Sent new ${partnerType} partner alert to webhook for ${payload.name}`);
        }
        else {
            console.error(`Webhook failed with status: ${response.status}`);
        }
    }
    catch (error) {
        console.error('Error calling automation webhook:', error);
    }
};
// Trigger for new Path Partners (Drivers)
exports.onNewPathPartner = (0, firestore_1.onDocumentCreated)('partners/{partnerId}', (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (data) {
        callAutomationWebhook({ id: event.params.partnerId, ...data }, 'path');
    }
});
// Trigger for new ResQ Partners (Mechanics)
exports.onNewResQPartner = (0, firestore_1.onDocumentCreated)('mechanics/{mechanicId}', (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (data) {
        callAutomationWebhook({ id: event.params.mechanicId, ...data }, 'resq');
    }
});
// Trigger for new Cure Partners (Hospitals)
exports.onNewCurePartner = (0, firestore_1.onDocumentCreated)('ambulances/{ambulanceId}', (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (data) {
        callAutomationWebhook({ id: event.params.ambulanceId, ...data }, 'cure');
    }
});
// This is a simple, callable function for the admin panel to use.
exports.simulateHighDemand = (0, https_1.onCall)(async (request) => {
    const zoneName = request.data.zoneName;
    if (!zoneName) {
        throw new https_1.HttpsError('invalid-argument', 'The function must be called with one argument "zoneName".');
    }
    console.log(`High demand simulated in: ${zoneName}.`);
    const alertPayload = {
        event: 'high_demand_alert',
        data: {
            zone: zoneName,
            incentive: 50, // Example incentive
            timestamp: new Date().toISOString()
        }
    };
    const webhookUrl = process.env.AUTOMATION_WEBHOOK_URL;
    if (webhookUrl) {
        try {
            await (0, node_fetch_1.default)(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alertPayload),
            });
        }
        catch (error) {
            console.error('Error sending high demand alert to webhook:', error);
        }
    }
    return { success: true, message: `High demand alert triggered for ${zoneName}.` };
});
//# sourceMappingURL=index.js.map
