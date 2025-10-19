# Cabzi CURE: The Complete Partner Workflow Guide

This document provides a comprehensive overview of the **Cabzi CURE** ecosystem, designed for our hospital and clinic partners. It details the end-to-end workflow, from initial onboarding to managing live emergency cases and daily operations.

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
*   **Appointment Queue:** A separate tab shows all incoming doctor appointment requests from riders, with options to "Confirm" or "Reschedule". Recurring appointments are clearly marked.

### C. Live Map: The "God's-Eye View"
*   A real-time map displays the live GPS location of all ambulances in the hospital's fleet.
*   Markers are color-coded based on status:
    *   **Green:** Available
    *   **Red:** On-Duty for an active case
    *   **Gray:** In Maintenance
*   When a case is active, the map automatically shows the ambulance, the patient's location, and the optimal route.

### D. Fleet & Driver Management
*   **Add Ambulances:** A simple form to add new vehicles to the fleet, specifying their type (BLS, ALS, Cardiac) and assigning a verified driver.
*   **Add Drivers:** A secure form to register new ambulance drivers. The system automatically generates a unique **Partner ID** and a temporary **Password** for each driver, which they can use to log into their own dedicated portal.
*   **Manage Staff:** View a complete list of all registered drivers, their assigned vehicles, and their current status.

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

## 4. Financials: Subscriptions & Payouts

*   **Subscription Management (`/cure/subscription`):** A dedicated page to view and upgrade subscription plans. It clearly lists the features of each plan and provides company bank details for payment.
*   **Billing & Payouts (`/cure/billing`):** A transparent financial ledger showing all earnings from completed ambulance services and tracking the total amount to be paid out by Cabzi.

This comprehensive workflow ensures that our CURE partners have a powerful, intuitive, and complete toolset to manage their emergency response services efficiently and professionally.