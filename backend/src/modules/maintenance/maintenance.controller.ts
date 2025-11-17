
import { onSchedule } from "firebase-functions/v2/scheduler";
import { cleanup } from "./maintenance.service";

export const statusCleanup = onSchedule("every 1 minutes", async () => {
    await cleanup();
});
