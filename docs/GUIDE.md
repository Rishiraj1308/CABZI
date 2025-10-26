# Curocity Guide: How It Works

This guide provides a complete overview of the Curocity CPR (Cure-Path-ResQ) ecosystem, explaining the journey of each user role and the core functionalities of the platform.

---

## 1. The Rider's Journey (The Customer)

The rider's experience is designed to be simple, safe, and reliable.

### Step 1: Booking a Ride (The "Path" Partner)
- The rider enters their **Pickup** and **Destination** locations.
- The system shows fares for all available vehicle types (Bike, Auto, Cab).
- Once confirmed, the nearest **Path Partner (Driver)** is assigned.
- To start the trip, the rider shares a **4-digit OTP** with the driver.

### Step 2: Accessing Healthcare (The "Cure" Partner)
This is the core of the Curocity safety net, offering a complete healthcare solution.

**A. Emergency SOS:**
- **Smart Triage:** In an emergency, the rider selects the **severity** of the situation (e.g., "Critical," "Serious," "Non-Critical").
- **Find Nearest Hospital:** The app automatically finds the nearest verified **Curocity Cure Partners (Hospitals)**.
- **One-Click Request:** The rider selects a hospital and confirms the request, which is instantly sent to the hospital's **Mission Control Dashboard**.
- **Ambulance Dispatched:** The hospital accepts the case and dispatches an ambulance. The rider's app shows the **live location of the incoming ambulance**, its ETA, and the paramedic's details.

**B. Doctor Appointments:**
- **Find a Doctor:** For non-emergency needs, the rider can browse and search for specialists at partner hospitals.
- **Book a Slot:** They can view doctor profiles, check their availability, and book a convenient appointment time directly through the app.
- **Get Confirmation:** The request is sent to the hospital's dashboard, and once confirmed, the appointment is added to the rider's schedule.

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
- After completion, the fare is automatically added to their **Curocity Bank Wallet**.

### Step 4: Accessing the Ecosystem
- **Curocity Bank:** All partners get a free digital wallet with high-interest savings and access to instant loans.
- **SOS Garage:** If their vehicle breaks down, they can use the app to request an on-demand **ResQ Partner (Mechanic)**.

---

## 3. The Cure Partner's Journey (The Hospital)

This is a B2B relationship. The hospital is our partner, using our software to manage their emergency response and patient appointments.

### Step 1: Professional Onboarding
- A hospital administrator completes a **multi-step onboarding process**, providing hospital registration details, department information, and uploading necessary compliance documents.

### Step 2: The Mission Control Dashboard
- Once verified, the hospital gains access to their **Curocity Cure Mission Control Dashboard**.
- **Fleet Management:** They can add, manage, and track their entire ambulance fleet in real-time on a live map.
- **Bed Availability:** A master toggle allows them to set their "ER Full" or "Beds Available" status.
- **Manage Doctors:** They can add doctors to their roster, who then get their own portal to manage schedules.

### Step 3: Handling a Case or Appointment
- A new `emergencyCase` or `appointmentRequest` appears on their dashboard.
- The hospital staff can **"Accept & Dispatch"** an ambulance for emergencies or **"Confirm"** a doctor's appointment.
- All status updates are reflected in the patient's app in real-time.

---

## 4. The Admin's Role (The Ecosystem Architect)

The admin panel is the central hub for managing the entire CPR ecosystem.

- **Unified Partner Management:** Admins can view, approve, reject, and manage all three partner types—**Cure (Hospitals), Path (Drivers), and ResQ (Mechanics)**—from a single, unified interface.
- **Platform Audit:** Admins can view a complete history of all rides, emergency cases, and support tickets.
- **Financial Oversight:** A dedicated panel to monitor the financial health of the platform, including Curocity Bank operations and partner subscriptions.