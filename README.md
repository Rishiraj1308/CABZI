# Curocity: The CPR Ecosystem (Cure-Path-ResQ)

Curocity is a full-stack, multi-tenant web application that re-imagines urban mobility by integrating a fair, 0% commission ride-hailing service with a life-saving emergency response network.

This repository contains the complete source code for the Curocity platform, built with Next.js, Firebase, and TypeScript.

---

## 🚀 Getting Started

To get this project up and running on your local machine, follow these simple steps.

### 1. Install Root Dependencies

First, from the root `Curocity` directory, install the dependencies for both workspaces.

```bash
npm install
```

### 2. Set up Firebase Configuration

The application needs to connect to a Firebase project to function.

1.  Create a file named `.env` in the `frontend` directory (`frontend/.env`).
2.  Paste your Firebase configuration keys into this file. The format should look like this:

    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=1:...
    ```

    *You can get these keys from your Firebase Project Settings.*

### 3. Run the Local Development Server

You are now ready to start the frontend application! Run the development server from the **root directory**:

```bash
npm run dev
```

This will start the Next.js app in the `frontend` workspace. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application live.

### 4. Deploy Backend Functions

To deploy your backend Cloud Functions, you can run the following command from the **root directory**:

```bash
npm run deploy
```

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI:** ShadCN UI, Tailwind CSS, Framer Motion
*   **Backend & Real-time:** Firebase (Firestore, Authentication, Cloud Functions)
*   **Mapping:** Leaflet.js & OpenStreetMap
*   **Generative AI:** Genkit

---

## 🌟 Key Features

*   **Cure (Emergency Response):** A B2B dashboard for hospitals to manage ambulance fleets and dispatch them for live emergency cases.
*   **Path (Ride-Hailing):** A 0% commission ride-hailing platform for drivers and riders with real-time tracking.
*   **ResQ (Roadside Assistance):** An on-demand network of mechanics for partners.
*   **Admin Panel:** A central command center to manage the entire CPR ecosystem.
*   **Curocity Bank:** An integrated FinTech engine for partner wallets, loans, and savings.
