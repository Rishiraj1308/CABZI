
import { getFirestore, GeoPoint, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getDistance, getAddressFromCoords } from '../../utils/location.helpers';
import { Partner } from './mechanic.model';

const db = getFirestore();
const messaging = getMessaging();

export const dispatchGarageRequest = async (requestData: any, requestId: string) => {
    const requestRef = db.doc(`garageRequests/${requestId}`);
    const userLoc = requestData.location as GeoPoint;

    if (!requestData.locationAddress) {
        const locationAddress = await getAddressFromCoords(userLoc.latitude, userLoc.longitude);
        await requestRef.update({ locationAddress });
        requestData.locationAddress = locationAddress;
    }

    const mechanicsSnapshot = await db.collection("mechanics").where("isOnline", "==", true).get();
    if (mechanicsSnapshot.empty) {
        await requestRef.update({ status: "no_mechanics_available" });
        return;
    }

    const rejectedBy = requestData.rejectedBy || [];
    const nearbyMechanics = mechanicsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Partner))
        .filter(m => {
            if (!m.currentLocation || rejectedBy.includes(m.id)) return false;
            const dist = getDistance(userLoc.latitude, userLoc.longitude, m.currentLocation.latitude, m.currentLocation.longitude);
            m.distanceToUser = dist;
            return dist < 15;
        })
        .sort((a, b) => (a.distanceToUser || 99) - (b.distanceToUser || 99));

    if (nearbyMechanics.length === 0) {
        await requestRef.update({ status: "no_mechanics_available" });
        return;
    }

    // Sequentially notify mechanics
    const targetMechanic = nearbyMechanics[0];
    if (!targetMechanic.fcmToken) {
        await requestRef.update({ rejectedBy: FieldValue.arrayUnion(targetMechanic.id) });
        return;
    }

    const distanceToUser = targetMechanic.distanceToUser || 0;
    const eta = distanceToUser * 3; // 3 minutes per km average
    const payload = {
        type: "new_garage_request", requestId, ...requestData,
        location: JSON.stringify(requestData.location),
        createdAt: requestData.createdAt?.toMillis?.().toString() ?? "",
        distance: String(distanceToUser), eta: String(eta),
    };

    try {
        await messaging.send({ data: payload, token: targetMechanic.fcmToken });
    } catch (error) {
        console.error(`Failed to send notification to ${targetMechanic.id}:`, error);
        await requestRef.update({ rejectedBy: FieldValue.arrayUnion(targetMechanic.id) });
    }
};
