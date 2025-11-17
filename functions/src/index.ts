
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
import { HttpsError, onCall } from "firebase-functions/v2/https";
import fetch from 'node-fetch';

// ✅ Initialize Firebase Admin
if (!getApps().length) initializeApp();

const db = getFirestore();
const messaging = getMessaging();

interface Partner {
  id: string;
  currentLocation?: GeoPoint;
  fcmToken?: string;
  [key: string]: any; // Allow other properties
}

/* --------------------------------------------------
   ✅ Utility: Distance (Haversine)
-------------------------------------------------- */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* --------------------------------------------------
   ✅ Reverse Geocoding
-------------------------------------------------- */
async function getAddressFromCoords(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data: any = await response.json();
    return data.display_name || 'Unknown Location';
  } catch (e) {
    console.error("Reverse geocode error:", e);
    return "Location address not available";
  }
}

/* --------------------------------------------------
   ✅ RIDE DISPATCH - REWRITTEN FOR RELIABILITY
-------------------------------------------------- */
const handleRideDispatch = async (rideData: any, rideId: string) => {
    const rideRef = db.doc(`rides/${rideId}`);

    // Use a transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
        const rideDoc = await transaction.get(rideRef);
        if (!rideDoc.exists || rideDoc.data()?.status !== 'searching') {
            return; // Ride already handled or cancelled
        }

        let partnersQuery = db.collection("partners")
            .where("isOnline", "==", true)
            .where("status", "==", "online");
        
        if (rideData.rideType === "Curocity Pink") {
            partnersQuery = partnersQuery.where("isCabziPinkPartner", "==", true).where("gender", "==", "female");
        }
        
        const partnersSnapshot = await transaction.get(partnersQuery);

        if (partnersSnapshot.empty) {
            transaction.update(rideRef, { status: "no_drivers_available" });
            return;
        }

        const rideLoc = rideData.pickup?.location as GeoPoint;
        const rejectedBy = rideData.rejectedBy || [];
        const rideTypeBase = rideData.rideType?.split(" ")[0]?.trim() ?? "";

        const nearbyPartners = partnersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Partner))
            .filter(p => {
                if (!p.currentLocation || !p.vehicleType?.startsWith(rideTypeBase) || rejectedBy.includes(p.id)) return false;
                p.distanceToRider = getDistance(rideLoc.latitude, rideLoc.longitude, p.currentLocation.latitude, p.currentLocation.longitude);
                return (p.distanceToRider ?? 11) < 10;
            })
            .sort((a,b) => a.distanceToRider! - b.distanceToRider!);

        if (nearbyPartners.length === 0) {
            transaction.update(rideRef, { status: "no_drivers_available" });
            return;
        }

        // --- Sequential Dispatch Logic ---
        // For now, we will notify the top 3 closest drivers to increase chances of acceptance without broadcasting to all.
        // A true sequential system would require more complex state management (e.g., using another collection or tasks).
        const targets = nearbyPartners.slice(0, 3);
        const tokens = targets.map(p => p.fcmToken).filter(Boolean) as string[];

        if (tokens.length > 0) {
             const payloadData = {
                type: "new_ride_request",
                rideId,
                pickupAddress: rideData.pickup?.address ?? "",
                destinationAddress: rideData.destination?.address ?? "",
                pickupLocation: JSON.stringify(rideData.pickup?.location),
                destinationLocation: JSON.stringify(rideData.destination?.location),
                createdAt: rideData.createdAt?.toMillis?.().toString?.() ?? "",
                fare: String(rideData.fare ?? ""),
                rideType: rideData.rideType ?? "",
                status: rideData.status ?? "searching",
                riderName: rideData.riderName ?? "",
                riderId: rideData.riderId ?? "",
                riderGender: rideData.riderGender ?? "",
                otp: rideData.otp ?? "",
                distance: String(targets[0].distanceToRider), // Send distance for the closest driver
                eta: String((targets[0].distanceToRider || 0) * 2), // ETA for the closest
             };
            await messaging.sendEachForMulticast({ data: payloadData, tokens });
            console.log(`Ride request ${rideId} sent to ${tokens.length} closest partners.`);
        } else {
            // No partners with tokens, mark as unavailable
            transaction.update(rideRef, { status: "no_drivers_available" });
        }
    });
};


/* --------------------------------------------------
   ✅ GARAGE DISPATCH (ResQ)
-------------------------------------------------- */
const handleGarageRequestDispatch = async (requestData: any, requestId: string) => {
    const requestRef = db.doc(`garageRequests/${requestId}`);
    const userLoc = requestData.location as GeoPoint;
    
    // First, enrich the document with the address
    const locationAddress = await getAddressFromCoords(userLoc.latitude, userLoc.longitude);
    await requestRef.update({ locationAddress });
    
    const mechanicsSnapshot = await db
      .collection("mechanics")
      .where("isOnline", "==", true)
      .get();
  
    if (mechanicsSnapshot.empty) {
      await requestRef.update({ status: "no_mechanics_available" });
      return;
    }
  
    const rejectedBy = requestData.rejectedBy || [];
  
    const nearbyMechanics = mechanicsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Partner))
      .filter(m => {
        if (!m.currentLocation || rejectedBy.includes(m.id)) return false;
        const dist = getDistance(
          userLoc.latitude,
          userLoc.longitude,
          m.currentLocation.latitude,
          m.currentLocation.longitude
        );
        m.distanceToUser = dist;
        return dist < 15; // 15km radius
      })
      .sort((a, b) => (a.distanceToUser || 99) - (b.distanceToUser || 99));
  
    if (nearbyMechanics.length === 0) {
      await requestRef.update({ status: "no_mechanics_available" });
      return;
    }
  
    const targetMechanic = nearbyMechanics[0];
  
    if (!targetMechanic.fcmToken) {
        console.log(`Mechanic ${targetMechanic.id} has no FCM token. Cascading...`);
        await requestRef.update({
            rejectedBy: FieldValue.arrayUnion(targetMechanic.id),
        });
        return;
    }
    
    const distanceToUser = targetMechanic.distanceToUser || 0;
    const eta = distanceToUser * 3;

    const payload = {
        type: "new_garage_request",
        requestId,
        userId: requestData.userId,
        userName: requestData.userName,
        userPhone: requestData.userPhone,
        issue: requestData.issue,
        location: JSON.stringify(requestData.location),
        locationAddress, // Include the human-readable address
        status: requestData.status,
        otp: requestData.otp,
        createdAt: requestData.createdAt?.toMillis?.().toString() ?? "",
        distance: String(distanceToUser),
        eta: String(eta),
    };

    try {
        await messaging.send({ data: payload, token: targetMechanic.fcmToken });
        console.log(`Garage request ${requestId} sent to mechanic ${targetMechanic.id}.`);
    } catch (error) {
        console.error(`Failed to send garage request to mechanic ${targetMechanic.id}:`, error);
        await requestRef.update({
            rejectedBy: FieldValue.arrayUnion(targetMechanic.id),
        });
    }
};

/* --------------------------------------------------
   ✅ EMERGENCY DISPATCH
-------------------------------------------------- */
const handleEmergencyDispatch = async (caseData: any, caseId: string) => {

  const hospitalsSnapshot = await db
    .collection("ambulances")
    .where("isOnline", "==", true)
    .get();

  if (hospitalsSnapshot.empty) {
    await db.doc(`emergencyCases/${caseId}`).update({
      status: "no_partners_available"
    });
    return;
  }

  const patientLoc = caseData.location as GeoPoint;
  const rejected = caseData.rejectedBy || [];

  const available = hospitalsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Partner))
    .filter(h => !rejected.includes(h.id))
    .map(h => {
      const dist = getDistance(
        patientLoc.latitude,
        patientLoc.longitude,
        (h.location as GeoPoint).latitude,
        (h.location as GeoPoint).longitude
      );
      return { ...h, distance: dist };
    })
    .sort((a, b) => a.distance - b.distance);

  if (available.length === 0) {
    await db.doc(`emergencyCases/${caseId}`).update({
      status: "all_partners_busy"
    });
    return;
  }

  const target = available[0];

  if (!target.fcmToken) {
    await db.doc(`emergencyCases/${caseId}`).update({
      rejectedBy: FieldValue.arrayUnion(target.id)
    });
    return;
  }

  await messaging.send({
    data: { type: "new_emergency_request", caseId, ...caseData },
    token: target.fcmToken
  });
};

/* --------------------------------------------------
   ✅ TRIGGERS
-------------------------------------------------- */
export const dispatchRideRequest = onDocumentCreated(
  "rides/{rideId}",
  async (event) => {
    const data = event.data?.data();
    if (data?.status === "searching") {
      await handleRideDispatch(data, event.params.rideId);
    }
  }
);

export const dispatchGarageRequest = onDocumentCreated(
  "garageRequests/{requestId}",
  async (event) => {
    const data = event.data?.data();
    if (data?.status === "pending") {
      await handleGarageRequestDispatch(data, event.params.requestId);
    }
  }
);

// New trigger to handle garage request re-dispatch
export const garageRequestUpdater = onDocumentUpdated('garageRequests/{requestId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return;

    const rejectedBefore = beforeData.rejectedBy || [];
    const rejectedAfter = afterData.rejectedBy || [];

    if (afterData.status === 'pending' && rejectedAfter.length > rejectedBefore.length) {
        console.log(`Re-dispatching garage request: ${event.params.requestId} due to rejection.`);
        await handleGarageRequestDispatch(afterData, event.params.requestId);
    }
});


export const dispatchEmergencyCase = onDocumentCreated(
  "emergencyCases/{caseId}",
  async (event) => {
    const data = event.data?.data();
    if (data?.status === "pending") {
      await handleEmergencyDispatch(data, event.params.caseId);
    }
  }
);

/* --------------------------------------------------
   ✅ EMERGENCY LOGGING + REDISPATCH
-------------------------------------------------- */
export const emergencyCaseUpdater = onDocumentUpdated(
  "emergencyCases/{caseId}",
  async (event) => {

    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const caseId = event.params.caseId;
    const logRef = db.collection("emergencyCases").doc(caseId).collection("logs");

    let message = "";

    if (before.status !== after.status) {
      const actor = after.status.includes("_by_")
        ? after.status.split("_by_")[1]
        : "system";

      message = `Status changed from ${before.status} to ${after.status} by ${actor}.`;
    }

    const rb = before.rejectedBy || [];
    const ra = after.rejectedBy || [];

    if (ra.length > rb.length) {
      const who = ra.find((id: string) => !rb.includes(id));
      message = `Case rejected by partner ${who}. Re-dispatching.`;
    }

    if (message) {
      await logRef.add({
        timestamp: FieldValue.serverTimestamp(),
        message,
        before,
        after
      });
    }

    if (ra.length > rb.length && after.status === "pending") {
      await handleEmergencyDispatch(after, caseId);
    }
  }
);

/* --------------------------------------------------
   ✅ STATUS CLEANUP — Fix ghost users
-------------------------------------------------- */
export const statusCleanup = onSchedule("every 1 minutes", async () => {
  const now = Timestamp.now();
  const cutoff = new Timestamp(now.seconds - 120, now.nanoseconds);

  async function clean(col: string, status: string) {
    const q = db.collection(col)
      .where(status, "==", true)
      .where("lastSeen", "<", cutoff);

    const snap = await q.get();
    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { [status]: false, currentLocation: null });
    });

    await batch.commit();
  }

  await clean("users", "isOnline");
  await clean("partners", "isOnline");
  await clean("mechanics", "isOnline");
  await clean("ambulances", "isOnline");
});

/* --------------------------------------------------
   ✅ AUTOMATION WEBHOOK
-------------------------------------------------- */
const callAutomationWebhook = async (payload: any, type: string) => {
  const url = process.env.AUTOMATION_WEBHOOK_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: `new_${type}_partner`, data: payload })
  });
};

export const onNewPathPartner = onDocumentCreated(
  "partners/{id}",
  (event) => {
    const data = event.data?.data();
    if (data) callAutomationWebhook({ id: event.params.id, ...data, type: 'Path' }, "path");
  }
);

export const onNewResQPartner = onDocumentCreated(
  "mechanics/{id}",
  (event) => {
    const data = event.data?.data();
    if (data) callAutomationWebhook({ id: event.params.id, ...data, type: 'ResQ' }, "resq");
  }
);

export const onNewCurePartner = onDocumentCreated(
  "ambulances/{id}",
  (event) => {
    const data = event.data?.data();
    if (data) callAutomationWebhook({ id: event.params.id, ...data, type: 'Cure' }, "cure");
  }
);

/* --------------------------------------------------
   ✅ MANUAL HIGH DEMAND TRIGGER
-------------------------------------------------- */
export const simulateHighDemand = onCall(async (req) => {
  const zone = req.data.zoneName;
  if (!zone) throw new HttpsError("invalid-argument", "zoneName required");

  const url = process.env.AUTOMATION_WEBHOOK_URL;
  if (url) {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "high_demand_alert",
        data: { zone, incentive: 50, timestamp: new Date().toISOString() }
      })
    });
  }

  return { success: true };
});
