
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { dispatchRide } from "./ride.service";

export const dispatchRideRequest = onDocumentCreated("rides/{rideId}", async (event) => {
    const data = event.data?.data();
    if (data?.status === "searching") {
        await dispatchRide(data, event.params.rideId);
    }
});
