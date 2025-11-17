# Curocity: Code Structure Guide

This document provides a detailed breakdown of the Curocity monorepo's folder and file structure. It serves as a map to help developers navigate the codebase efficiently.

---

## 1. Top-Level Directory Structure

The project is a **monorepo** managed by `npm workspaces`. This means it's a single repository containing multiple independent packages.

*   `frontend/`: This is a complete, self-contained **Next.js** application. It handles everything the user sees and interacts with.
*   `backend/`: This is a **Firebase Cloud Functions** project. It contains all the server-side, "behind-the-scenes" logic.
*   `docs/`: Contains all project documentation, like this file, architecture diagrams, and pitch decks.
*   `package.json`: The main file that defines the workspaces (`frontend`, `backend`) and allows you to run commands from the root.

---

## 2. Frontend (`frontend/`)

This is the largest and most complex part of the project. It follows modern Next.js App Router conventions.

*   `frontend/src/app/`: **The Core of the Application (Routing)**
    *   This directory uses Next.js's file-system based routing. Each folder inside represents a URL path.
    *   `(auth)/`: Groups authentication-related pages like `/login` without affecting the URL.
    *   `(dashboard)/`: A route group for all the main user dashboards.
        *   `admin/`: The entire Admin Panel UI and logic.
        *   `cure/`: The Hospital/Cure Partner dashboard.
        *   `driver/`: The Path Partner (Driver) dashboard.
        *   `mechanic/`: The ResQ Partner (Mechanic) dashboard.
        *   `user/`: The Rider/Customer dashboard.
    *   `page.tsx`: The landing page of the application.
    *   `layout.tsx`: The main root layout for the entire application.

*   `frontend/src/components/`: **Reusable UI Elements**
    *   `ui/`: Contains all the base, un-styled components from **ShadCN UI** (e.g., `Button.tsx`, `Card.tsx`). These are the building blocks.
    *   `shared/`: Contains components that are used across many different parts of the application (e.g., `BrandLogo.tsx`, `LiveMap.tsx`).

*   `frontend/src/features/`: **Business Logic Components**
    *   This is where we keep larger, more complex components that encapsulate a specific business feature.
    *   `auth/`: Components and hooks related to user authentication.
    *   `user/`: Components specifically for the Rider's user flow (e.g., `RideBookingSheet.tsx`).
    *   `admin/`: Components specific to the Admin Panel.

*   `frontend/src/lib/`: **Utility & Configuration Files**
    *   `firebase/`: Contains all Firebase client-side initialization code. This is the central point for connecting the frontend to Firebase.
    *   `translations.ts`: Stores the English and Hindi language strings for internationalization.
    *   `utils.ts`: General helper functions used throughout the app.

*   `frontend/src/hooks/`: **Custom React Hooks**
    *   Contains custom hooks for managing stateful logic that can be reused across components (e.g., `use-language.tsx`).

*   `frontend/public/`: **Static Assets**
    *   Contains images, icons, and other static files that are served directly.

---

## 3. Backend (`backend/`)

This workspace contains the serverless functions deployed to Firebase.

*   `backend/src/`: The TypeScript source code for the functions.
    *   `index.ts`: The main entry point that exports all the functions to be deployed. This is where the "No-Cost Architecture" logic lives.
    *   `modules/`: The function logic is organized into modules based on the CPR ecosystem.
        *   `ride/`: Dispatch logic for the Path (ride-hailing) system.
        *   `mechanic/`: Dispatch logic for the ResQ (mechanic) system.
        *   `cure/`: Dispatch and cascade logic for the Cure (emergency) system.
        *   `maintenance/`: Scheduled functions, like `statusCleanup`, to keep the database clean.

---

This structured approach ensures the Curocity project is **maintainable, scalable, and easy for any developer to understand.**
