# Curocity: The System Architecture Blueprint (Production-Ready)

This document provides a high-level overview of the technical architecture of the Curocity application. It explains how different components work together to create a seamless, real-time, and scalable experience for riders, partners, and admins.

## 1. Core Philosophy: Firebase-First, Scalable, and Server-Centric

The architecture is built on a "Firebase-first" principle, leveraging its powerful Platform-as-a-Service (PaaS) capabilities for speed and scalability, while implementing a server-centric logic to maintain low operational costs.

- **Real-time Engine:** Firestore and Firebase Cloud Messaging (FCM).
- **Backend Logic:** Firebase Cloud Functions.
- **Authentication:** Firebase Authentication.
- **Security:** Granular Firestore Security Rules.

**Key Principle:** All real-time dispatching (for rides, mechanics, ambulances) is handled by backend Cloud Functions, which push targeted notifications to clients via FCM. Clients **do not** poll or maintain open listeners on entire collections, which drastically reduces database reads and costs.

## 2. The Three Main Pillars

### 🖥️ Pillar 1: Frontend (The User's World)

- **Framework:** Next.js (App Router) → Fast, modern web application with SSR for performance.
- **UI Components:** ShadCN UI + Tailwind CSS → A consistent, professional, and themeable design system.
- **Mapping:** Leaflet.js → A lightweight, open-source library for interactive maps.
- **State Management:** A combination of React Context and component state for simplicity and efficiency.

### 🧠 Pillar 2: Backend & Database (The Nervous System)

- **Core:** Firebase (PaaS).
- **Firestore (Database):** The primary NoSQL database for all application data.
    - **Collections:** `users`, `partners`, `mechanics`, `ambulances`, `rides`, `garageRequests`, `emergencyCases`, `supportQueries`.
-   **Firebase Cloud Functions (Backend Logic):** The "brain" of the application, located in `src/functions`.
    -   **Dispatchers:** Functions like `dispatchRideRequest` trigger on new document creation (e.g., a new ride). They perform geo-queries to find the nearest partners and send them targeted push notifications via FCM.
    -   **Scheduled Functions:** Maintenance functions like `statusCleanup` run periodically to mark inactive users as offline, preventing "ghost" partners on the map.
- **Firebase Authentication (Auth):** Manages secure user login via Phone OTP.
- **Firestore Security Rules (`firestore.rules`):** A critical security layer that defines read/write permissions for every collection, ensuring users can only access their own data.

### 🌐 Pillar 3: External & Automation Services (The Specialists)

#### A. Mapping Intelligence
- **Nominatim API** → An open-source API for converting text addresses into geo-coordinates (geocoding).
- **OSRM API** → An open-source routing engine for calculating route geometry, ETA, and distance for fare calculation.

#### B. Advanced Features & Automation
- **Proprietary Logic:** We use modern frameworks and tools to build advanced, data-driven features.
- **Use Cases:**
    -   **Earnings Coach (`/driver`):** Provides personalized tips to partners on how to improve their earnings.
    -   **Support Bot (`/rider/support`):** Handles initial customer queries, provides instant answers, and automatically logs support tickets.

## 3. Production-Ready Data Flow (Example: Ride Booking)

```
[Rider App] ----(1. Create Ride Doc)----> [Firestore: /rides/{id}]
     ^                                             |
     |                                             | (2. onCreate Trigger)
     |                                             v
     |                                     [Firebase Cloud Function: dispatchRideRequest]
     |                                             |
(6. Listen to single doc)                          | (3. Geo-query partners)
     |                                             v
     |                                     [Finds 5-10 nearest partners]
     |                                             |
     |                                             | (4. Send Targeted Push)
     |                                             v
     |                                         [FCM]
     |                                             |
     +----(5. Update Ride Doc)---- [Driver App (receives push)]
```

1.  **Rider books a ride:** Creates a single document in `/rides/{rideId}` with `status: 'searching'`.
2.  **Cloud Function Triggers:** The `dispatchRideRequest` function is automatically invoked.
3.  **Function finds partners:** It queries the `partners` collection for the nearest online drivers.
4.  **Function sends push notifications:** It sends a private data message via FCM to only those selected drivers.
5.  **Driver accepts:** The driver's app receives the notification and updates the *specific ride document* (`/rides/{rideId}`), setting `status: 'accepted'`.
6.  **Rider gets update:** The rider's app, which is only listening to that *one single document*, gets the update instantly and shows the driver's details.

This **server-centric, push-based model** is the core of Curocity's scalable and cost-effective architecture.
