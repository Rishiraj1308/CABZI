# Master Prompt: Generate the Curocity PostgreSQL Schema with Prisma

## 1. Project Vision & Core Concept

**Build a complete database schema for a PostgreSQL database using the Prisma ORM.**

The application is **"Curocity"**, India's first unified CPR (Cure-Path-ResQ) ecosystem. The schema must be robust, scalable, and production-ready to handle ride-hailing, emergency response, and financial transactions.

The schema must support four main user roles:
*   **Riders:** Customers who book rides.
*   **Partners:** Drivers, Mechanics, and Hospital Admins.
*   **Ambulance Drivers:** Individual drivers belonging to a hospital.
*   **Admins:** Curocity's internal team.

## 2. Technical Requirements

*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Output:** A single, complete `schema.prisma` file.
*   **Relations:** Use explicit, readable relation names (e.g., `RiderRides`, `DriverRides`).
*   **Data Types:** Use appropriate Prisma data types (`String`, `Int`, `Float`, `DateTime`, `Boolean`, `Json`, etc.).
*   **Defaults & Timestamps:** Use `@default(now())` for `createdAt` and `@updatedAt` for `updatedAt`.
*   **IDs:** Use `cuid()` for all primary keys.

## 3. Detailed Schema Requirements

Generate the Prisma models as described below.

---

### **Model: `User`**
*   **Purpose:** The central model for any person who logs in. Can be a Rider, Partner, or Admin.
*   **Fields:**
    *   `id`: `String` (Primary Key, CUID)
    *   `phone`: `String` (Unique, for login)
    *   `name`: `String`
    *   `gender`: `String` (e.g., "male", "female", "other")
    *   `role`: `Role` (Enum: `RIDER`, `PARTNER`, `ADMIN`)
    *   `createdAt`, `updatedAt`: Timestamps
    *   `isOnline`: `Boolean` (@default(false))
    *   `lastSeen`: `DateTime?`
    *   `currentLat`, `currentLon`: `Float?` (for live location)
    *   **Relations:**
        *   `partnerProfile`: `Partner?` (One-to-One)
        *   `ridesAsRider`: `Ride[]`
        *   `garageRequestsAsDriver`: `GarageRequest[]`
        *   `emergencyCasesAsRider`: `EmergencyCase[]`

---

### **Model: `Partner`**
*   **Purpose:** The unified profile for all partner types (Path, ResQ, Cure). Linked one-to-one with a `User`.
*   **Fields:**
    *   `id`: `String` (Primary Key, CUID)
    *   `partnerId`: `String` (Unique, human-readable e.g., CZD1234)
    *   `type`: `PartnerType` (Enum: `PATH`, `RESQ`, `CURE`)
    *   `status`: `PartnerStatus` (Enum: `PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED`)
    *   `photoUrl`: `String?`
    *   `panCard`: `String` (Unique)
    *   `aadhaarNumber`: `String` (Unique)
    *   `isCurocityPinkPartner`: `Boolean` (@default(false))
    *   `rating`: `Float` (@default(5.0))
    *   `ridesToday`, `jobsToday`, `casesToday`: `Int` (@default(0))
    *   `suspensionEndDate`: `DateTime?`
    *   **Relations:**
        *   `user`: `User` (One-to-One)
        *   `vehicle`: `Vehicle?` (One-to-One)
        *   `wallet`: `Wallet?` (One-to-One)
        *   `hospitalProfile`: `Hospital?` (One-to-One, for Cure partners)
        *   `mechanicProfile`: `Mechanic?` (One-to-One, for ResQ partners)

---

### **Model: `Vehicle`**
*   **Purpose:** Stores vehicle details for a partner.
*   **Fields:**
    *   `id`: `String` (Primary Key, CUID)
    *   `type`: `String` (e.g., "Cab (Prime)", "Bike", "Ambulance BLS")
    *   `modelName`: `String`
    *   `rcNumber`: `String` (Unique)
    *   `drivingLicence`: `String` (Unique)
    *   **Relations:**
        *   `partner`: `Partner` (One-to-One)

---

### **Model: `Hospital`**
*   **Purpose:** Specific details for a "Cure" partner.
*   `id`: `String` (Primary Key, CUID)
*   `registrationNumber`: `String` (Unique)
*   `address`: `String`
*   `totalBeds`: `Int` (@default(0))
*   `bedsOccupied`: `Int` (@default(0))
*   **Relations:**
    *   `partner`: `Partner` (One-to-One)
    *   `ambulances`: `Ambulance[]`

---

### **Model: `Ambulance`**
*   **Purpose:** An individual ambulance vehicle belonging to a hospital.
*   `id`: `String` (Primary Key, CUID)
*   `vehicleName`: `String`
*   `rcNumber`: `String` (Unique)
*   `type`: `String` (e.g., "BLS", "ALS")
*   `status`: `String` (e.g., "Available", "On-Duty")
*   **Relations:**
    *   `hospital`: `Hospital` (Many-to-One)
    *   `driver`: `AmbulanceDriver` (One-to-One)

---

### **Model: `AmbulanceDriver`**
*   **Purpose:** A driver for a specific ambulance. Separate login.
*   `id`: `String` (Primary Key, CUID)
*   `partnerId`: `String` (Unique, human-readable e.g., CZA1234)
*   `name`: `String`
*   `phone`: `String` (Unique)
*   `password`: `String`
*   **Relations:**
    *   `ambulance`: `Ambulance?` (One-to-One)

---

### **Model: `Mechanic`**
*   **Purpose:** Specific details for a "ResQ" partner.
*   `id`: `String` (Primary Key, CUID)
*   `services`: `String[]` (List of services like "Tyre Puncture", "Towing")
*   `garageName`: `String?`
*   **Relations:**
    *   `partner`: `Partner` (One-to-One)

---

### **Model: `Wallet` & `Transaction`**
*   **Purpose:** The financial engine of Curocity Bank.
*   **Model: `Wallet`**
    *   `id`: `String` (Primary Key, CUID)
    *   `balance`: `Float` (@default(0))
    *   `interestRate`: `Float` (@default(5.0))
    *   **Relations:**
        *   `partner`: `Partner` (One-to-One)
        *   `transactions`: `Transaction[]`
*   **Model: `Transaction`**
    *   `id`: `String` (Primary Key, CUID)
    *   `amount`: `Float`
    *   `type`: `TransactionType` (Enum: `CREDIT`, `DEBIT`)
    *   `description`: `String` (e.g., "Ride Fare", "Loan Disbursed", "Wallet Top-up")
    *   `timestamp`: `DateTime` (@default(now()))
    *   **Relations:**
        *   `wallet`: `Wallet` (Many-to-One)

---

### **Model: `Ride`**
*   **Purpose:** To track a single ride request for the "Path" ecosystem.
*   **Fields:**
    *   `id`: `String` (Primary Key, CUID)
    *   `pickupAddress`, `dropoffAddress`: `String`
    *   `pickupLat`, `pickupLon`, `dropoffLat`, `dropoffLon`: `Float`
    *   `status`: `RideStatus` (Enum: `SEARCHING`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
    *   `fare`: `Float`
    *   `otp`: `String`
    *   **Relations:**
        *   `rider`: `User` (Many-to-One, relation name `RiderRides`)
        *   `driver`: `User?` (Many-to-One, relation name `DriverRides`)

---

### **Model: `GarageRequest` & `EmergencyCase`**
*   **Purpose:** To track service requests for the "ResQ" and "Cure" ecosystems.
*   **Model: `GarageRequest`**
    *   Similar to `Ride`, but with `issue` (`String`), `mechanicId` (`String?`), etc.
    *   `driver`: `User` (Many-to-One relation)
*   **Model: `EmergencyCase`**
    *   Similar to `Ride`, but with `severity` (`String`), `assignedHospitalId` (`String?`), `assignedAmbulanceId` (`String?`), etc.
    *   `patient`: `User` (Many-to-One relation)

---

### **Enums**
*   Create enums for `Role`, `PartnerType`, `PartnerStatus`, `TransactionType`, and `RideStatus`.

Please generate the complete `schema.prisma` file based on these requirements.
