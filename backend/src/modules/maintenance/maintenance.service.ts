
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

export const cleanup = async () => {
    const now = Timestamp.now();
    const cutoff = new Timestamp(now.seconds - 120, now.nanoseconds); // 2 minutes ago

    const cleanCollection = async (collectionName: string, statusField: string) => {
        const query = db.collection(collectionName)
            .where(statusField, "==", true)
            .where("lastSeen", "<", cutoff);
        
        const snapshot = await query.get();
        if (snapshot.empty) return;

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { [statusField]: false, currentLocation: null });
        });
        await batch.commit();
        console.log(`Cleaned up ${snapshot.size} stale entities from ${collectionName}.`);
    };

    try {
        await Promise.all([
            cleanCollection("users", "isOnline"),
            cleanCollection("pathPartners", "isOnline"),
            cleanCollection("mechanics", "isOnline"),
            cleanCollection("curePartners", "isOnline") // Changed from "ambulances" to "curePartners"
        ]);
    } catch (error) {
        console.error("Error during status cleanup:", error);
    }
};
