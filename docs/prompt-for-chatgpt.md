
# Master Prompt: Build "Cabzi" - A Fair Ride-Hailing App

## 1. Project Vision & Core Concept

Build a modern, full-stack ride-hailing web application called **"Cabzi"**.

The core mission of Cabzi is to create a fair and transparent ecosystem for both riders and drivers in the Indian market. Its unique selling proposition (USP) is **0% commission for drivers**, who instead pay a subscription fee, and **fair, transparent fares for riders**.

The application should have a premium, trustworthy, and user-friendly feel, with a clean, modern aesthetic. The primary language is English, with full support for Hindi.

## 2. Target Audience

*   **Riders:** Individuals in Indian metro and tier-2 cities looking for affordable, reliable, and safe transportation.
*   **Partners (Drivers):** Drivers who own their vehicles (bikes, auto-rickshaws, cars) and want to maximize their earnings without paying high commissions per ride.
*   **Admin:** The Cabzi operations team responsible for verifying partners and managing the platform.

## 3. Tech Stack & Architecture

*   **Framework:** Next.js (with App Router)
*   **Language:** TypeScript
*   **UI:** ShadCN UI components.
*   **Styling:** Tailwind CSS.
*   **Database & Real-time:** Firebase Firestore. This is CRITICAL for the real-time communication between riders and drivers.
*   **Authentication:** Firebase Authentication (Phone OTP).
*   **Mapping:** Use the Leaflet library for the map interface.
*   **Routing & Geocoding:** Use the public OSRM API for calculating routes (distance, duration) and the Nominatim API for converting addresses to coordinates (geocoding).

## 4. UI/UX Design & Style Guide

*   **Color Palette:**
    *   **Primary:** A deep, trustworthy teal (`hsl(180, 35%, 25%)`).
    *   **Background:** A very light mint cream (`hsl(180, 50%, 98%)`) for light mode, and a dark teal (`hsl(180, 35%, 8%)`) for dark mode.
    *   **Accent:** A vibrant, energetic electric yellow (`hsl(60, 100%, 50%)`). Used for primary CTAs like "Confirm Ride".
*   **Typography:**
    *   **Font:** Poppins.
    *   **Brand Name/Logo:** Use `font-extrabold` with a text-gradient animation.
*   **Component Styling:**
    *   **Rounding:** Generous rounding on all components (`rounded-lg`, `rounded-full`). Default radius should be `0.8rem`.
    *   **Shadows:** Use subtle `shadow-sm` or `shadow-md` to lift components like cards off the background. Important elements like the "Pro" subscription plan card should have a more pronounced `shadow-lg`.
    *   **Glow Effect:** The primary accent color buttons should have a subtle glow on hover to make them feel interactive (`btn-glow` class).
*   **Icons:** Use the `lucide-react` library.

## 5. Core Real-Time Logic (The "Nervous System")

The most important part of the app is the real-time communication using **Firebase Firestore**.

**Collection: `rides`**

*   **Step 1: Rider Books a Ride:** The Rider app creates a **new document** in the `rides` collection. This document's initial `status` is set to **`searching`**. It contains all ride details (pickup, destination, fare, etc.).
*   **Step 2: Partner Listens for Rides:** The Partner app must use Firestore's `onSnapshot` listener to listen for any new documents in the `rides` collection where `status` is `searching`. When a new ride appears, show the ride request pop-up to the partner.
*   **Step 3: Partner Accepts Ride:** When the partner accepts, their app **updates the exact same document** in the `rides` collection. It changes the `status` to **`accepted`** and adds the driver's details.
*   **Step 4: Rider Gets Notified:** Because the Rider app is also listening to that same document with `onSnapshot`, it sees the status change in real-time and updates its UI to show the assigned driver's details.

This publish-subscribe model is the key to making the app work.

## 6. Key Features & User Flows

### Role: Rider

*   **Home/Booking Page:**
    *   A full-screen map interface (use Leaflet).
    *   A bottom sheet for entering "Pickup" and "Destination".
    *   After entering locations, use OSRM & Nominatim APIs to fetch the route and calculate fares for all vehicle types.
    *   Display vehicle options (Bike, Auto, Cab) with their calculated fares and ETAs.
    *   Allow selection of a vehicle type and confirmation of the ride.
*   **Ride Status Flow:**
    *   After booking, update UI to show: "Finding Partner" (with a Lottie animation), "Partner on the way", "Ride in Progress", and "Ride Completed".
    *   Display driver details (name, photo, vehicle, rating) when a partner is assigned.
    *   Include a "Safety Toolkit" with SOS and "Share Ride" options.
    *   A simple star-rating system at the end of the ride.
*   **Authentication:** Use Firebase Auth for OTP login with Full Name and Phone Number.

### Role: Partner (Driver)

*   **Onboarding:**
    *   A form to collect Name, Phone Number, Vehicle Type, Vehicle Number, and other document details.
    *   On submission, create a new document in the `partners` collection in Firestore with a `status` of `pending_verification`.
*   **Dashboard:**
    *   Display key stats: Earnings, Rides Today, Rating.
    *   An "Online/Offline" toggle switch. When online, the app should listen to the `rides` collection.
    *   A real-time ride request `AlertDialog` when a new ride is found.
*   **Profile Page:**
    *   A digital "ID Card" view showing verified personal and vehicle details fetched from their document in the `partners` collection.

### Role: Admin

*   **Admin Panel:**
    *   A secure dashboard.
    *   A table view of all partners from the `partners` collection in Firestore.
    *   Display columns: Name, Contact, Vehicle, Status, Onboarded On.
    *   Provide "Approve" or "Reject" buttons that update the `status` field of the corresponding partner document in Firestore.

## 7. Non-Functional Requirements

*   **Internationalization (i18n):** The app must support English and Hindi. Use a context-based provider (`useLanguage`) to manage translations.
*   **State Management:** Use `localStorage` for session/language persistence. Use `useState` and `useEffect` for component state.
*   **Responsiveness:** The UI must be fully responsive for mobile and desktop.
*   **Code Quality:** The code should be clean, well-organized, and follow modern React/Next.js best practices.
