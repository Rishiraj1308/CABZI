
'use server';

import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp();
}

// Import and export all function triggers from their respective modules.
// This keeps the root index file clean and acts as a directory for all functions.

// PATH (Ride-Hailing) Triggers
export { dispatchRideRequest } from './modules/ride/ride.controller';

// ResQ (Mechanic) Triggers
export { dispatchGarageRequest, garageRequestUpdater } from './modules/mechanic/mechanic.controller';

// CURE (Emergency) Triggers
export { dispatchEmergencyCase, emergencyCaseUpdater } from './modules/cure/cure.controller';

// Scheduled Maintenance Triggers
export { statusCleanup } from './modules/maintenance/maintenance.controller';

// Automation & Webhook Triggers
export { 
    onNewPathPartner, 
    onNewResQPartner, 
    onNewCurePartner,
    simulateHighDemand 
} from './modules/automation/automation.controller';
