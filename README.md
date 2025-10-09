# Firebase Studio

This is a NextJS starter in Firebase Studio.

## Getting Started

To get started, take a look at `src/app/page.tsx`.

### Running the Local Development Server

1.  **Start the Firebase Emulator:**
    This project is configured to use the Firebase Local Emulator for development to prevent exhausting live quotas. Before starting the Next.js dev server, you must start the emulator.

    If you haven't already, install the Firebase CLI:
    ```bash
    npm install -g firebase-tools
    ```

    Then, start the Firestore emulator in a separate terminal:
    ```bash
    firebase emulators:start --only firestore
    ```
    Keep this terminal running in the background.

2.  **Start the Next.js Server:**
    In a new terminal, run the development server:
    ```bash
    npm run dev
    ```

## Configuration

This project is pre-configured with a Firebase project. Your `.env` file in the root directory has been automatically populated with the necessary keys.

You are all set to start building!
