
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { dispatchEmergency as dispatchEmergencyService } from "./cure.service";

const db = getFirestore();

export const dispatchEmergencyCase = onDocumentCreated("emergencyCases/{caseId}", async (event) => {
    const data = event.data?.data();
    if (data?.status === "pending") {
        await dispatchEmergencyService(data, event.params.caseId);
    }
});

export const emergencyCaseUpdater = onDocumentUpdated("emergencyCases/{caseId}", async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const caseId = event.params.caseId;
    const logRef = db.collection("emergencyCases").doc(caseId).collection("logs");

    let message = "";
    if (before.status !== after.status) {
        const actor = after.status.includes("_by_") ? after.status.split("_by_")[1] : "system";
        message = `Status changed from ${before.status} to ${after.status} by ${actor}.`;
    }

    const rb = before.rejectedBy || [];
    const ra = after.rejectedBy || [];
    if (ra.length > rb.length) {
        const who = ra.find((id: string) => !rb.includes(id));
        message = `Case rejected by partner ${who}. Re-dispatching.`;
        if (after.status === "pending") {
          await dispatchEmergencyService(after, caseId);
        }
    }

    if (message) {
        await logRef.add({ timestamp: FieldValue.serverTimestamp(), message, before, after });
    }
});
