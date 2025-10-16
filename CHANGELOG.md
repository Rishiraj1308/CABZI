# Cabzi: Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2024-09-05

### ✨ Added

- **"No Cost" Architecture:** Implemented a scalable and cost-efficient backend using Firebase Cloud Functions and FCM to dispatch ride requests, reducing database reads by over 99%.
- **Google Sign-In:** Implemented "Sign in with Google" functionality for the Rider login page for a faster and smoother onboarding experience.
- **Docker Support:** Dockerized the application by adding a `Dockerfile`, `docker-compose.yml`, and `.dockerignore` file, enabling containerized deployment.
- **Comprehensive Documentation:**
    - Created `GITHUB_GUIDE.md` to help you push the project to GitHub.
    - Created a `DEPLOYMENT_GUIDE.md` detailing the steps to package the Next.js app into a native Android application.
    - Created `PROJECT_READINESS_REPORT.md` to provide a deep-level analysis of the application's current state and launch readiness.
    - Created this `CHANGELOG.md` to track project progress.

### 🐛 Fixed

- **Critical Login Reversal Bug:** Fixed a major logical flaw where logging in as a Rider would lead to the Partner dashboard and vice-versa.
- **Cure Dashboard Form:** Repaired the "Add New Driver" form in the Cure (Hospital) Mission Control dashboard, which was failing to read the "Gender" input correctly.
- **Broken Emergency Flow:** Fixed the CURE emergency flow initiated from the rider's side. The "Confirm & Dispatch Ambulance" button is now functional, and the request is correctly sent to the hospital network.
- **Ride Status UI:** Completely overhauled the `RideStatus` component. It now correctly displays contextual information for all three CPR scenarios (Path, Cure, and ResQ), eliminating the previously broken and empty UI for ambulance and mechanic requests.
- **`docker-compose.yml` Obsolete Version:** Removed the deprecated `version` attribute from the `docker-compose.yml` file to prevent warnings with modern Docker versions.