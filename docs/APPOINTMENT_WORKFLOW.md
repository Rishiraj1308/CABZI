
      
# Curocity: The Doctor Appointment Workflow

This document outlines the complete, end-to-end user journey for finding and booking a doctor's appointment through the Curocity platform.

---

## 1. The User's Goal: Find and Book the Right Doctor, Fast.

The entire workflow is optimized for speed, clarity, and user convenience. It allows a user to go from having a medical need to a confirmed appointment request in just a few taps, all from a single, unified interface.

---

## 2. The Step-by-Step Flow

### **Step 1: The Starting Point (Services Dashboard)**
*   The user logs into their Curocity account and lands on the main **Services Dashboard** (`/user`).
*   They tap on the **"Book Appointment"** service card.

### **Step 2: The Discovery Page (Find a Doctor)**
*   The user is taken to the main doctor discovery page (`/user/book-appointment`). This page is the central hub for the entire booking process.

### **Step 3: Intelligent Search & Filtering**
The user has multiple powerful ways to find the right doctor:

*   **A) Symptom-First Search:**
    *   The user can tap on a common symptom from a list (e.g., "Fever/Cold", "Bone/Joint Pain", "Stomach Ache").
    *   The app instantly filters the doctor list to show only the relevant specialists (e.g., General Physicians for a fever, Orthopedics for joint pain).

*   **B) Text Search:**
    *   The user can type in the search bar to find doctors by **Name**, **Specialization**, or **Hospital Name**.

*   **C) Advanced Filtering & Sorting:**
    *   Users can open a filter panel to narrow down the results based on:
        *   **Availability:** "Available Today" or "Available Tomorrow".
        *   **Price Range:** A slider to set the maximum consultation fee.
        *   **Doctor's Gender:** A crucial option for patient comfort.
    *   They can also sort the results by **Distance**, **Price**, or **Experience**.

### **Step 4: The "Quick Book" Action**
*   The search results are displayed as a list of clear, informative **Doctor Cards**. Each card shows the doctor's photo, name, specialization, experience, hospital, distance, and fee.
*   Instead of needing to click into a separate profile page, the user can immediately initiate a booking by clicking the **"Book Now"** button directly on the card.

### **Step 5: The Integrated Booking Sheet**
*   Upon clicking "Book Now", a `Sheet` (a slide-out panel) appears on the screen. This sheet contains everything needed to complete the booking without navigating away from the search results.
*   The sheet displays:
    1.  The selected doctor's details and consultation fee.
    2.  A choice between **"In-Clinic"** or **"Video"** consultation.
    3.  A calendar to select an **appointment date**.
    4.  A list of available **time slots** for the chosen date.

### **Step 6: Confirmation & System Logging**
*   Once the user has selected a date, time, and consultation type, they click the final **"Confirm Appointment"** button.
*   **Backend Action:** The system instantly creates a new document in the `appointments` collection in Firestore. This document contains all the details of the request and is initially marked with `status: 'Pending'`.
*   **Hospital Notification:** The hospital's Mission Control dashboard, which is listening for new documents, immediately displays this new request.
*   **User Feedback:** The user's app shows a `Toast` notification confirming that their request has been successfully sent to the hospital and they will be notified upon confirmation. The booking sheet closes, and the user is back on the search results page.

---

## 3. The Result: A Seamless Experience

This workflow is designed to be highly efficient:

*   **Reduces Clicks:** Users don't need to navigate back and forth between different pages.
*   **Provides Control:** Powerful filters allow users to find exactly what they're looking for.
*   **Offers Instant Feedback:** The user immediately knows their request has been logged.

This streamlined process makes finding and booking healthcare services on Curocity a simple and stress-free experience.
      
    