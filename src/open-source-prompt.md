# NOTE: This is an ALTERNATIVE blueprint for building Cabzi on a fully open-source stack.
# The current project uses a Firebase backend for simplicity and speed.

# Master Prompt: Build "Cabzi" on an Open-Source Stack

## 1. Project Vision & Core Concept

Build a modern, full-stack ride-hailing web application called **"Cabzi"**.

The core mission of Cabzi is to create a fair and transparent ecosystem for both riders and drivers in the Indian market. Its unique selling proposition (USP) is **0% commission for drivers**, who instead pay a subscription fee, and **fair, transparent fares for riders**.

The application should have a premium, trustworthy, and user-friendly feel, with a clean, modern aesthetic.

## 2. Target Audience

*   **Riders:** Individuals in Indian metro and tier-2 cities looking for affordable, reliable, and safe transportation.
*   **Partners (Drivers):** Drivers who own their vehicles (bikes, auto-rickshaws, cars) and want to maximize their earnings without paying high commissions per ride.
*   **Admin:** The Cabzi operations team responsible for verifying partners and managing the platform.

## 3. Tech Stack (Open-Source First)

This is a monorepo project with two main parts: a Next.js frontend and a Node.js backend.

*   **Frontend (Client):**
    *   **Framework:** Next.js (with App Router)
    *   **Language:** TypeScript
    *   **UI:** ShadCN UI components
    *   **Styling:** Tailwind CSS. The primary brand colors are Midnight Blue (primary), Light Blue (background), and Electric Yellow (accent).
    *   **Real-time Client:** `socket.io-client` to connect to the backend for live updates.

*   **Backend (Server):**
    *   **Framework:** Node.js with Express.js
    *   **Language:** TypeScript
    *   **Database:** PostgreSQL
    *   **ORM (Database Connector):** Prisma. Use it to define the database schema and interact with the database.
    *   **Real-time Communication:** `socket.io` for handling WebSocket connections for live ride requests and status updates.
    *   **Authentication:** Custom implementation using JSON Web Tokens (JWT). For OTPs, integrate a third-party SMS service like Twilio (but for the prototype, you can just log the OTP to the console).

## 4. Database Schema (Prisma)

Define the following models in your `schema.prisma` file:

```prisma
model User {
  id        String   @id @default(cuid())
  phone     String   @unique
  name      String
  role      Role     @default(RIDER)
  createdAt DateTime @default(now())

  // Relations
  driverProfile DriverProfile?
  ridesAsRider  Ride[]        @relation("RiderRides")
  ridesAsDriver Ride[]        @relation("DriverRides")
}

model DriverProfile {
  id             String        @id @default(cuid())
  userId         String        @unique
  user           User          @relation(fields: [userId], references: [id])
  vehicleType    String
  vehicleNumber  String
  status         String        @default("pending_verification") // pending_verification, verified, rejected
  currentLat     Float?
  currentLon     Float?
  isOnline       Boolean       @default(false)
}

model Ride {
  id              String    @id @default(cuid())
  pickupAddress   String
  dropoffAddress  String
  status          String    // requested, accepted, in_progress, completed, cancelled
  fare            Float
  
  riderId         String
  rider           User      @relation("RiderRides", fields: [riderId], references: [id])
  
  driverId        String?
  driver          User?     @relation("DriverRides", fields: [driverId], references: [id])

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum Role {
  RIDER
  DRIVER
  ADMIN
}
```

## 5. Key Features & API Endpoints (Backend)

Create the following API endpoints in your Express server:

*   `POST /api/auth/send-otp`: Takes a `phone` number, generates a fake OTP (e.g., '123456'), logs it to the console, and sends a success response.
*   `POST /api/auth/verify-otp`: Takes `phone` and `otp`. If valid, it finds or creates a `User` and returns a JWT.
*   `POST /api/driver/onboard`: Takes driver details, creates a `User` and `DriverProfile` with `pending_verification` status.
*   `GET /api/admin/partners`: An admin-only route to fetch all `DriverProfile`s.
*   `PUT /api/admin/partners/:id`: An admin-only route to update a partner's `status` to 'verified' or 'rejected'.

## 6. Real-time Events (Socket.IO)

Implement the following real-time logic:

*   **Connection:** When a driver logs in and toggles "Online", their client connects to the Socket.IO server.
*   **`find_ride` event (Rider -> Server):** When a rider confirms a booking, the frontend sends this event with ride details.
*   **`new_ride_request` event (Server -> Drivers):** The server receives `find_ride` and broadcasts this event to all connected, online drivers.
*   **`accept_ride` event (Driver -> Server):** When a driver accepts a request, they send this event.
*   **`driver_assigned` event (Server -> Rider):** The server notifies the original rider that a driver has been found, sending the driver's details.

## 7. Frontend User Flows

The frontend implementation should be identical to the one described in the original `prompt.md`, but instead of calling Firebase functions, it will make `fetch` requests to your Node.js API endpoints and listen for Socket.IO events.
