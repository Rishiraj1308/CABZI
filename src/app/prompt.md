# Master Prompt: Build "Cabzi" - India's First CPR Ecosystem

## 1. Project Vision & Core Concept

Build a modern, full-stack, multi-role web application called **"Cabzi"**.

The core mission is to create India's first unified **CPR (Cure-Path-ResQ) ecosystem**, integrating life-saving emergency response and roadside assistance with a fair and transparent ride-hailing platform.

*   **PATH (Ride-Hailing):** A 0% commission model for drivers, who pay a subscription fee. This provides fair fares for riders.
*   **CURE (Emergency Response):** A B2B platform for hospitals to manage their ambulance fleet and receive real-time emergency cases.
*   **ResQ (Roadside Assistance):** A network of verified mechanics to provide on-demand help to our partners.

The application's identity is a **"FinTech company disguised as a mobility platform"**. The core product is the partner's financial well-being, delivered through "Cabzi Bank".

## 2. Target Audience

*   **Riders:** Urban and semi-urban users seeking reliable, safe, and affordable transportation, with an integrated safety net.
*   **Path Partners (Drivers):** Gig-economy drivers dissatisfied with high commissions and seeking financial stability.
*   **Cure Partners (Hospitals):** Hospitals looking to digitize and streamline their emergency response and ambulance dispatch operations.
*   **ResQ Partners (Mechanics):** Freelance mechanics or garages seeking a steady stream of service jobs.
*   **Admin Team:** The Cabzi operations team managing the entire CPR ecosystem.

## 3. Tech Stack & Architecture

*   **Framework:** Next.js (with App Router)
*   **Language:** TypeScript
*   **UI:** ShadCN UI components.
*   **Styling:** Tailwind CSS. Use HSL variables for a modern, themeable design (Primary: Teal, Accent: Yellow).
*   **Backend & Real-time:** **Firebase Firestore**. This is the real-time engine for the entire app.
*   **Authentication:** Firebase Authentication (Phone OTP).
*   **Serverless Logic:** Firebase Cloud Functions for the "No Cost" dispatch architecture (using FCM Push Notifications).
*   **Mapping:** Leaflet.js with OpenStreetMap tiles.
*   **Routing & Geocoding:** OSRM & Nominatim APIs.
*   **Generative AI:** Genkit for AI-powered features.

## 4. UI/UX Design & Style Guide

*   **Color Palette:**
    *   **Primary:** A deep, trustworthy teal (`hsl(180, 35%, 25%)`).
    *   **Background:** A very light mint cream (`hsl(180, 50%, 98%)`) for light mode.
    *   **Accent:** A vibrant, energetic electric yellow (`hsl(60, 100%, 50%)`).
*   **Typography:** Poppins font family.
*   **Component Styling:**
    *   Generous rounding (`rounded-lg`, `rounded-full`).
    *   Subtle shadows (`shadow-md`) to lift components.
    *   Use of `lucide-react` for all icons.

## 5. Core Real-Time Logic (The "No Cost" Architecture)

The app's nervous system relies on a **server-centric push model**, not a client-pull model, to save costs and scale efficiently.

1.  **User Creates Request:** A user (Rider or Partner) creates a new document in a collection (`rides`, `garageRequests`, `emergencyCases`) with a `pending` status.
2.  **Cloud Function Triggers:** A dedicated Cloud Function (in `functions/src/index.ts`) listens for new documents in that collection.
3.  **Function Finds Partners:** The function performs an efficient geo-query to find the 5-10 closest, most suitable partners.
4.  **Targeted Push Notifications (FCM):** The function sends a private data message via FCM directly to *only* those selected partners. Partner apps **DO NOT** listen to the entire collection.
5.  **Partner Accepts & Updates Document:** The partner who accepts writes back to the *specific* request document, changing its status.
6.  **User Gets Instant Update:** The original user's app, listening only to that single document, gets the update instantly.

## 6. Key Features & User Flows

### Role: Rider (`/rider`)

*   **Booking:** Full-screen map, bottom sheet for pickup/destination. Shows fare estimates for Bike, Auto, Cab, and **Cabzi Pink** (women-only service).
*   **Ride Status:** UI updates for "Searching", "Partner on the way" (with live tracking, ETA, OTP), "In Progress", and "Completed".
*   **SOS Triage:** A critical safety feature. The rider selects the severity of a medical emergency, sees a list of nearest verified hospitals (Cure Partners), and can dispatch an ambulance directly to their location, with live tracking.

### Role: Path Partner (Driver) (`/driver`)

*   **Onboarding:** Simple form, including an opt-in for **Cabzi Pink**.
*   **Dashboard:** Map view with an "Online/Offline" toggle. Receives ride requests via FCM push notifications.
*   **Cabzi Bank:** A full-fledged FinTech suite.
    *   **Wallet:** Instant credit of fares.
    *   **Payments:** UPI Send/Receive via QR code.
    *   **Instant Loans:** Pre-approved credit for emergencies.
    *   **Savings:** High-interest savings account.
*   **SOS Garage:** A functional feature to request on-demand help from a ResQ Partner for issues like a flat tyre.

### Role: ResQ Partner (Mechanic) (`/mechanic`)

*   **Onboarding:** Multi-step form to select services offered (e.g., Puncture, Jump-start).
*   **Dashboard:** Map view with an "Available/Unavailable" toggle. Receives job requests via FCM.
*   **Job Lifecycle:**
    1.  Accept job request.
    2.  Navigate to the stranded driver.
    3.  Verify driver's OTP to start the service.
    4.  Generate a digital bill with service items.
    5.  Receive payment in Cabzi Bank wallet.

### Role: Cure Partner (Hospital) (`/cure`)

*   **Onboarding:** A professional, multi-step B2B wizard to register the hospital, its details, and documents.
*   **Mission Control Dashboard:**
    *   **Fleet Management:** Add, manage, and track the hospital's own ambulance fleet in real-time on a map.
    *   **Bed Availability:** Manage and display live ER bed count.
    *   **Action Feed:** A real-time feed where new emergency requests (simulated as FCM pushes) appear as actionable alert cards.
    *   **Dispatch:** Accept a case and dispatch a specific, available ambulance from the fleet.
*   **Driver Management:** Add/manage individual ambulance drivers who get their own separate login.

### Role: Admin (`/admin`)

*   **Unified Partner Management:** A single, powerful interface to Approve, Reject, Suspend, or Delete all three partner types (Path, ResQ, Cure).
*   **Live Operations Map:** A "God's-eye view" of all active entities (drivers, mechanics, ambulances, riders) on a single map.
*   **Financial Oversight:** Dedicated panels for Cabzi Bank, Accounts (Expense Ledger), and a full Audit Report (P&L statements).
*   **Support Center:** A unified dashboard to manage all support tickets from riders and partners.

## 7. Non-Functional Requirements

*   **Internationalization (i18n):** Full support for English and Hindi using a context-based provider.
*   **Responsiveness:** The UI must be fully responsive for mobile and desktop.
*   **Security:** Role-based access control (RBAC) in the Admin panel. Secure PIN for wallet transactions.
*   **Code Quality:** Clean, well-organized, and feature-sliced code structure.
