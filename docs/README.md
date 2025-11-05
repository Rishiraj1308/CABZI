
# Curocity: The CPR Ecosystem (Cure-Path-ResQ)

Curocity is a full-stack, multi-tenant web application that re-imagines urban mobility by integrating a fair, 0% commission ride-hailing service with a life-saving emergency response network.

This repository contains the complete source code for the Curocity platform, built with Next.js, Firebase, and TypeScript.

---

## 🚀 Getting Started

To get this project up and running on your local machine, follow these simple steps.

### 1. Clone the Repository

First, you need to download the project code. Open your terminal and run the following command. This will create a `Curocity` folder on your computer.

```bash
git clone https://github.com/Rishiraj1308/Curocity.git
```

### 2. Navigate to the Project Directory

Once the download is complete, move into the newly created project folder:

```bash
cd Curocity
```

### 3. Install Dependencies

The project uses several libraries (like React, Next.js, etc.) that need to be installed. Run the following command:

```bash
npm install
```

### 4. Set up Firebase Configuration

The application needs to connect to a Firebase project to function.

1.  Create a file named `.env` in the root of the project folder.
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

### 5. Run the Local Development Server

You are now ready to start the application! Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application live.

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
