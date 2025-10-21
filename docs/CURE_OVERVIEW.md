# Cabzi CURE: The Partner Workflow & Technical Architecture

This document provides a comprehensive overview of the **Cabzi CURE** ecosystem, designed for our hospital and clinic partners. It details the end-to-end workflow, from initial onboarding to managing live emergency cases, daily operations, and the underlying technology that powers it all.

---

## 1. Onboarding: Joining the Network

The journey begins with a professional, multi-step registration process designed for medical institutions.

*   **Step 1: Business Details:** The hospital provides its official name, registration number, and category (e.g., Private, Specialty).
*   **Step 2: Location Setup:** Using an interactive map, the hospital pins its exact location for accurate ambulance dispatch and patient navigation.
*   **Step 3: Contact & Legal:** The admin enters key contact person details and provides essential legal information like Business PAN and optional GST.
*   **Step 4: Submission & Verification:** After reviewing all details, the application is submitted. Our admin team verifies the documents, and upon approval, the hospital's Mission Control dashboard is activated.

---

## 2. The Mission Control Dashboard (`/cure`)

This is the central command center for all hospital operations on the Cabzi platform.

### A. Master Controls & Availability
*   **Go Online/Offline:** A master switch allows the hospital to start or stop accepting new emergency requests from the network.
*   **Bed Availability:** A simple interface to update the total number of ER beds and the current number of occupied beds, giving a live count of available beds. This information is crucial for routing patients effectively.

### B. Action Feed: Real-time Case Management
*   **Emergency Feed:** This is the live pulse of the dashboard. New, incoming emergency requests appear here as prominent, pulsing alert cards. Each card shows the patient's name, the severity of the case (Critical, Serious, etc.), and their location.
*   **Accept & Dispatch:** With one click, the hospital staff can accept a case. A dialog then appears, showing all **available ambulances** from their fleet, allowing them to dispatch the most suitable vehicle instantly.
*   **Reject:** If the hospital cannot take the case, they can reject it. Our "Smart Cascade" logic automatically and instantly re-assigns the request to the next nearest hospital, ensuring no patient is left waiting.
*   **Appointment Queue:** A separate tab shows all incoming doctor appointment requests from riders, with options to "Confirm" or "Reschedule." Recurring appointments are clearly marked.

### C. Live Map: The "God's-Eye View"
*   A real-time map displays the live GPS location of all ambulances in the hospital's fleet.
*   Markers are color-coded based on status:
    *   **Green:** Available
    *   **Red:** On-Duty for an active case
    *   **Gray:** In Maintenance
*   When a case is active, the map automatically shows the ambulance, the patient's location, and the optimal route.

### D. Fleet & Staff Management

This section provides a unified interface to manage both ambulance drivers and doctors.

#### **Ambulance Fleet & Drivers:**
*   **Add Ambulances:** A simple form to add new vehicles to the fleet, specifying their type (BLS, ALS, Cardiac) and assigning a verified driver.
*   **Add Ambulance Drivers:** A secure form to register new ambulance drivers. The system automatically generates a unique **Partner ID** and a temporary **Password** for each driver, which they can use to log into their own dedicated portal.

#### **Doctor Management:**
*   **Add Doctors:** A professional form to add doctors to the hospital's roster, including their name, specialization, qualifications, and years of experience.
*   **Generate Doctor Credentials:** For each doctor added, the system automatically creates a unique **Doctor ID** and a temporary **Password**. The hospital admin shares these credentials with the doctor, allowing them to log into their own secure Doctor Portal.
*   **Manage Staff:** View a complete list of all registered ambulance drivers and doctors, their assigned vehicles/departments, and their current status.

---

## 3. The Ambulance Driver Portal (`/ambulance`)

Every driver added by the hospital gets their own secure login and a simplified dashboard.

*   **Pre-Duty Checklist:** Before starting their shift, drivers must complete a customizable checklist (e.g., "Oxygen Cylinder Full," "Defibrillator Charged") to ensure vehicle readiness.
*   **Assigned Case View:** Once dispatched, the driver's dashboard shows only their active case, including patient details, location, and a "Navigate" button that opens Google Maps.
*   **Status Updates:** The driver can update their status in real-time:
    1.  "Arrived at Patient"
    2.  "Verify Patient OTP & Start Transit"
    3.  "Case Completed (Arrived at Hospital)"
*   These updates are reflected instantly on both the hospital's and the patient's apps.

---

## 4. The Doctor's Portal (`/doctor`)

Every doctor added by the hospital gets their own secure login to manage their schedule and consultations.

*   **View Schedule:** A clean dashboard view showing all upcoming appointments for the day.
*   **Appointment Management:** Doctors can view patient details for their confirmed appointments.
*   **Manage Availability (Future Scope):** Doctors will be able to set their own available time slots, which will automatically be reflected in the rider's booking interface.

---

## 5. Financials: Subscriptions & Payouts

*   **Subscription Management (`/cure/subscription`):** A dedicated page to view and upgrade subscription plans. It clearly lists the features of each plan and provides company bank details for payment.
*   **Billing & Payouts (`/cure/billing`):** A transparent financial ledger showing all earnings from completed ambulance services and doctor consultations, and tracking the total amount to be paid out by Cabzi.

---

## 6. The Technical Architecture

### Tech Snapshot

| Layer                       | Tech Stack                                       |
| --------------------------- | ------------------------------------------------ |
| **Frontend**                | Next.js (Web)                                    |
| **Backend**                 | Firebase Cloud Functions                         |
| **Database**                | Firestore (Real-time)                            |
| **Authentication**          | Firebase Auth (Email & Password, Phone OTP)      |
| **Notifications**           | Firebase Cloud Messaging (FCM)                   |
| **Maps & Geolocation**      | Leaflet.js, OpenStreetMap, OSRM API              |
| **Storage**                 | Firebase Storage (for document uploads)          |
| **Hosting**                 | Firebase Hosting                                 |
| **Scheduled Jobs**          | Firebase Cloud Scheduler                         |

### Data Flow Snapshot: How Everyone Stays in Sync

The entire ecosystem is built on a real-time, event-driven architecture powered by Firestore.

*   **Hospital dashboard updates** → instantly reflect on the patient's and driver's apps.
*   **Driver status changes** (e.g., "Arrived at Patient") are immediately visible on the hospital's dashboard and the patient's app.
*   **Appointment confirmations** from the hospital instantly sync with the doctor's and patient's schedules.

### Security & Access Control

The platform is designed with security and compliance as a top priority.

*   All portals (Hospital, Doctor, Ambulance) are protected by **role-based Firebase Authentication**.
*   Each user's access is **strictly scoped** to their assigned data. Doctors can only see their appointments, drivers can only see their active case, and hospital admins can only manage their own fleet and staff. This ensures data privacy and HIPAA compliance.

### Notifications & Communication Layer

Real-time alerts are the nervous system of the CURE platform, powered by Firebase Cloud Messaging (FCM).

*   **Hospitals** get private, targeted notifications for new emergency cases.
*   **Drivers** receive instant alerts for their assigned case.
*   **Doctors** get notified about new appointment requests and confirmations.
*   **Patients** receive real-time status updates, from ambulance dispatch to arrival.

### Analytics & Reports (Future Scope)

The `/cure/analytics` module (coming soon) will provide our CURE partners with powerful data-driven insights, including:

*   **Average emergency response times** by zone and time of day.
*   Heatmaps of emergency case locations.
*   Doctor performance metrics and patient feedback.
*   Ambulance fleet utilization graphs and maintenance alerts.

This comprehensive workflow ensures that our CURE partners have a powerful, intuitive, and complete toolset to manage their emergency response and consultation services efficiently and professionally.
