# Curocity: The CPR Technical Flowchart

This document outlines the end-to-end technical data flow for each ecosystem within Curocity. It explains how a user's request is processed, assigned, and completed in a scalable, real-time manner.

---

## 1. PATH Ecosystem (Ride-Hailing) Flow

**Goal:** Assign a nearby driver to a rider's request efficiently.

```
[Rider App]
     |
     | 1. Creates Ride Document in Firestore
     |    (status: 'searching')
     v
[Firestore: /rides/{rideId}]
     |
     | 2. Cloud Function `dispatchRideRequest` triggers `onCreate`
     v
[Backend: Firebase Cloud Function]
     |
     | 3. Geo-queries `/partners` collection for nearest 5-10 online drivers
     v
[Finds Partner A, Partner B, Partner C]
     |
     | 4. Sends targeted Push Notification (FCM)
     |    (payload contains rideId and details)
     v
[Partner A's App]      [Partner B's App]
     |                        |
     | 5. Partner A accepts.  | (Partner B declines or times out)
     |    App updates the    |
     |    original ride doc. |
     v                        |
[Firestore: /rides/{rideId}]
     |    (status: 'accepted', driverId: 'PartnerA_ID')
     |
     | 6. Rider's app (listening to ONLY this doc) gets real-time update
     v
[Rider App: Shows Partner A's details and live location]
```

---

## 2. ResQ Ecosystem (Roadside Assistance) Flow

**Goal:** Assign a nearby mechanic to a stranded driver.

```
[Driver's App]
     |
     | 1. Creates Garage Request in Firestore
     |    (status: 'pending', issue: 'Flat Tyre')
     v
[Firestore: /garageRequests/{reqId}]
     |
     | 2. Cloud Function `dispatchGarageRequest` triggers
     v
[Backend: Firebase Cloud Function]
     |
     | 3. Geo-queries `/mechanics` collection for nearest 5 available mechanics
     v
[Finds Mechanic X, Mechanic Y]
     |
     | 4. Sends targeted Push Notification (FCM) with job details
     v
[Mechanic X's App]
     |
     | 5. Mechanic X accepts. App updates the `/garageRequests/{reqId}` document.
     v
[Firestore: /garageRequests/{reqId}]
     |    (status: 'accepted', mechanicId: 'MechanicX_ID')
     |
     | 6. Driver's app gets the update instantly and shows mechanic's ETA.
     v
[Driver's App: Shows Mechanic X is on the way]
```

---

## 3. CURE Ecosystem (Emergency Medical) Flow

**Goal:** Dispatch the nearest available hospital ambulance to a user's SOS call.

```
[Rider App]
     |
     | 1. Triggers SOS, selects severity.
     |    App creates `emergencyCase` doc in Firestore (status: 'pending')
     v
[Firestore: /emergencyCases/{caseId}]
     |
     | 2. Cloud Function `dispatchEmergencyCase` triggers
     v
[Backend: Firebase Cloud Function]
     |
     | 3. Geo-queries `/ambulances` collection for the single, nearest, online hospital
     |    that has not rejected the case yet.
     v
[Finds Hospital Alpha]
     |
     | 4. Sends targeted Push Notification (FCM) to Hospital Alpha's Mission Control
     v
[Hospital Alpha's Dashboard: /cure]
     |
     | 5. Staff accepts the case and dispatches a specific ambulance (e.g., 'Ambulance-01').
     |    The dashboard updates the `/emergencyCases/{caseId}` document.
     v
[Firestore: /emergencyCases/{caseId}]
     |    (status: 'accepted', assignedPartner: {id: 'HospitalAlpha_ID'}, assignedAmbulanceId: 'Amb01')
     |
     | 6. Rider's app gets the update and starts tracking the assigned ambulance.
     v
[Rider App: Shows Ambulance-01's live location and ETA]

```
**Cascade Logic:** If Hospital Alpha rejects the case or doesn't respond within 60 seconds, the `emergencyCaseUpdater` Cloud Function is triggered. It adds 'HospitalAlpha_ID' to a `rejectedBy` list in the document and re-runs the dispatch logic to find the next nearest hospital (Hospital Bravo), ensuring the request is never dropped.

---

## 4. Admin Panel Integration

The Admin Panel (`/admin`) is the central nervous system that monitors all these flows.

*   **Live Map (`/admin/map`):** Listens to the `currentLocation` of all online partners (`partners`, `mechanics`, `ambulances`) and riders (`users`) to display them as markers in real-time.
*   **Unified Partner Management (`/admin/partners`):** Reads from `partners`, `mechanics`, and `ambulances` collections to display a unified list. The "Approve/Reject" buttons directly update the `status` field of the corresponding document in Firestore.
*   **Audit Trails (`/admin/rides`, `/admin/cure-cases`):** These pages are a direct, read-only view of the `rides` and `emergencyCases` collections, sorted by date, providing a complete historical log.
*   **Financials (`/admin/audit`, `/admin/bank`):** These panels read aggregated data from partner wallets and expense ledgers to generate P&L statements and financial reports.

This server-centric, push-based architecture ensures the Curocity platform is scalable, cost-effective, and provides a seamless real-time experience for all users.
