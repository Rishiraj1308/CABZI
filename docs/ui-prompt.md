
# Cabzi: The Visual Blueprint & UI Prompt

This document outlines the UI/UX design prompt for each screen of the Cabzi application. The goal is to create a clean, modern, trustworthy, and user-friendly interface using ShadCN UI components and Tailwind CSS.

## 1. Global Design System & Style Guide

*   **Color Palette:**
    *   **Primary:** A deep, trustworthy teal (`hsl(180, 35%, 25%)`). Used for primary buttons, active links, and important icons.
    *   **Background:** A very light, airy mint cream (`hsl(180, 50%, 98%)`) for light mode, and a very dark teal (`hsl(180, 35%, 8%)`) for dark mode.
    *   **Accent:** A vibrant, energetic electric yellow (`hsl(60, 100%, 50%)`). Used for "call to action" buttons (like "Continue", "Confirm Ride"), highlights, and glow effects.
    *   **Card/Component BG:** Same as the main background to create a seamless, layered look.
    *   **Borders:** Subtle, light gray (`hsl(180, 20%, 88%)`).
*   **Typography:**
    *   **Font:** Poppins. Use a bold weight (e.g., `font-bold`, `font-semibold`) for titles and a normal weight for body text.
    *   **Brand Name/Logo:** Use `font-extrabold` with the text-gradient animation.
*   **Component Styling:**
    *   **Rounding:** Generous rounding on all components (`rounded-lg`, `rounded-full`). Default radius should be `0.8rem`.
    *   **Shadows:** Use subtle `shadow-sm` or `shadow-md` to lift components like cards off the background. Important elements like the "Pro" subscription plan card should have a more pronounced `shadow-lg`.
    *   **Glow Effect:** The primary accent color buttons should have a subtle glow on hover to make them feel interactive (`btn-glow` class).
*   **Icons:** Use `lucide-react` library for all icons. They should be clean and consistent.

---

## 2. Screen-by-Screen UI Prompts

### Role: Generic / All

#### **Screen: Splash Screen (`/`)**
*   **Layout:** Full-screen, centered.
*   **Components:**
    *   A single `h1` element containing the brand name "Cabzi".
*   **Styling:**
    *   Brand name should be very large (`text-8xl` or `text-9xl`).
    *   Apply the `font-extrabold`, `font-headline`, and `animate-text-gradient` classes for the animated gradient text effect.
    *   The entire screen should fade in and then fade out to transition to the home page.

#### **Screen: Partner Hub (`/partner-hub`)**
*   **Layout:** Centered, single large `Card`.
*   **Components:**
    *   `Card` with a clear `CardTitle` like "Join the Cabzi Partner Network".
    *   A grid of `Card`s inside, one for each partner type: "Cabzi Partner (Driver)", "ResQ Partner (Mechanic)", and "Cure Partner (Ambulance)".
    *   Each inner card should have an `icon`, a `title`, a brief `description`, and a `Button` to start the respective onboarding flow.
*   **Styling:**
    *   The inner cards should be clickable and have a hover effect (e.g., `hover:border-primary`).
    *   The "Coming Soon" card (for Cure Partner) should have a disabled style.

#### **Screen: Login / OTP (`/login`)**
*   **Layout:** Centered, single `Card` component.
*   **Components:**
    *   `Card` with `CardHeader`, `CardContent`, `CardDescription`, `CardTitle`.
    *   `BrandLogo` inside the header.
    *   `Label` and `Input` for Full Name (for rider signup) and Phone Number.
    *   A large `Button` with the accent color for "Send OTP".
    *   When OTP is sent, the view switches to an OTP input field.
    *   `CardFooter` is not used; links are placed in a `div` below the form inside `CardContent`.
*   **Styling:**
    *   The card should be the max width of `sm` (`max-w-sm`).
    *   The inputs should be large and easy to tap on mobile.

### Role: Rider

#### **Screen: Rider - Booking Flow (`/rider`)**
*   **Phase 1: Planning (Bottom Sheet)**
    *   **Layout:** Full-screen map background (use `LiveMap` component). A `Sheet` component slides up from the bottom.
    *   **Components (`Sheet`):**
        *   `SheetHeader` with "Where to?".
        *   Two `Input` fields with `MapPin` icons for "Pickup" and "Destination".
        *   A `Button` with a `Send` icon to fetch ride options.
        *   A list of `Card`s to show vehicle types (`Bike`, `Auto`, `Cab`, `Cabzi Pink`, etc.). Each card has an `icon`, `name`, `ETA`, and `fare`.
        *   `SheetFooter` contains a large accent color `Button` for "Confirm Ride".
    *   **Styling:**
        *   The vehicle type cards are selectable. The selected card has a primary color ring (`ring-2 ring-primary`). `Cabzi Pink` card should have a pink theme.
        *   Until fares are fetched, show `Skeleton` loaders inside the vehicle cards.
*   **Phase 2: Ride Status**
    *   **Layout:** Map background with a single `Card` at the bottom of the screen.
    *   **Components (`Card`):**
        *   A `Lottie` animation for "Finding Partner".
        *   Once driver is found, show `Avatar` for driver's photo.
        *   Display driver `name`, `vehicle info`, and `rating` (with `Star` icon).
        *   Display a large, prominent `OTP` for the driver to start the trip.
        *   `Button` to "Call Driver" and a `SheetTrigger` button for "Safety Toolkit".
*   **Phase 3: Rating**
    *   **Layout:** The bottom card now shows a rating interface.
    *   **Components:**
        *   Five clickable `Star` icons.
        *   A "Submit Rating" `Button`.

### Role: Partner (Driver)

#### **Screen: Partner Onboarding (`/driver/onboarding`)**
*   **Layout:** Full-page `Card` on a muted background.
*   **Components:**
    *   `Card` with `CardHeader` (containing `BrandLogo`, `CardTitle`, `CardDescription`).
    *   `CardContent` contains the form with `Label`s, `Input`s (Name, Phone, PAN, Aadhaar, Vehicle Number), and a `Select` for Vehicle Type.
    *   Include a `Checkbox` for "Register as a Cabzi Pink Partner (Women only)".
    *   `CardFooter` contains a single, full-width, accent-colored `Button` for "Finish & Start Earning".
*   **Styling:** The card should be wider (`max-w-2xl`) to accommodate the form fields.

#### **Screen: Partner Dashboard (`/driver`)**
*   **Layout:** Half map, half control panel. Top 50% of the screen is the `LiveMap`. Bottom 50% is a `Card`-like area with controls.
*   **Components:**
    *   A prominent `Switch` to toggle "Online/Offline" status.
    *   A grid of 4 `Card`s for key stats: "Rides Today", "Rating", "Acceptance", "Today's Earning".
    *   A `Tabs` component for "Quick Payments" and "AI Coach".
    *   An `AlertDialog` for new ride requests. It should pop up and overlay the screen.
*   **Styling:** The ride request `AlertDialog` should be very clear, showing Pickup, Drop, and a large Fare display. "Accept" button should be green.

#### **Screen: Partner Profile (`/driver/profile`)**
*   **Layout:** A series of `Card`s stacked vertically.
*   **Components:**
    *   **`DriverIdCard` (Custom Component):** A special `Card` with a gradient background. It contains the driver's `Avatar`, name, Partner ID, and a "Verified" `Badge`.
    *   **Security Card:** A `Card` to manage security settings, including a `Button` to "Set/Change UPI PIN".
    *   **Payment Details Card:** A `Card` to show the UPI QR Code, with a `Button` to download it.
    *   **Documents Card:** `Card` with a list of documents (License, RC). Each item shows the document name, a "Verified" status with a `CheckCircle` icon, and a "View/Update" `Button`.

### Role: ResQ Partner (Mechanic)

#### **Screen: ResQ Onboarding (`/mechanic/onboarding`)**
*   **Layout:** Full-page `Card` similar to driver onboarding.
*   **Components:**
    *   Form fields for personal details (Name, Phone, PAN, Aadhaar) and an optional "Garage Name".
    *   A `Card` containing a grid of `Checkbox` components for selecting services offered (e.g., "Tyre Puncture", "Battery Jump-Start").
    *   An optional, interactive `LiveMap` component for setting a fixed workshop location.
    *   A `Button` to "Finish Onboarding".
*   **Styling:** The `Card` should be wide (`max-w-3xl`) to fit all the options.

#### **Screen: ResQ Dashboard (`/mechanic/page.tsx`)**
*   **Layout:** Half map, half controls, similar to the driver dashboard.
*   **Components:**
    *   An "Available/Not Available" `Switch` is the most important control.
    *   `LiveMap` component shows the mechanic's own live location.
    *   An `AlertDialog` for new service requests.
    *   Cards for stats like "Today's Jobs" and "Today's Earnings".
    *   A stateful view for the "Ongoing Job" once accepted, with steps for OTP verification and job completion.
*   **Styling:** The job request `AlertDialog` should clearly show the driver's location, distance, and the issue.

### Role: Admin

#### **Screen: Admin Panel (`/admin`)**
*   **Layout:** A standard two-column dashboard layout. Left sidebar for navigation (`AdminNav`), main content area on the right.
*   **Components:**
    *   **Unified Partner Management (`/admin`):** A single `Table` to view all partners (Drivers, ResQ, etc.).
        *   Columns: Partner ID (with an icon for type), Name/Phone, Status (`Badge`), Onboarded On, and an "Actions" `DropdownMenu`.
        *   The "Actions" `DropdownMenu` should contain "Approve", "Reject", and "Delete" options. Deleting must trigger a confirmation `AlertDialog`.
    *   **Live Operations Map (`/admin/map`):** A full-screen `LiveMap` component. This is the **only** place where the `enableCursorTooltip` feature is active, showing a tooltip with nearby entity counts on hover.
    *   **Audit & Financial Reports (`/admin/audit`):**
        *   A `Tabs` component for "Monthly" and "Yearly" reports.
        *   Use `Card`s for displaying key metrics (Net Profit, Total Revenue, etc.).
        *   Use `recharts` (via `ChartContainer`) to display `BarChart`s for visual data representation.
*   **Styling:** The UI should be dense and information-rich, but clean. Use `Table`, `Card`, and `Badge` components extensively.
