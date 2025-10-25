# Curocity CPR: The Unified Onboarding Blueprint

This document outlines the professional, multi-step onboarding process for all partners in the Curocity CPR (Cure-Path-ResQ) ecosystem.

---

## 1. The Partner Hub (The Single Entry Point)

The journey for all partners begins at the **`/partner-hub`** page. Here, they choose their role, initiating a specialized onboarding flow.

*   🚑 Cure Partner (Hospital / Clinic)
*   🚖 Path Partner (Driver)
*   🛠️ ResQ Partner (Mechanic / Garage)

---

## 2. Onboarding Flow: Path Partner (Driver)

This is a streamlined, single-form process designed for speed.

*   **Step 1: Fill the Form**
    *   Personal Details (Name, Phone, Gender, PAN, Aadhaar)
    *   Vehicle Details (Type, Model, RC Number)
    *   Driving Licence Number
    *   Photo Upload
    *   "Curocity Pink" opt-in for women partners.
*   **Step 2: Database Entry**
    *   A new document is created in the `partners` collection.
    *   Initial `status` is set to **`pending_verification`**.
*   **Step 3: Admin Verification**
    *   Admin reviews documents from the `/admin/partners` panel.
    *   Status is updated to `verified` or `rejected`.
*   **Step 4: Go Live**
    *   Once verified, the partner can log in, go online, and start accepting rides.

---

## 3. Onboarding Flow: Cure Partner (Hospital)

This is a professional, multi-step wizard designed for businesses, reflecting a B2B partnership.

*   **Step 1: Business Details**
    *   Hospital/Clinic Name
    *   Hospital Registration Certificate Number
    *   Hospital Category (Private, Govt, Specialty, etc.)
    *   Contact Person's Name & Phone Number
    *   Business PAN and optional GST Number.
*   **Step 2: Location & Services**
    *   **Set Location:** Use an interactive map to pin the exact hospital location. The address is auto-fetched.
    *   **Ambulance Fleet:** Initial count of available BLS (Basic) and ALS (Advanced) ambulances.
    *   **Departments:** Checkboxes for available departments (ICU, Trauma, Cardiac, etc.).
*   **Step 3: Document Upload (Simulation)**
    *   A screen to upload necessary legal documents:
        *   Hospital Registration Certificate
        *   Fire & Safety Certificate
        *   Key Ambulance RCs
*   **Step 4: Review & Submit**
    *   A summary of all entered information for final review.
    *   Upon submission, a new document is created in the `ambulances` collection with `status: 'pending_verification'`.
*   **Step 5: Admin Verification & Go-Live**
    *   Admin verifies the hospital from the `/admin/partners` panel.
    *   Once `verified`, the hospital gets access to its **Mission Control Dashboard** to manage its fleet and receive emergency cases.

---

## 4. Curocity Bank: The Financial Backbone

For **Path** and **ResQ** partners, a secure **Curocity Bank Wallet** is automatically created upon successful verification and their first login.

*   **Instant Credit:** All earnings (ride fares, service charges) are credited instantly.
*   **Secure PIN:** The partner is prompted to set a 4-digit UPI PIN on their first visit to the wallet, securing their funds.
*   **Features:** The wallet enables high-interest savings, instant loans, and seamless UPI payments.
