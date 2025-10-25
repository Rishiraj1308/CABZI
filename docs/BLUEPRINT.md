# Curocity: The Technical Blueprint

## 1. Core Mission

India ka pehla complete mobility, safety, aur life-saving ecosystem.

Goal: Fair, transparent, aur scalable platform for Riders, Drivers (Path), Mechanics (ResQ), and Hospitals (Cure).

## 2. Tech Stack

Frontend: Next.js (App Router), React, TypeScript

UI: ShadCN UI + Tailwind CSS + Lucide Icons + Lottie (animations)

Backend: Firebase (Platform-as-a-Service)

Database: Firestore (NoSQL, document-based)

Auth: Firebase Auth (Phone OTP)

Serverless Logic: Firebase Cloud Functions

Push Notifications: Firebase Cloud Messaging (FCM)

Mapping: Leaflet + OpenStreetMap

Routing/Geocoding: OSRM + Nominatim API

## 3. Directory Structure & Components

`src/app/` → core app router

- `(unauthenticated)/` → login page
- `admin/` → admin panel (dashboard, partners, map, etc.)
- `driver/` → Path partner dashboard
- `rider/` → Rider dashboard
- `mechanic/` → ResQ partner dashboard
- `cure/` → Hospital dashboard (Mission Control)
- `ambulance/` → Ambulance driver-specific dashboard
- `partner-hub/` → central onboarding page

**Components (`src/components`)**

- Reusable UI components (`ui/`)
- `brand-logo.tsx` → logo
- `live-map.tsx` → interactive Leaflet map
- `driver-id-card.tsx` → driver profile card

**Hooks (`src/hooks/`)**

- `use-language.tsx` → multi-language support
- `use-toast.ts` → notifications

**Lib (`src/lib/`)**

- `firebase.ts` → Firebase initialization
- `translations.ts` → English/Hindi texts
- `utils.ts` → helper functions

**Functions (`src/functions/`)**

- `index.ts` → “No Cost Architecture”: server-centric dispatch via Cloud Functions & FCM

## 4. No Cost Real-Time Architecture

- Rider/Driver creates a request → single Firestore write
- Cloud Function triggers → listens for new docs only
- Geo-query finds closest 5-10 partners → avoids full collection listens
- Sends targeted FCM push to partners → free
- Partner accepts → updates single request doc, Rider app instantly sees update

**Impact:**

- 99% fewer reads, scalable & cost-efficient.

## 5. User Flows

**Rider:**

1.  Login → Name + Phone OTP
2.  Book ride / SOS → create `ride` / `emergencyCase`
3.  Cloud Function triggers → assigns partner
4.  Trip → OTP verification, live map
5.  Completion → rating

**Path Partner (Driver):**

1.  Onboarding → `partners` doc creation
2.  Go Online → send live location
3.  Accept Ride → via FCM
4.  Trip → OTP verification
5.  Completion → fare credited to Curocity Wallet

**ResQ Partner (Mechanic):**

- Onboarding, go "Available", accept `garageRequest`, generate digital bill

**Cure Partner (Hospital):**

1.  Onboarding → create `ambulances` doc
2.  Login → Mission Control dashboard
3.  Manage fleet & drivers
4.  Go "Available"
5.  Accept emergency cases → dispatch ambulance
6.  Patient admitted → mark completed

**Admin Panel:**

- Unified partner management, live map, audit trail, financial oversight, support tickets

## 6. Key Takeaways

- Highly modular structure → clean separation of user roles & components
- Server-centric push model → drastically reduces Firestore reads & costs
- Scalable for India-wide deployment → can handle millions of users without huge costs
- Granular security → Firestore rules prevent unauthorized access
- Professional partner onboarding → multi-step forms & document uploads
