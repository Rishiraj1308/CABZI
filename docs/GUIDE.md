# Curocity Guide: How It Works

This guide provides a complete overview of the Curocity CPR (Cure-Path-ResQ) ecosystem, explaining the journey of each user role and the core functionalities of the platform.

---

## 1. The Rider's Journey (The Customer)

The rider's experience is designed to be simple, safe, and reliable, giving them access to the entire CPR ecosystem from a single app.

### A. Booking a Ride (The "Path")
- The rider enters their **Pickup** and **Destination** locations.
- The system shows fares for all available vehicle types (Bike, Auto, Cab), including "Curocity Pink" for women.
- Once confirmed, the nearest **Path Partner (Driver)** is assigned.
- To start the trip, the rider shares a **4-digit OTP** with the driver for verification.

### B. Requesting Roadside Assistance (The "ResQ")
- If a rider's own vehicle breaks down, they can use the "ResQ" service.
- They select the issue (e.g., "Flat Tyre," "Battery Jump-Start").
- The nearest available **ResQ Partner (Mechanic)** is notified and dispatched to their location.
- The rider can track the mechanic's arrival in real-time.

### C. Accessing Healthcare (The "Cure")
This is the core of the Curocity safety net, offering a complete healthcare solution.

**1. Emergency SOS:**
- **Smart Triage:** In an emergency, the rider selects the **severity** of the situation ("Critical," "Serious," "Non-Critical").
- **Find Nearest Hospital:** The app automatically finds the nearest verified **Curocity Cure Partners (Hospitals)**.
- **One-Click Request:** The rider confirms the request, which is instantly sent to the hospital's **Mission Control Dashboard**.
- **Ambulance Dispatched:** The hospital accepts the case and dispatches an ambulance. The rider's app shows the **live location of the incoming ambulance**, its ETA, and the paramedic's details.

**2. Doctor Appointments:**
- **Find a Doctor:** For non-emergency needs, the rider can browse and search for specialists at partner hospitals.
- **Book a Slot:** They can view doctor profiles, check their availability, and book a convenient appointment time directly through the app.

---

## 2. The Path Partner's Journey (The Driver)

The Path Partner's experience is focused on maximizing earnings and providing a supportive ecosystem.

- **Onboarding:** A new partner fills out a simple onboarding form. The application is sent to the Admin panel for verification.
- **Going Online:** From their dashboard, the partner toggles their status to **"Online"** to start receiving ride requests via push notification.
- **Completing a Ride:** They accept a ride, collect the **OTP** from the rider to start the trip, and receive their full fare instantly in their **Curocity Bank Wallet** upon completion.
- **Ecosystem Access:** All partners get a free digital wallet with high-interest savings and access to instant loans. If their vehicle breaks down, they can use the ResQ service to request a mechanic.

---

## 3. The ResQ Partner's Journey (The Mechanic)

The ResQ Partner provides on-demand assistance, turning their skills into a reliable income stream.

- **Onboarding:** A mechanic or garage owner signs up, selecting the services they offer (e.g., Puncture Repair, Towing).
- **Accepting a Job:** They receive real-time **Service Request Alerts** with the user's location and issue, and can choose to Accept or Decline.
- **Service & Billing:** Upon accepting, they navigate to the user, verify an OTP, and perform the service. They then generate a **digital, itemized bill** directly in their app for the user to approve and pay.
- **Instant Payout:** The service fee is credited instantly to their **Curocity Bank Wallet**.

---

## 4. The Cure Partner's Journey (The Hospital)

This is a B2B relationship. The hospital is our partner, using our software to manage their emergency response and patient appointments.

- **Professional Onboarding:** A hospital administrator completes a **multi-step onboarding process**, providing hospital registration details and uploading compliance documents.
- **The Mission Control Dashboard:**
    - **Fleet Management:** Hospitals can add, manage, and track their entire ambulance fleet in real-time on a live map.
    - **Bed Availability:** A master toggle allows them to set their "ER Full" or "Beds Available" status.
    - **Manage Doctors:** They can add doctors to their roster, who then get their own portal to manage schedules.
- **Handling a Case:** A new `emergencyCase` or `appointmentRequest` appears on their dashboard. The hospital staff can **"Accept & Dispatch"** an ambulance for emergencies or **"Confirm"** a doctor's appointment.

---

## 5. The Admin's Role (The Ecosystem Architect)

The admin panel is the central hub for managing the entire CPR ecosystem.

- **Unified Partner Management:** Admins can view, approve, reject, and manage all three partner types—**Cure (Hospitals), Path (Drivers), and ResQ (Mechanics)**—from a single, unified interface.
- **Platform Audit:** Admins can view a complete history of all rides, emergency cases, and support tickets.
- **Financial Oversight:** A dedicated panel to monitor the financial health of the platform, including Curocity Bank operations and partner subscriptions.