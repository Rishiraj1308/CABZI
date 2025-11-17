# Master Prompt for Framer AI: Build "Curocity"

## 1. Project Vision & Core Concept

**Build a modern, high-fidelity, interactive prototype for a ride-hailing mobile application called "Curocity".**

The core mission of Curocity is to create a fair and transparent ecosystem for both riders and drivers in the Indian market. Its unique selling proposition (USP) is **0% commission for drivers**, who instead pay a subscription fee, and **fair, transparent fares for riders**.

The prototype should have a premium, trustworthy, and user-friendly feel, with a clean, modern aesthetic that looks and performs smoothly.

## 2. Target Audience

*   **Riders:** Individuals in Indian metro cities looking for affordable, reliable, and safe transportation.
*   **Partners (Drivers):** Drivers who want to maximize their earnings without paying high commissions.

## 3. UI/UX Design & Style Guide (The "Curocity Neo" System)

This is the most critical part. The entire design must follow this system.

*   **Color Palette:**
    *   **Primary:** A deep, trustworthy teal (`#2B7A78`). Used for primary buttons, active links, and important icons.
    *   **Background:** A very light mint cream (`#F7FEFD`) for light mode.
    *   **Accent:** A vibrant, energetic electric yellow (`#FBBF24`). Used for "call to action" buttons (like "Continue", "Confirm Ride"), highlights, and glow effects.
    *   **Text on Primary/Accent:** A very dark, near-black teal (`#0A1D1C`).
    *   **Muted/Secondary:** A light, soft teal-gray (`#DEF2F1`).
*   **Typography:**
    *   **Font Family:** **Poppins**. Use a bold weight (`font-weight: 700`) for all titles and headings, and a normal weight (`font-weight: 400`) for body text.
    *   **Brand Name/Logo:** The word "Curocity" should use an extra-bold weight and have a text gradient from the primary teal to the accent yellow.
*   **Component Styling:**
    *   **Rounding:** All components (Cards, Buttons, Inputs) must have a generous, modern rounding (e.g., `border-radius: 12px` or `16px`).
    *   **Shadows:** Use subtle but clean shadows to lift components off the background. Important elements should have a slightly more pronounced shadow.
    *   **Glow Effect:** The primary accent color buttons should have a subtle glow on hover to make them feel interactive and important.
*   **Icons:** Use a clean, consistent icon set like "Lucide" or "Feather" icons.

## 4. Screen-by-Screen Breakdown

Please generate the following screens for both a Rider and a Partner user flow.

### Role: Rider

*   **Screen 1: Rider Home/Booking (Most Important Screen):**
    *   **Layout:** A full-screen map interface at the top. A "bottom sheet" or `Card` slides up from the bottom, covering about 40% of the screen initially.
    *   **Components (in Bottom Sheet):**
        1.  A clear title: "Where to?".
        2.  Two `Input` fields with map pin icons: one for "Pickup location" and one for "Destination".
        3.  A list of vehicle options (`Card`s for Bike, Auto, Cab). Each option must show the vehicle icon, name (e.g., "Cab - Prime"), fare (e.g., "₹250"), and ETA (e.g., "5 min").
        4.  The selected vehicle option should be highlighted with the primary teal color border.
        5.  A large, full-width "Confirm Ride" `Button` at the bottom, using the accent yellow color.

*   **Screen 2: Ride Status (Driver on the way):**
    *   **Layout:** The bottom sheet now shows the ride status.
    *   **Components:**
        1.  Show the driver's `Avatar`, name, vehicle model, and star rating.
        2.  Display a large, prominent **OTP** (e.g., "4-digit code") that the rider needs to share.
        3.  Include `Button`s to "Call Driver" and "Share Ride".

### Role: Partner (Driver)

*   **Screen 1: Partner Dashboard (Online):**
    *   **Layout:** A two-part screen. The top half shows a live map with the driver's current location marker. The bottom half is a control panel `Card`.
    *   **Components (in Control Panel):**
        1.  A prominent "Online/Offline" `Switch` button.
        2.  A grid of 4 small `Card`s showing key stats: "Today's Earnings", "Rides Today", "Rating", "Acceptance Rate".
        3.  The most important feature: A ride request pop-up (`Dialog` or `Modal`). It must clearly show the pickup location, drop-off location, and the estimated fare for the ride. It should have two large buttons: "Accept" (Green) and "Decline" (Red).

*   **Screen 2: Partner Profile:**
    *   **Layout:** A clean page with a custom-designed digital "ID Card".
    *   **Components (on ID Card):**
        1.  The partner's `Avatar` (photo).
        2.  Partner's Name.
        3.  A "Verified Partner" `Badge` with a checkmark icon.
        4.  Details like "Partner ID", "Vehicle Number", and "Member Since".

---
This prompt provides a comprehensive blueprint. Please use these instructions to generate a visually stunning and functionally coherent prototype for the "Curocity" app.
