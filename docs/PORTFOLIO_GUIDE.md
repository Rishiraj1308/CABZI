# How to Showcase "Cabzi" in Your Portfolio

This guide provides a template for writing about the Cabzi project on your resume, portfolio website, or LinkedIn profile. The goal is to highlight the complexity, scale, and technical depth of what you have built.

---

## 1. Project Title

**Cabzi: Full-Stack CPR (Cure-Path-ResQ) Ecosystem**

*(Subtitle: An integrated ride-hailing, emergency response, and roadside assistance platform)*

---

## 2. Project Summary (The Elevator Pitch)

Cabzi is a full-stack, multi-tenant web application that re-imagines urban mobility by integrating a fair, 0% commission ride-hailing service with a life-saving emergency response network. I architected and built this platform from the ground up, creating a unified ecosystem for four distinct user roles: Riders, Path Partners (Drivers), Cure Partners (Hospitals), and a central Admin.

The platform's core is a "FinTech for Mobility" engine, featuring the "Cabzi Bank" for partner financial services. The entire system is built on a scalable, real-time, server-centric architecture using Next.js, Firebase, and Cloud Functions to handle live ride dispatching, ambulance assignments, and partner location tracking efficiently and at near-zero cost.

---

## 3. Key Features Implemented

### 🚑 Cure Ecosystem (Emergency Response)
*   **Hospital Onboarding:** A professional, multi-step B2B wizard for hospitals to register their facility, departments, and services.
*   **Mission Control Dashboard:** A real-time command center for hospitals to manage their ambulance fleet, update live bed availability, and receive incoming emergency cases.
*   **Smart Dispatch System:** Backend logic that assigns a case to the nearest hospital and implements a "smart cascade" to automatically re-assign the case if it's rejected, ensuring no critical alert is missed.
*   **Ambulance Driver Portal:** A dedicated, secure dashboard for individual ambulance drivers to view their assigned case, navigate to the patient, and update their status.

### 🚖 Path Ecosystem (Ride-Hailing)
*   **Real-time Ride Booking:** A full-featured booking flow for riders, including location search, fare estimation for multiple vehicle types, and live partner tracking on an interactive map.
*   **0% Commission Model:** The core business logic is built around a subscription model for partners, with a full-fledged "Cabzi Bank" wallet for instant fare credits.
*   **"Cabzi Pink" Service:** A safety-focused feature for women, with dedicated UI on the rider's booking screen and specific matching logic in the backend dispatcher to connect women riders with women partners.

### 🛠️ ResQ Ecosystem (Roadside Assistance)
*   **Mechanic Onboarding:** A specialized onboarding flow for mechanics to register and list their on-the-spot repair services.
*   **SOS Garage for Partners:** A functional feature for drivers to request immediate on-spot assistance for issues like a flat tyre or battery jump-start.
*   **Live Job Dispatch:** A real-time system that notifies nearby ResQ partners of a service request and allows them to accept, navigate, and manage the job.

### ⚙️ Admin Panel (Central Command)
*   **Unified Partner Management:** A single, powerful dashboard for admins to view, approve, reject, and suspend all three partner types (Path, ResQ, and Cure).
*   **Live Operations Map:** A "God's-eye view" of all active entities on a single map, with a "Hotspot Analysis" feature to show the density of nearby partners and riders on hover.
*   **Complete Audit Trail:** Dedicated pages to view and search logs for all customers, rides, and emergency cure cases, ensuring full platform visibility.
*   **Role-Based Access Control (RBAC):** Implemented security rules where sensitive data (like team salaries) is only visible to high-privilege roles like "Platform Owner".

---

## 4. Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
*   **UI Components:** ShadCN UI, Recharts for charts, Framer Motion for animations
*   **Backend & Real-time:** Firebase (Firestore, Firebase Authentication, Firebase Cloud Functions)
*   **Mapping:** Leaflet.js with OpenStreetMap for interactive maps
*   **Routing & Geocoding:** OSRM & Nominatim APIs for route calculation and address search
*   **AI (Generative):** Genkit for AI-powered features like the "Earnings Coach".

---

## 5. My Role & Contributions

As the sole architect and developer of this project, I was responsible for the end-to-end design, development, and implementation of the entire Cabzi platform. My key contributions include:

*   **System Architecture:** I designed the "No Cost" server-centric architecture using Firebase Cloud Functions and FCM to dispatch ride requests efficiently, reducing potential database reads by over 99% compared to a client-side listener model.
*   **Full-Stack Development:** I built all four user-facing applications (Rider, Path Partner, Cure Partner, Admin) using Next.js and TypeScript. This included creating reusable UI components with ShadCN and managing complex application state.
*   **Real-time Logic:** I developed the core real-time features of the app, including live partner location tracking, instant ride status updates, and the real-time "Action Feed" for the hospital's Mission Control dashboard using Firestore's `onSnapshot` listeners.
*   **Database Design:** I designed the entire Firestore database schema, including creating all necessary collections and implementing the security rules to ensure data privacy and prevent unauthorized access between different user roles.
*   **Backend & Serverless Functions:** I wrote the server-side Cloud Functions in TypeScript that handle the intelligent dispatching for all three ecosystems (Path, ResQ, and Cure), including the "Smart Cascade" logic for emergency requests.

---

## 6. Challenges & Solutions

One of the biggest technical challenges was designing a real-time system that could scale without incurring massive costs. A naive approach where every online driver listens to all new ride requests would lead to a "quota killer" problem (e.g., 500 drivers online = 500 database reads for one request).

**Solution:** I solved this by designing and implementing a **"No Cost" server-centric architecture**. Instead of clients listening to collections, a Cloud Function triggers when a new ride is created. This single function then performs an efficient geo-query to find the nearest 5-10 partners and sends a targeted push notification (via FCM) directly to them. This reduced the database read operations by over 99% per request, making the core feature highly scalable and cost-effective.

---

## 7. Links

*   **Live Demo:** `[Link to your deployed project]`
*   **Source Code:** `[Link to your Git repository]`
