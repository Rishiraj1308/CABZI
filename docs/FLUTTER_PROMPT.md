
# Master Prompt: Build "Cabzi" - The Flutter Version

## 1. Project Vision & Core Concept

Build a modern, cross-platform (iOS & Android) ride-hailing mobile application called **"Cabzi"** using Flutter.

The core mission of Cabzi is to create a fair and transparent ecosystem for both riders and drivers in the Indian market. Its unique selling proposition (USP) is **0% commission for drivers**, who instead pay a subscription fee, and **fair, transparent fares for riders**.

The application should have a premium, trustworthy, and user-friendly feel, with a clean, modern aesthetic that performs smoothly on both platforms.

## 2. Target Audience

*   **Riders:** Individuals in Indian metro and tier-2 cities looking for affordable, reliable, and safe transportation.
*   **Partners (Drivers):** Drivers who own their vehicles (bikes, auto-rickshaws, cars) and want to maximize their earnings without paying high commissions per ride.
*   **Admin:** The Cabzi operations team responsible for verifying partners and managing the platform (this will be a separate web panel, but the Flutter app needs to interact with its data).

## 3. Tech Stack & Architecture (Flutter)

*   **Framework:** Flutter (latest stable version)
*   **Language:** Dart
*   **State Management:** **Riverpod**. Use it for dependency injection and managing the state of the app (e.g., user session, ride status, map data). This ensures the app is scalable and testable.
*   **UI:** Material Design 3. Use standard Flutter widgets and create custom, reusable widgets where necessary.
*   **Backend & Real-time:** **Firebase**. This is the most critical part.
    *   **Database:** **Firestore** for all real-time data (partner details, live locations, ride requests, etc.).
    *   **Authentication:** **Firebase Authentication** for phone number (OTP) based login.
*   **Mapping:** **`google_maps_flutter`** package for the interactive map interface.
*   **Location Services:** **`location`** or **`geolocator`** package to get the user's live location.
*   **Routing & Geocoding:** **Google Maps Platform APIs** (Directions API, Geocoding API, Places API) to get routes, calculate distance/duration, and search for addresses.
*   **Icons:** **`lucide_flutter`** package to maintain visual consistency with the brand.
*   **Fonts:** **`google_fonts`** package to use the 'Poppins' font.

## 4. UI/UX Design & Style Guide

*   **Color Palette (Define in `ThemeData`):**
    *   **Primary:** Midnight Blue (`Color(0xFF191970)`)
    *   **Background:** Light Lavender (`Color(0xFFE6E6FA)`)
    *   **Accent/CTA:** Electric Yellow (`Color(0xFFFFFF00)`)
    *   **Text on Accent:** Black (`Colors.black`)
*   **Typography:**
    *   **Font Family:** Use `GoogleFonts.poppins()` for all text styles.
    *   **Headings:** Bold weight.
    *   **Body:** Normal weight.
*   **Component Styling:**
    *   **Rounding:** Use a consistent, generous `BorderRadius.circular(12.0)` on `Card`s, `Button`s, etc.
    *   **Shadows:** Use `BoxShadow` or `Card`'s `elevation` property to lift components off the background.
    *   **Buttons:** Use `ElevatedButton` for primary call-to-actions with the accent color.

## 5. Core Real-Time Logic (Firebase & Riverpod)

This is the "nervous system" of the app. Use Riverpod `StreamProvider` to listen to Firestore collections in real-time.

**Collection: `rides`**

*   **Step 1: Rider Books a Ride:**
    *   The Rider app writes a **new document** to the `rides` collection.
    *   The document's initial `status` is `searching`. It contains all ride details (pickup/destination `GeoPoint`, fare, etc.).
*   **Step 2: Partner Listens for Rides:**
    *   The Partner's dashboard screen will use a `StreamProvider` to listen to the `rides` collection for documents where `status == 'searching'`.
    *   When a new ride appears, the UI shows a ride request pop-up (`AlertDialog` or a custom overlay).
*   **Step 3: Partner Accepts Ride:**
    *   When the partner accepts, the app **updates the same document** in Firestore.
    *   It sets the `status` to `accepted` and adds the driver's details.
*   **Step 4: Rider Gets Notified:**
    *   The Rider's app, also subscribed to that document via a `StreamProvider`, sees the status change instantly.
    *   The Rider's UI automatically updates to show the assigned driver's details and live location.

## 6. Key Features & Screen-by-Screen Breakdown

### Role: Rider

*   **Screen 1: Rider Home/Booking:**
    *   **UI:** A full-screen `GoogleMap` widget. A `DraggableScrollableSheet` at the bottom.
    *   **Functionality:**
        1.  Sheet contains "Pickup" and "Destination" `TextField`s. Tapping them opens a search screen using the Places API.
        2.  After locations are set, call the Directions API to get the route polyline and draw it on the map.
        3.  Calculate fares for different vehicle types (Bike, Auto, Cab) and display them in a `ListView` inside the sheet.
        4.  "Confirm Ride" button is at the bottom.
*   **Screen 2: Ride Status:**
    *   **UI:** The UI is stateful and changes based on the ride `status` from Firestore.
    *   **States:**
        *   `searching`: Show a loading animation (like a Lottie animation).
        *   `accepted`: Show the driver's `Avatar`, name, vehicle, rating, and ETA. Show the driver's live marker moving on the map. Show the OTP.
        *   `in-progress`: Show the trip route on the map.
        *   `completed`: Show a "Payment & Rating" screen.
*   **Screen 3: Authentication:**
    *   A simple screen with a `TextField` for a phone number. Use Firebase Phone Authentication to handle the OTP flow.

### Role: Partner (Driver)

*   **Screen 1: Partner Onboarding:**
    *   A multi-step form (`Stepper` widget) to collect Name, Phone, Vehicle Details, and Document numbers.
    *   On submission, create a new document in the `partners` collection with `status: 'pending_verification'`.
*   **Screen 2: Partner Dashboard:**
    *   **UI:** A `Scaffold` with a main content area and a `Drawer` for navigation.
    *   **Functionality:**
        *   An "Online/Offline" `Switch` in the `AppBar`.
        *   When Online, listen for ride requests. An `AlertDialog` should pop up for a new request.
        *   Dashboard body shows `Card`s with key stats: Earnings, Rides Today, Rating.
*   **Screen 3: Partner Profile:**
    *   **UI:** A custom-designed digital "ID Card" widget.
    *   **Functionality:** Fetches and displays the partner's verified details from their document in the `partners` collection.

---
This prompt provides a complete blueprint. A developer can use this to understand the app's requirements, architecture, and user flow, and start building the Flutter version of Cabzi.
