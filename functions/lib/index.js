"use strict";
'use server';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateHighDemand = exports.onNewCurePartner = exports.onNewResQPartner = exports.onNewPathPartner = exports.statusCleanup = exports.emergencyCaseUpdater = exports.dispatchEmergencyCase = exports.garageRequestUpdater = exports.dispatchGarageRequest = exports.dispatchRideRequest = void 0;
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
// ✅ Initialize Firebase Admin
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const messaging = (0, messaging_1.getMessaging)();
/* --------------------------------------------------
   ✅ Utility: Distance (Haversine)
-------------------------------------------------- */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
/* --------------------------------------------------
   ✅ Reverse Geocoding
-------------------------------------------------- */
async function getAddressFromCoords(lat, lon) {
    try {
        const response = await (0, node_fetch_1.default)(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        return data.display_name || 'Unknown Location';
    }
    catch (e) {
        console.error("Reverse geocode error:", e);
        return "Location address not available";
    }
}
/* --------------------------------------------------
   ✅ RIDE DISPATCH
-------------------------------------------------- */
const handleRideDispatch = async (initialRideData, rideId) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    const rideRef = db.doc(`rides/${rideId}`);
    const rideDoc = await rideRef.get();
    if (!rideDoc.exists)
        return;
    const rideData = rideDoc.data();
    if (rideData.status !== "searching")
        return;
    const rideTypeBase = (_c = (_b = (_a = rideData.rideType) === null || _a === void 0 ? void 0 : _a.split(" ")[0]) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : "";
    let partnersQuery = db
        .collection("partners")
        .where("isOnline", "==", true)
        .where("status", "==", "online");
    if (rideData.rideType === "Curocity Pink") {
        partnersQuery = partnersQuery
            .where("isCabziPinkPartner", "==", true)
            .where("gender", "==", "female");
    }
    const partnersSnapshot = await partnersQuery.get();
    if (partnersSnapshot.empty) {
        await rideRef.update({ status: "no_drivers_available" });
        return;
    }
    const rideLoc = (_d = rideData.pickup) === null || _d === void 0 ? void 0 : _d.location;
    const rejectedBy = rideData.rejectedBy || [];
    const nearbyPartners = partnersSnapshot.docs
        .map(doc => (Object.assign({ id: doc.id }, doc.data())))
        .filter(p => {
        var _a;
        if (!p.currentLocation)
            return false;
        if (!((_a = p.vehicleType) === null || _a === void 0 ? void 0 : _a.startsWith(rideTypeBase)))
            return false;
        if (rejectedBy.includes(p.id))
            return false;
        const dist = getDistance(rideLoc.latitude, rideLoc.longitude, p.currentLocation.latitude, p.currentLocation.longitude);
        p.distanceToRider = dist;
        return dist < 10;
    });
    if (nearbyPartners.length === 0) {
        await rideRef.update({ status: "no_drivers_available" });
        return;
    }
    for (const partner of nearbyPartners) {
        if (!partner.fcmToken)
            continue;
        const dist = partner.distanceToRider || 0;
        const eta = dist * 2;
        const payloadData = {
            type: "new_ride_request",
            rideId,
            pickupAddress: (_f = (_e = rideData.pickup) === null || _e === void 0 ? void 0 : _e.address) !== null && _f !== void 0 ? _f : "",
            destinationAddress: (_h = (_g = rideData.destination) === null || _g === void 0 ? void 0 : _g.address) !== null && _h !== void 0 ? _h : "",
            pickupLocation: JSON.stringify((_j = rideData.pickup) === null || _j === void 0 ? void 0 : _j.location),
            destinationLocation: JSON.stringify((_k = rideData.destination) === null || _k === void 0 ? void 0 : _k.location),
            createdAt: (_q = (_p = (_m = (_l = rideData.createdAt) === null || _l === void 0 ? void 0 : _l.toMillis) === null || _m === void 0 ? void 0 : (_o = _m.call(_l)).toString) === null || _p === void 0 ? void 0 : _p.call(_o)) !== null && _q !== void 0 ? _q : "",
            fare: String((_r = rideData.fare) !== null && _r !== void 0 ? _r : ""),
            rideType: (_s = rideData.rideType) !== null && _s !== void 0 ? _s : "",
            status: (_t = rideData.status) !== null && _t !== void 0 ? _t : "searching",
            riderName: (_u = rideData.riderName) !== null && _u !== void 0 ? _u : "",
            riderId: (_v = rideData.riderId) !== null && _v !== void 0 ? _v : "",
            riderGender: (_w = rideData.riderGender) !== null && _w !== void 0 ? _w : "",
            otp: (_x = rideData.otp) !== null && _x !== void 0 ? _x : "",
            distance: String(dist),
            eta: String(eta),
            vehicleNumber: (_y = partner.vehicleNumber) !== null && _y !== void 0 ? _y : "N/A",
        };
        await messaging.send({ data: payloadData, token: partner.fcmToken });
    }
};
/* --------------------------------------------------
   ✅ GARAGE DISPATCH (ResQ) - REWRITTEN
-------------------------------------------------- */
const handleGarageRequestDispatch = async (requestData, requestId) => {
    var _a, _b, _c;
    const requestRef = db.doc(`garageRequests/${requestId}`);
    const userLoc = requestData.location;
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
        .map(doc => (Object.assign({ id: doc.id }, doc.data())))
        .filter(m => {
        if (!m.currentLocation || rejectedBy.includes(m.id))
            return false;
        const dist = getDistance(userLoc.latitude, userLoc.longitude, m.currentLocation.latitude, m.currentLocation.longitude);
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
            rejectedBy: firestore_2.FieldValue.arrayUnion(targetMechanic.id),
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
        createdAt: (_c = (_b = (_a = requestData.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a).toString()) !== null && _c !== void 0 ? _c : "",
        distance: String(distanceToUser),
        eta: String(eta),
    };
    try {
        await messaging.send({ data: payload, token: targetMechanic.fcmToken });
        console.log(`Garage request ${requestId} sent to mechanic ${targetMechanic.id}.`);
    }
    catch (error) {
        console.error(`Failed to send garage request to mechanic ${targetMechanic.id}:`, error);
        await requestRef.update({
            rejectedBy: firestore_2.FieldValue.arrayUnion(targetMechanic.id),
        });
    }
};
/* --------------------------------------------------
   ✅ EMERGENCY DISPATCH
-------------------------------------------------- */
const handleEmergencyDispatch = async (caseData, caseId) => {
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
    const patientLoc = caseData.location;
    const rejected = caseData.rejectedBy || [];
    const available = hospitalsSnapshot.docs
        .map(doc => (Object.assign({ id: doc.id }, doc.data())))
        .filter(h => !rejected.includes(h.id))
        .map(h => {
        const dist = getDistance(patientLoc.latitude, patientLoc.longitude, h.location.latitude, h.location.longitude);
        return Object.assign(Object.assign({}, h), { distance: dist });
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
            rejectedBy: firestore_2.FieldValue.arrayUnion(target.id)
        });
        return;
    }
    await messaging.send({
        data: Object.assign({ type: "new_emergency_request", caseId }, caseData),
        token: target.fcmToken
    });
};
/* --------------------------------------------------
   ✅ TRIGGERS
-------------------------------------------------- */
exports.dispatchRideRequest = (0, firestore_1.onDocumentCreated)("rides/{rideId}", async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if ((data === null || data === void 0 ? void 0 : data.status) === "searching") {
        await handleRideDispatch(data, event.params.rideId);
    }
});
exports.dispatchGarageRequest = (0, firestore_1.onDocumentCreated)("garageRequests/{requestId}", async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if ((data === null || data === void 0 ? void 0 : data.status) === "pending") {
        await handleGarageRequestDispatch(data, event.params.requestId);
    }
});
// New trigger to handle garage request re-dispatch
exports.garageRequestUpdater = (0, firestore_1.onDocumentUpdated)('garageRequests/{requestId}', async (event) => {
    var _a, _b;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData)
        return;
    const rejectedBefore = beforeData.rejectedBy || [];
    const rejectedAfter = afterData.rejectedBy || [];
    if (afterData.status === 'pending' && rejectedAfter.length > rejectedBefore.length) {
        console.log(`Re-dispatching garage request: ${event.params.requestId} due to rejection.`);
        await handleGarageRequestDispatch(afterData, event.params.requestId);
    }
});
exports.dispatchEmergencyCase = (0, firestore_1.onDocumentCreated)("emergencyCases/{caseId}", async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if ((data === null || data === void 0 ? void 0 : data.status) === "pending") {
        await handleEmergencyDispatch(data, event.params.caseId);
    }
});
/* --------------------------------------------------
   ✅ EMERGENCY LOGGING + REDISPATCH
-------------------------------------------------- */
exports.emergencyCaseUpdater = (0, firestore_1.onDocumentUpdated)("emergencyCases/{caseId}", async (event) => {
    var _a, _b, _c, _d;
    const before = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before) === null || _b === void 0 ? void 0 : _b.data();
    const after = (_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.after) === null || _d === void 0 ? void 0 : _d.data();
    if (!before || !after)
        return;
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
        const who = ra.find((id) => !rb.includes(id));
        message = `Case rejected by partner ${who}. Re-dispatching.`;
    }
    if (message) {
        await logRef.add({
            timestamp: firestore_2.FieldValue.serverTimestamp(),
            message,
            before,
            after
        });
    }
    if (ra.length > rb.length && after.status === "pending") {
        await handleEmergencyDispatch(after, caseId);
    }
});
/* --------------------------------------------------
   ✅ STATUS CLEANUP — Fix ghost users
-------------------------------------------------- */
exports.statusCleanup = (0, scheduler_1.onSchedule)("every 1 minutes", async () => {
    const now = firestore_2.Timestamp.now();
    const cutoff = new firestore_2.Timestamp(now.seconds - 120, now.nanoseconds);
    async function clean(col, status) {
        const q = db.collection(col)
            .where(status, "==", true)
            .where("lastSeen", "<", cutoff);
        const snap = await q.get();
        if (snap.empty)
            return;
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
const callAutomationWebhook = async (payload, type) => {
    const url = process.env.AUTOMATION_WEBHOOK_URL;
    if (!url)
        return;
    await (0, node_fetch_1.default)(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: `new_${type}_partner`, data: payload })
    });
};
exports.onNewPathPartner = (0, firestore_1.onDocumentCreated)("partners/{id}", (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (data)
        callAutomationWebhook(Object.assign(Object.assign({ id: event.params.id }, data), { type: 'Path' }), "path");
});
exports.onNewResQPartner = (0, firestore_1.onDocumentCreated)("mechanics/{id}", (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (data)
        callAutomationWebhook(Object.assign(Object.assign({ id: event.params.id }, data), { type: 'ResQ' }), "resq");
});
exports.onNewCurePartner = (0, firestore_1.onDocumentCreated)("ambulances/{id}", (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (data)
        callAutomationWebhook(Object.assign(Object.assign({ id: event.params.id }, data), { type: 'Cure' }), "cure");
});
/* --------------------------------------------------
   ✅ MANUAL HIGH DEMAND TRIGGER
-------------------------------------------------- */
exports.simulateHighDemand = (0, https_1.onCall)(async (req) => {
    const zone = req.data.zoneName;
    if (!zone)
        throw new https_1.HttpsError("invalid-argument", "zoneName required");
    const url = process.env.AUTOMATION_WEBHOOK_URL;
    if (url) {
        await (0, node_fetch_1.default)(url, {
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
//# sourceMappingURL=index.js.map