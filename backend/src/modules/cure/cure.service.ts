
import { getFirestore, GeoPoint, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getDistance } from '../../utils/location.helpers';
import { Partner } from './cure.model';

const db = getFirestore();
const messaging = getMessaging();

export const dispatchEmergency = async (caseData: any, caseId: string) => {
    const caseRef = db.doc(`emergencyCases/${caseId}`);

    await db.runTransaction(async (transaction) => {
        const hospitalsSnapshot = await transaction.get(
            db.collection("curePartners").where("isOnline", "==", true).where("isErFull", "!=", true)
        );

        if (hospitalsSnapshot.empty) {
            transaction.update(caseRef, { status: "no_partners_available" });
            return;
        }

        const patientLoc = caseData.location as GeoPoint;
        const rejected = caseData.rejectedBy || [];

        const available = hospitalsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Partner))
            .filter(h => h.location && !rejected.includes(h.id))
            .map(h => {
                const dist = getDistance(patientLoc.latitude, patientLoc.longitude, (h.location as GeoPoint).latitude, (h.location as GeoPoint).longitude);
                return { ...h, distance: dist };
            })
            .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));

        if (available.length === 0) {
            transaction.update(caseRef, { status: "all_partners_busy" });
            return;
        }

        const target = available[0];
        
        if (!target.fcmToken) {
            transaction.update(caseRef, { rejectedBy: FieldValue.arrayUnion(target.id) });
            return;
        }

        try {
            await messaging.send({
                data: { type: "new_emergency_request", caseId, ...caseData },
                token: target.fcmToken
            });
            // Update status immediately to prevent re-dispatch
            transaction.update(caseRef, { status: "dispatched", 'assignedPartner.id': target.id });
        } catch (e) {
            console.error(`Failed to send notification to ${target.id}:`, e);
            transaction.update(caseRef, { rejectedBy: FieldValue.arrayUnion(target.id) });
        }
    });
};
