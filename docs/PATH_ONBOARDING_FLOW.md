# Curocity: PATH Partner (Driver) — Final Production Onboarding & Ride Workflow

This document outlines the definitive, end-to-end journey for a Path Partner (Driver). This workflow is designed for scalability, robust fraud prevention, and a manageable administrative load, making it production-ready.

---

## Part 1: The Onboarding Flow

### 🔹 STEP 0: Role Selection

*   **Entry Point:** The user navigates to `/partner-hub` and selects the "Path Partner (Driver)" option.
*   **Key Principle:** No login or account is created before the initial phone verification. A full-fledged account is granted only after KYC completion.

---

### 🔹 STEP 1: Phone Number + OTP Verification

*   **Why it's important:**
    *   Eliminates fake or non-serious leads.
    *   Prevents duplicate account creation with the same number.
    *   Acts as the first layer of fraud control.
*   **Flow:**
    1.  User enters their 10-digit mobile number.
    2.  An OTP is sent via SMS.
    3.  User enters the OTP to verify their number.
    4.  A temporary account is created in the database with the `phone_verified` status.

---

### 🔹 STEP 2: Basic Profile Details

*   **Goal:** Quickly capture essential personal information without requiring document uploads yet.
*   **Fields:**
    *   Full Name (as per government ID)
    *   Gender
    *   Date of Birth
    *   Profile Photo Upload
*   **Validation:**
    *   **Auto Face-Detection:** A simple client-side check to ensure the uploaded image is a face and not blurry or a side profile.
    *   **Age Check:** The user's age calculated from the Date of Birth must be over 18.
*   **Status Update:** `basic_info_completed`

---

### 🔹 STEP 3: Identity Verification (KYC)

*   **Goal:** The core of fraud control. Verify the partner's identity against official documents.
*   **Uploads:**
    1.  **Aadhaar Card:** Front and Back photos.
    2.  **PAN Card:** Front photo.
*   **Validations (Automated via OCR):**
    *   ✅ **Name Match:** The name extracted from the Aadhaar and PAN cards must have a similarity score of >85% with the name entered in Step 2.
    *   ✅ **DOB Match:** The Date of Birth from Aadhaar should match the one entered in Step 2.
    *   ✅ **Duplicate Check:** The system checks if the same Aadhaar or PAN number already exists for another verified partner. If so, the application is flagged for manual review.
*   **Status Update:** `kyc_pending` (after successful OCR), moves to `kyc_verified` after admin approval.

---

### 🔹 STEP 4: Driving Licence Verification

*   **Uploads:**
    *   **Option A (Manual):** Upload photos of the Driving Licence (front and back).
    *   **Option B (Preferred):** Use the DigiLocker API to fetch the DL details directly for instant, tamper-proof verification.
*   **Validations (Automated via OCR/API):**
    *   ✅ **Licence Number:** Extract the DL number.
    *   ✅ **Validity Check:** Ensure the "Valid Till" date has not passed. If expired, the onboarding process is halted with an error message.
    *   ✅ **Vehicle Class Match:** The "Class of Vehicle" (e.g., MCWG, LMV) on the licence must match the vehicle type the driver intends to register.
*   **Status Update:** `dl_verified_pending`

---

### 🔹 STEP 5: Vehicle Details & Documents

*   **Inputs:**
    *   Vehicle Type (Bike, Auto, Cab)
    *   Manufacturer & Model
    *   Vehicle Registration Number (Plate Number)
*   **Uploads:**
    *   Registration Certificate (RC) photo.
*   **Validations (Automated via OCR):**
    *   ✅ **Plate Number Match:** The plate number from OCR should match the user's input.
    *   ✅ **Ownership Check:** The owner's name on the RC is compared with the driver's name.
        *   If it doesn't match, the driver is prompted to upload a signed "Authorization Letter" or a rental agreement.
    *   ✅ **Vehicle Age Check:** The vehicle's registration date must not be more than 15 years ago (as per government norms).
*   **Status Update:** `vehicle_document_pending`

---

### 🔹 STEP 6: Police Verification & Background Check

*   **Goal:** A mandatory safety and compliance step.
*   **User Choice:**
    1.  **Option A:** "I have a Police Verification Certificate." → The user uploads the certificate.
    2.  **Option B:** "I don't have a certificate." → The user must check a box agreeing to a background check conducted by Curocity's third-party vendor and sign a self-declaration.
*   **Status Update:** `background_check_pending`

---

### 🔹 STEP 7: Bank & Wallet Setup

*   **Goal:** Set up the financial pipeline for partner payouts.
*   **Flow:**
    1.  The partner enters their Bank Account number and IFSC code.
    2.  They upload a photo of a Cancelled Cheque or the first page of their Bank Passbook for verification.
    3.  A **Curocity Bank Wallet** is automatically earmarked for them.
    4.  After the admin verifies the bank details, the driver is prompted on their first login to set a secure 4-digit UPI PIN for their wallet.
*   **Status Update:** `wallet_pending`

---

### 🔹 STEP 8: Training & Assessment

*   **Goal:** Ensure every partner understands the platform's rules and our CPR-first mission. This is a must-have for a professional, scalable startup.
*   **Module:** A short, mandatory in-app training module with 3-4 slides or short videos covering:
    *   ✅ Emergency driving etiquette (how to behave during a CURE dispatch).
    *   ✅ Basics of CPR and first-response awareness.
    *   ✅ Curocity's platform rules (0% commission, cancellation policy, etc.).
*   **Assessment:** A simple 4-question quiz at the end. The partner must pass to proceed.
*   **Status Update:** `training_completed`

---

### 🔹 STEP 9: Final Review Screen

*   **Function:** A summary screen where the driver can review all the details and documents they have submitted.
*   **Action:** A final "Submit for Verification" button.
*   **Status Update:** The partner's status changes to **`pending_verification`**.

---

### 🔹 STEP 10: Admin Verification Panel

*   **Admin's View:** The admin panel shows a checklist for the new partner application, with the results of the automated OCR and API checks.
    *   Profile Details
    *   Aadhaar/PAN OCR results
    *   DL Validity Status
    *   RC Owner Match
    *   Vehicle Age
    *   Bank Account Details
*   **Admin's Actions:**
    *   ✅ **Approve:** The partner's status becomes `verified`.
    *   ❌ **Reject:** The admin selects a reason (e.g., "Invalid Licence", "Document Mismatch"), and an automated message is sent to the applicant.
    *   🔄 **Request Corrections:** The admin can flag specific documents (e.g., "Blurry RC Photo") and request the partner to re-upload them.

---

### 🔹 STEP 11: Go Live!

*   **Driver's App:**
    *   A "Congratulations! You are now a verified Curocity Partner" screen is shown.
    *   The Curocity Bank wallet is activated.
    *   The "Go Online" button on the dashboard is unlocked.
*   **Final Status:** `active`

---

## Part 2: The Driver's Ride Workflow

1.  **Login & Go Online:** The verified driver logs into the `/driver` dashboard and toggles their status to **"Online"**. This starts sharing their live location.

2.  **Receive Ride Request:** A push notification arrives, and a pop-up shows the pickup/drop locations, fare, and distance. The driver has 15 seconds to **Accept** or **Decline**.

3.  **Accept Ride:** The UI transitions to an active ride view, showing the route to the rider's pickup location.

4.  **Arrive & Verify:** Upon arrival, the driver taps **"Arrived"**. They must then ask the rider for the **4-digit OTP** and enter it to start the trip.

5.  **Trip in Progress:** The map now displays the route to the rider's destination.

6.  **End Trip:** Upon reaching the destination, the driver taps **"End Trip"**.

7.  **Collect Payment:** A new screen appears showing a professional, itemized bill. The driver collects the cash payment from the rider.

8.  **Confirm Payment:** The driver taps the **"Confirm Cash Received"** button.

9.  **Ride Completed:** A final summary screen shows the driver's earnings for that trip. The fare is instantly credited to their Curocity Wallet.

10. **Back to Dashboard:** The driver taps "Done" and returns to the main dashboard, ready to receive the next ride.
```