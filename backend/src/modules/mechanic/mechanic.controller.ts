
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { dispatchGarageRequest as dispatchGarageRequestService } from "./mechanic.service";

export const dispatchGarageRequest = onDocumentCreated("garageRequests/{requestId}", async (event) => {
    const data = event.data?.data();
    if (data?.status === "pending") {
        await dispatchGarageRequestService(data, event.params.requestId);
    }
});

export const garageRequestUpdater = onDocumentUpdated('garageRequests/{requestId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return;

    const rejectedBefore = beforeData.rejectedBy || [];
    const rejectedAfter = afterData.rejectedBy || [];

    if (afterData.status === 'pending' && rejectedAfter.length > rejectedBefore.length) {
        await dispatchGarageRequestService(afterData, event.params.requestId);
    }
});
