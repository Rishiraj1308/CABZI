
import { getFirestore, GeoPoint } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getDistance } from '../../utils/location.helpers';
import { Partner } from './ride.model';

const db = getFirestore();
const messaging = getMessaging();

export const dispatchRide = async (rideData: any, rideId: string) => {
    const rideRef = db.doc(`rides/${rideId}`);

    await db.runTransaction(async (transaction) => {
        const rideDoc = await transaction.get(rideRef);
        if (!rideDoc.exists || rideDoc.data()?.status !== 'searching') {
            return;
        }

        let partnersQuery = db.collection("pathPartners").where("isOnline", "==", true);
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
            });

        if (nearbyPartners.length === 0) {
            transaction.update(rideRef, { status: "no_drivers_available" });
            return;
        }

        // Notify all nearby partners sequentially for better control in future
        for (const partner of nearbyPartners) {
            if (!partner.fcmToken) continue;
            const dist = partner.distanceToRider || 0;
            const eta = dist * 2; // 2 minutes per km average
            
            const payloadData: { [key: string]: string } = {};
            // Convert all keys in rideData to string for FCM data payload
            for (const key in rideData) {
                if (Object.prototype.hasOwnProperty.call(rideData, key)) {
                    if (typeof rideData[key] !== 'string') {
                        payloadData[key] = JSON.stringify(rideData[key]);
                    } else {
                        payloadData[key] = rideData[key];
                    }
                }
            }

            try {
                await messaging.send({
                    data: {
                        ...payloadData,
                        type: "new_ride_request",
                        rideId,
                        distance: String(dist),
                        eta: String(eta),
                        vehicleNumber: partner.vehicleNumber ?? "N/A",
                    },
                    token: partner.fcmToken,
                });
            } catch (error) {
                console.error(`Failed to send notification to partner ${partner.id}`, error);
                // Optionally handle token cleanup if it's invalid
            }
        }
    });
};
