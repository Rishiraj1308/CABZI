# Cabzi CURE: The User-to-Hospital Connection Blueprint

This document outlines the precise, step-by-step technical workflow that connects a user in an emergency with a Cabzi CURE partner (hospital), ensuring a rapid and reliable ambulance dispatch. This process is built on our "No Cost" server-centric architecture.

---

## The Scenario: A User Needs Emergency Help

A user is in a medical emergency and needs an ambulance immediately.

---

### **Step 1: The SOS Trigger (Rider's App)**

1.  **Initiate SOS:** The user opens the Cabzi app and taps the main SOS button.
2.  **Smart Triage:** The app presents a "Severity Selection" screen (`Critical`, `Serious`, `Non-Critical`). The user selects one.
3.  **Location Lock:** The app gets the user's precise GPS coordinates.
4.  **Create Case Document:** The user's app performs a **single write operation**, creating a new document in the `emergencyCases` collection in Firestore. This document contains:
    *   `riderId`, `riderName`, `phone`
    *   `location` (GeoPoint)
    *   `severity`
    *   `status: 'pending'` (This is the trigger)
    *   `createdAt: serverTimestamp()`

**Key Point:** The user's app now starts listening *only* to this specific document for any changes. It does not listen to the entire collection.

---

### **Step 2: The "No Cost" Dispatcher (Backend Cloud Function)**

1.  **Function Invoked:** The creation of the new document in `emergencyCases` automatically triggers our backend Cloud Function, `dispatchEmergencyCase`.
2.  **Intelligent Geo-Query:** The function reads the case document and performs a highly efficient geo-query on the `ambulances` (hospitals) collection. It searches for partners that are:
    *   `isOnline: true`
    *   `isErFull: false` (The hospital has available beds)
    *   **Not** in the `rejectedBy` array of the current case document.
3.  **Find the Best Match:** The function sorts the results by distance and selects the **single nearest hospital**.
4.  **Targeted Push Notification (FCM):** The function sends a private, targeted data message via Firebase Cloud Messaging (FCM) **only to the selected hospital's device token**. This notification contains all the case details (`caseId`, patient name, location, severity).

**Cost Impact:** This entire backend process involves only a handful of database reads, regardless of how many hospitals are on the platform. It is extremely scalable and cost-efficient.

---

### **Step 3: The Alert (Hospital's Mission Control)**

1.  **Receive Notification:** The hospital's Mission Control dashboard (`/cure` page) is always listening for these private FCM messages.
2.  **Live Action Feed:** Upon receiving the notification, a new, prominent, pulsing **Alert Card** instantly appears in the "Action Feed".
3.  **Staff Takes Action:** The hospital staff sees the alert and clicks "Accept".

---

### **Step 4: Dispatch & Connection (Closing the Loop)**

1.  **Select Ambulance:** After clicking "Accept," a dialog appears on the hospital's dashboard, showing a list of their *available* ambulances (from their own fleet subcollection). The staff selects the most appropriate vehicle (e.g., "Ambulance-01").
2.  **Update Case Document:** The hospital dashboard performs a **single update operation** on the original `emergencyCases` document in Firestore:
    *   Sets `status: 'accepted'`.
    *   Adds `assignedPartner: {id: 'hospital_id', name: 'Hospital Name'}`.
    *   Adds `assignedAmbulanceId: 'ambulance_01_id'`.
3.  **Patient App Gets Instant Update:** Because the patient's app was listening to this specific document, it receives this update instantly.
4.  **UI Transformation:** The patient's app UI transforms from "Finding Help..." to the "Ambulance En-Route" screen, now showing:
    *   The name of the hospital and the assigned ambulance.
    *   The paramedic's name and photo.
    *   The ambulance's **live location** moving towards them on the map.
    *   The real-time ETA.

---

### **The "Smart Cascade": The Fail-Safe Logic**

*   **Rejection:** If Hospital A clicks "Reject", their dashboard updates the case document, adding their ID to the `rejectedBy` array. This change triggers the `emergencyCaseUpdater` function, which re-runs the dispatch logic, automatically finding and notifying the next nearest hospital (Hospital B).
*   **Timeout:** If Hospital A doesn't respond within 60 seconds, a scheduled Cloud Function (`emergencyCaseTimeout`) identifies the stale request, adds Hospital A's ID to the `rejectedBy` array, and triggers the re-dispatch.

This entire workflow ensures that no emergency request is ever dropped and is handled with maximum speed and efficiency.