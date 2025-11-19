
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { callAutomationWebhook, simulateHighDemand as simulateHighDemandService } from "./automation.service";

export const onNewPathPartner = onDocumentCreated("pathPartners/{id}", (event) => {
    const data = event.data?.data();
    if (data) callAutomationWebhook({ id: event.params.id, ...data, type: 'Path' }, "path");
});

export const onNewResQPartner = onDocumentCreated("mechanics/{id}", (event) => {
    const data = event.data?.data();
    if (data) callAutomationWebhook({ id: event.params.id, ...data, type: 'ResQ' }, "resq");
});

export const onNewCurePartner = onDocumentCreated("curePartners/{id}", (event) => { // Changed from "ambulances" to "curePartners"
    const data = event.data?.data();
    if (data) callAutomationWebhook({ id: event.params.id, ...data, type: 'Cure' }, "cure");
});

export const simulateHighDemand = onCall(async (req) => {
    const zone = req.data.zoneName;
    if (!zone) throw new HttpsError("invalid-argument", "zoneName is required.");

    const result = await simulateHighDemandService(zone);
    if (!result.success) {
        throw new HttpsError("internal", result.message);
    }
    return result;
});
