# Cabzi: Strategic Improvement & Action Plan

This document identifies the top 3 most critical business and product shortcomings in the current Cabzi prototype. For each problem, a clear, actionable solution is proposed to align the app with our vision and make it investor-ready.

---

## 1. The Problem: "Cabzi Pink" is Missing

*   **The Issue:** Our pitch deck (`PITCH.md`) and Go-To-Market strategy highlight **"Cabzi Pink"**—a women-only service for women partners and riders—as a key social impact initiative (Phase 4). This is a powerful feature for safety, branding, and attracting a loyal user base in India.
*   **The Risk:** Currently, the app has **zero mention** of this feature. An investor will immediately notice this gap between our promise and our product. It makes our social commitment look like an afterthought.
*   **The Impact:** We lose a major unique selling proposition (USP) and a chance to show that we are serious about women's safety, a critical issue in Indian transportation.

### The Solution: Integrate "Cabzi Pink" into the Product

We need to make "Cabzi Pink" a visible and integral part of the app, even in the prototype stage.

*   **For Riders:**
    1.  **Dedicated Ride Card:** On the Rider's booking screen, add a new, distinctly styled (e.g., pink-themed) `Card` for "Cabzi Pink" alongside Bike, Auto, and Cab.
    2.  **Informative Tooltip:** This card should have a `Tooltip` that explains: "A safe ride option exclusively for women, with women partners."
*   **For Partners:**
    1.  **Onboarding Option:** In the Partner Onboarding form, add a `Checkbox` option: "Register as a Cabzi Pink Partner (Women only)".
*   **For Backend:**
    1.  **Matching Logic:** The `rideDispatcher` Cloud Function must be updated to check if `rideType` is "Cabzi Pink". If it is, the database query must filter for partners where `isCabziPinkPartner` is `true`.

**Result:** By showing this feature upfront and implementing the core logic, we prove that safety and social responsibility are core to our business, not just a bullet point in a presentation.

---

## 2. The Problem: "Cabzi SOS Garage" is a Façade

*   **The Issue:** Our "Unfair Advantage" story revolves around helping a partner with a flat tyre via "Cabzi Bank" and our garage network. The `GUIDE.md` and `PITCH.md` both detail the "Cabzi SOS Garage" feature, promising on-the-spot mechanic assistance.
*   **The Risk:** The current "Insurance + Garage" page (`/driver/support`) is just a static page with a placeholder map. It offers no real functionality. This makes our core value proposition look weak and undeveloped.
*   **The Impact:** A partner using the prototype will feel let down. An investor will see that our "moat" is currently just a picture of a map.

### The Solution: Make "SOS Garage" Functional

We need to transform the static page into a dynamic, believable feature.

1.  **Live Location Map:** Replace the placeholder `Image` on the `/driver/support` page with a real, interactive `LiveMap` component that shows the driver's current location.
2.  **"Request Assistance" Button:** Add a prominent `Button` on this page: **"Request On-Spot Mechanic"**.
3.  **Real-Time Request Flow:** When the partner clicks the button:
    *   Open a `Dialog` to ask them to select the issue (e.g., "Flat Tyre", "Battery Jump-Start").
    *   On confirmation, create a new document in the `garageRequests` collection in Firestore with the partner's location, issue, and `status: 'pending'`.
    *   Show a `Toast` notification: "Request sent! A nearby Cabzi-approved mechanic has been notified."
4.  **Simulate a Real-Time Response:**
    *   The UI should update to show the status, like "Finding a mechanic...".
    *   Once a mechanic accepts (simulated or real), the UI should update to show the mechanic's details (Name, ETA, Contact) and their "live" location moving towards the partner on the map.

**Result:** This turns a dead-end page into a live, interactive demonstration of our most critical partner-facing feature, building immense trust.

---

## 3. The Problem: The Admin Team is Unclear & Unprofessional

*   **The Issue:** The "Team" page in the Admin Panel (`/admin/team`) currently shows generic roles like "Support Staff" and "Manager" with placeholder names. The actual founders mentioned in the pitch (`Ankit Kumar`, `Bhaskar Sharma`) are not properly represented.
*   **The Risk:** An investor looking at our admin panel might think the team is not well-defined or that the founders are not integrated into the operational tool. It looks unprofessional.
*   **The Impact:** It undermines the credibility of the "The Team" section in our pitch deck and makes the company look smaller and less organized than it is.

### The Solution: Structure the Team and Define Hierarchy

We need to update the team page to reflect our pitch deck and a professional organizational structure.

1.  **Update Admin Users:** Modify the mock data in `/admin/team/page.tsx` to include the correct names and roles:
    *   Ankit Kumar -> **Platform Owner**
    *   Bhaskar Sharma -> **Co-founder**
    *   Add a realistic role like **"Tech Intern"**.
    *   Keep roles like "Manager" and "Support Staff".
2.  **Implement Role-Based Access Control (RBAC):**
    *   Introduce logic where a user's ability to perform actions (like adding a new member) depends on their role.
    *   A "Platform Owner" or "Co-founder" should be able to add a "Manager".
    *   A "Manager" should only be able to add "Support Staff".
    *   A "Support Staff" member should not be able to add anyone.
3.  **Show Salary Information (Founder-Only View):**
    *   Add a "Salary" column to the team table.
    *   This column should **only be visible** if the logged-in admin is a "Platform Owner" or "Co-founder", demonstrating secure, role-based data visibility.

**Result:** This presents a well-structured, professional team with clear roles and hierarchies, giving investors confidence in our operational maturity.
