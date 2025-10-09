# Cabzi Guide: How It Works

This guide provides a complete overview of the Cabzi CPR (Cure-Path-ResQ) ecosystem, explaining the journey of each user role and the core functionalities of the platform.

---

## 1. The Rider's Journey (The Customer)

The rider's experience is designed to be simple, safe, and reliable.

### Step 1: Booking a Ride (The "Path" Partner)
- The rider enters their **Pickup** and **Destination** locations.
- The system shows fares for all available vehicle types (Bike, Auto, Cab).
- Once confirmed, the nearest **Path Partner (Driver)** is assigned.
- To start the trip, the rider shares a **4-digit OTP** with the driver.

### Step 2: Requesting Emergency Help (The "Cure" Partner)
This is the core of the Cabzi safety net.

- **Smart Triage:** In an emergency, the rider opens the app and selects the **severity** of the situation (e.g., "Critical," "Serious," "Non-Critical").
- **Find Nearest Hospital:** The app automatically detects the rider's location and shows a list of the **nearest verified Cabzi Cure Partners (Hospitals)**, sorted by distance.
- **One-Click Request:** The rider selects a hospital and confirms the request.
- **Mission Control Activated:** The request is instantly sent to the selected hospital's **Mission Control Dashboard**.
- **Ambulance Dispatched:** The hospital accepts the case and dispatches a specific ambulance from their fleet. The rider's app immediately updates to show the **live location of the incoming ambulance**, its ETA, and the paramedic's details, just like a cab ride.

---

## 2. The Path Partner's Journey (The Driver)

The Path Partner's experience is focused on maximizing earnings and providing a supportive ecosystem.

### Step 1: Onboarding
- A new partner fills out a simple onboarding form with personal, vehicle, and document details. The application is sent to the Admin panel for verification.

### Step 2: Going Online & Accepting Rides
- From their dashboard, the partner toggles their status to **"Online"**.
- They receive real-time **Ride Request Alerts** and can choose to Accept or Decline.

### Step 3: Completing a Ride
- Upon accepting, they collect the **4-digit OTP** from the rider to start the trip.
- After completion, the fare is automatically added to their **Cabzi Bank Wallet**.

### Step 4: Accessing the Ecosystem
- **Cabzi Bank:** All partners get a free digital wallet with high-interest savings and access to instant loans.
- **SOS Garage:** If their vehicle breaks down, they can use the app to request an on-demand **ResQ Partner (Mechanic)**.

---

## 3. The Cure Partner's Journey (The Hospital)

This is a B2B relationship. The hospital is our partner, using our software to manage their emergency response.

### Step 1: Professional Onboarding
- A hospital administrator completes a **multi-step onboarding process**, providing hospital registration details, department information, and uploading necessary compliance documents.

### Step 2: The Mission Control Dashboard
- Once verified, the hospital gains access to their **Cabzi Cure Mission Control Dashboard**.
- **Fleet Management:** They can add, manage, and track their entire ambulance fleet in real-time on a live map.
- **Bed Availability:** A master toggle allows them to set their "ER Full" or "Beds Available" status, which affects the emergency requests they receive.

### Step 3: Handling a Case
- A new `emergencyCase` appears on their dashboard with the patient's location and severity level.
- The system may auto-suggest the best ambulance for the job.
- The hospital staff clicks **"Accept & Dispatch"**.
- The assigned ambulance's live location is now shared with the patient.
- Upon reaching the hospital, the case is marked as "Completed".

---

## 4. The Admin's Role (The Ecosystem Architect)

The admin panel is the central hub for managing the entire CPR ecosystem.

- **Unified Partner Management:** Admins can view, approve, reject, and manage all three types of partners—**Cure (Hospitals), Path (Drivers), and ResQ (Mechanics)**—from a single, unified interface.
- **Platform Audit:** Admins can view a complete history of all rides, emergency cases, and support tickets.
- **Financial Oversight:** A dedicated panel to monitor the financial health of the platform, including Cabzi Bank operations and partner subscriptions.
