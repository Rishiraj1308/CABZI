# Cabzi: The Technical Blueprint

This document provides a complete technical overview of the Cabzi application. It is intended for developers to understand the project structure, data flow, and core logic.

---

## 1. Project DNA

*   **Core Mission:** To build India's first complete mobility, safety, and life-saving ecosystem on a fair, transparent, and scalable tech stack.
*   **Tech Stack:**
    *   **Frontend:** Next.js (App Router), React, TypeScript
    *   **UI:** ShadCN UI, Tailwind CSS, Lucide Icons, Lottie for animations
    *   **Backend:** Firebase (Platform-as-a-Service)
        *   **Database:** Firestore (NoSQL, Document-based)
        *   **Authentication:** Firebase Authentication (Phone OTP)
        *   **Serverless Logic:** Firebase Cloud Functions (for dispatching, cleanup, etc.)
        *   **Push Notifications:** Firebase Cloud Messaging (FCM)
    *   **Mapping:** Leaflet (Client-side) with OpenStreetMap tiles.
    *   **Routing & Geocoding:** OSRM (Open Source Routing Machine) & Nominatim API.

---

## 2. Code Ka Naksha (Directory Structure)

The `src` directory is organized to keep the codebase clean and scalable.

*   `src/app/`: This is the core of the Next.js App Router.
    *   `(unauthenticated)`: Contains the login page (`/login`), which is a shared entry point for all user roles.
    *   `admin/`: All pages related to the Admin Panel (Dashboard, Partners, Map, etc.).
    *   `driver/`: All pages for the **Path Partner** (Driver) role.
    *   `rider/`: All pages for the **Rider** (Customer) role.
    *   `mechanic/`: All pages for the **ResQ Partner** (Mechanic) role.
    *   `cure/`: All pages for the **Cure Partner** (Hospital) role, including their Mission Control Dashboard.
    *   `ambulance/`: The dedicated dashboard for an **Ambulance Driver**, separate from the hospital's main panel.
    *   `partner-hub/`: A central page to select between Path, ResQ, and Cure Partner onboarding.
    *   `layout.tsx`: The root layout of the entire application.
    *   `globals.css`: The heart of our design system. It contains all the HSL color variables for our ShadCN theme.

*   `src/components/`: Reusable React components used across the app.
    *   `ui/`: Contains all the base ShadCN components (Button, Card, Input, etc.).
    *   `brand-logo.tsx`: The "Cabzi" logo component.
    *   `live-map.tsx`: The powerful, interactive Leaflet map component.
    *   `driver-id-card.tsx`: The special ID card component for the driver's profile.

*   `src/hooks/`: Custom React hooks for shared logic.
    *   `use-language.tsx`: The brain behind our multi-language (English/Hindi) support.
    *   `use-toast.ts`: Manages the display of notifications (toasts).

*   `src/lib/`: Core utilities and helper functions.
    *   `firebase.ts`: Initializes and configures the connection to your Firebase project.
    *   `translations.ts`: Stores all the English and Hindi text for the app.
    *   `utils.ts`: Contains the `cn` utility for merging Tailwind CSS classes.

*   `src/functions/`: Contains the server-side Cloud Functions.
    *   `src/index.ts`: The core "No Cost Architecture" dispatch logic. Contains the Cloud Functions that trigger on new database entries to find and notify the right partners via FCM.

---

## 3. The "No Cost" Real-Time Architecture (The Nervous System)

This is the most critical part of the app. It's how all our apps talk to each other efficiently without incurring massive costs. We use a **server-centric push model** instead of a client-heavy pull model.

**The entire system is secured with granular `firestore.rules` to prevent unauthorized data access.**

### Generic Dispatch Flow (For Path, ResQ, and Cure)

*   **Step 1: User Creates a Request**
    *   A Rider/Driver creates a **new document** in the relevant collection (`rides`, `garageRequests`, `emergencyCases`) with a `pending` status. This is a single, cheap write operation.

*   **Step 2: A Cloud Function Triggers**
    *   A dedicated Cloud Function (written in `src/functions/src/index.ts`) is listening for new documents in that specific collection.
    *   **Crucially, partner apps (Driver, Mechanic, Hospital) DO NOT listen to the entire collection.** This prevents the "500 reads for 1 request" problem.

*   **Step 3: The Function Finds the Best Partners**
    *   The Cloud Function reads the request document and performs an efficient geo-query on the appropriate partner collection (`partners`, `mechanics`, `ambulances`) to find the 5-10 closest, most suitable partners.

*   **Step 4: The Function Sends Targeted Push Notifications**
    *   Using Firebase Cloud Messaging (FCM), the function sends a **private data message** directly to only those 5-10 selected partners. This is free.
    *   The partner's app receives the push notification and shows the request pop-up.

*   **Step 5: Partner Accepts & Updates Document**
    *   When a partner accepts, their app writes back to the *specific* request document, updating its status to `accepted` and adding their details.
    *   The original user's app, which is only listening to that one single document, gets the update instantly.

This architecture reduces database reads by over 99% compared to a simple listener model, making it highly scalable and cost-effective.

---

## 4. User Journeys (The "Happy Paths")

### Rider's Journey

1.  **Login:** Enters Name and Phone, verifies OTP.
2.  **Booking:** Enters Pickup & Destination OR **Triggers SOS**.
3.  **SOS Flow:** If SOS, uses the **Smart Triage** system, sees a list of nearest verified hospitals, and confirms the request.
4.  **Confirmation:** A `ride` or `emergencyCase` document is created, triggering a Cloud Function.
5.  **Partner Assigned:** The UI listens to the *single* document and updates when a Path or Cure partner accepts the FCM notification and updates the document.
6.  **Trip/Transit:** Shares OTP with the driver/paramedic to start the trip. Tracks the vehicle live on the map.
7.  **Completion:** Rates the partner after the service ends.

### Path Partner's (Driver's) Journey

1.  **Onboarding:** Navigates from `/partner-hub`. Fills a form. A `partners` document is created.
2.  **Go Online:** The app sends its live location to Firestore. It does **not** listen for all rides.
3.  **Accept Ride:** Receives a ride request via a **Push Notification (FCM)**. Accepts it, which updates the `ride` document.
4.  **Completion:** The fare is credited to their Cabzi Bank Wallet.
5.  **SOS Garage:** If needed, creates a `garageRequest` to get help from a ResQ Partner.

### ResQ Partner's (Mechanic's) Journey

1.  **Onboarding:** Navigates from `/partner-hub` and completes the ResQ onboarding form.
2.  **Go "Available":** App sends location and waits for FCM push notifications for new jobs.
3.  **Accept Job & OTP:** Accepts the job, navigates to the driver. Verifies the driver's OTP to start the service.
4.  **Generate Bill:** After service, uses the app to create a digital bill with service items and costs.
5.  **Payment:** The bill is sent to the driver's app in real-time. The driver can pay via Wallet or Cash, which completes the job cycle.

### Cure Partner's (Hospital's) Journey

1.  **Onboarding:** Completes a multi-step, professional form with hospital details, document uploads, etc. An `ambulances` document is created.
2.  **Login:** Enters Phone, verifies OTP. Redirected to the **Hospital Mission Control** dashboard (`/cure`).
3.  **Manage Fleet & Drivers:** Adds and manages their ambulance fleet and individual ambulance drivers (who get their own separate login).
4.  **Go "Available":** The hospital's status is set to online. They do not listen to the database.
5.  **Accept Case:** A new emergency request appears in their "Action Feed" (simulating an FCM push). They accept it and dispatch a specific ambulance from their fleet. This updates the `emergencyCase` document.
6.  **Patient Admitted:** Marks the case as `completed` in the system.

---

## 5. Admin Panel

The Admin Panel (`/admin`) is a powerful, internal tool built to manage the entire Cabzi CPR (Cure-Path-ResQ) ecosystem.

*   **Unified Partner Management (`/admin/partners`):** View, Approve, Reject, or Suspend all three types of partners (Path, ResQ, Cure) from a single, unified interface.
*   **Live Operations Map (`/admin/map`):** A real-time map showing the live location of all active partners and riders.
*   **Audit Trail:** View lists of all registered customers (`/admin/customers`), rides (`/admin/rides`), and emergency cases (`/admin/cure-cases`).
*   **Financial Oversight:** Dedicated "Cabzi Bank" and "Accounts" panels to manage finances and P&L statements.
*   **Support Center (`/admin/support`):** A unified dashboard to manage all support tickets from riders and partners.
