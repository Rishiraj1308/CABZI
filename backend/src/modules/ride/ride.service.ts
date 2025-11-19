
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

        let partnersQuery = db.collection("pathPartners").where("isOnline", "==", true).where("liveStatus", "==", "online");
        if (rideData.rideType === "Curocity Pink") {
            partnersQuery = partnersQuery.where("isCurocityPinkPartner", "==", true).where("gender", "==", "female");
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
            .sort((a, b) => (a.distanceToRider || 99) - (b.distanceToRider || 99));

        if (nearbyPartners.length === 0) {
            transaction.update(rideRef, { status: "no_drivers_available" });
            return;
        }

        const targets = nearbyPartners.slice(0, 3);
        const tokens = targets.map(p => p.fcmToken).filter(Boolean) as string[];
        
        if (tokens.length > 0) {
            const closestPartner = targets[0];
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
                distance: String(closestPartner.distanceToRider),
                eta: String((closestPartner.distanceToRider || 0) * 2),
                vehicleNumber: closestPartner.vehicleNumber ?? "N/A",
            };
            await messaging.sendEachForMulticast({ data: payloadData, tokens });
        } else {
            transaction.update(rideRef, { status: "no_drivers_available" });
        }
    });
};
