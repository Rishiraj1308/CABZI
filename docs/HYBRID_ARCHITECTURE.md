# Curocity: The Hybrid & Polyglot Persistence Architecture

## 1. The Problem: One Database Can't Rule Them All

As Curocity scales from a prototype to a massive, production-grade application, relying on a single database (like Firestore) for every task becomes inefficient, expensive, and risky.

*   **Real-time databases (Firestore)** are excellent for live updates but are not ideal for complex queries, relational data (like financial ledgers), or large-scale analytics.
*   **Relational databases (PostgreSQL)** are perfect for transactional integrity (money matters) but are not built for the kind of real-time "fan-out" messaging needed for ride requests.

Using the wrong database for the job leads to high costs, slow performance, and development complexity.

---

## 2. The Solution: "Polyglot Persistence" - The Right Tool for the Right Job

We will adopt a **Polyglot Persistence** model, which means using multiple, specialized databases, each handling the task it's best suited for. This is the architecture used by large-scale applications like Netflix, Uber, and Airbnb.

Our system will be a **Hybrid Model**, leveraging both Firebase and a managed cloud platform (like Google Cloud Platform - GCP) to get the best of all worlds.

### Our Specialist Databases:

1.  **Firebase Firestore: The Nervous System (For Hot, Real-time Data)**
    *   **Database Type:** NoSQL, Document-based.
    *   **Purpose:** Anything that needs to be reflected on the user's screen **instantly**. This is for temporary, "in-the-moment" data.
    *   **Use Cases:**
        *   Live Ride Requests (`rides` collection).
        *   Live Location Tracking of partners.
        *   Real-time Chat between rider and driver.
    *   **Why?** Its real-time `onSnapshot` listeners are unparalleled for this purpose. We will keep it for what it does best.

2.  **PostgreSQL (via Cloud SQL): The Brain (For Transactional, Relational Data)**
    *   **Database Type:** Relational (SQL).
    *   **Purpose:** Our primary, permanent **"source of truth"**. It guarantees data integrity (ACID compliance), which is critical for financial data.
    *   **Use Cases:**
        *   **User & Partner Profiles:** All user and partner details, verification status, documents.
        *   **Curocity Bank:** The entire financial ledger—wallet balances, loans, EMIs, interest calculations. All transactions **must** be ACID-compliant.
        *   **Ride History:** Permanent record of all completed or cancelled rides.
        *   **Subscriptions:** Managing partner subscription plans and validity.
    *   **Why?** PostgreSQL is rock-solid for financial data and complex queries (e.g., "Show me all partners whose earnings were > ₹2000 last week").

3.  **Redis (via Memorystore): The Reflexes (For Caching & Ephemeral Data)**
    *   **Database Type:** In-Memory, Key-Value Store.
    *   **Purpose:** Blazing-fast access to frequently needed, temporary data. Its main job is to reduce the load on PostgreSQL.
    *   **Use Cases:**
        *   **User Sessions & JWTs:** Storing login tokens.
        *   **OTPs:** Storing One-Time Passwords for a few minutes.
        *   **Cache:** Caching frequently accessed profiles or settings.
        *   **Leaderboards:** Quickly calculating and storing the top-performing partners.
    *   **Why?** It's incredibly fast. Reading from Redis is thousands of times faster than reading from a disk-based database like PostgreSQL.

4.  **Google BigQuery: The Crystal Ball (For Analytical Data)**
    *   **Database Type:** Data Warehouse.
    *   **Purpose:** To analyze massive amounts of historical data ("cold data") to find business insights without slowing down the main application.
    *   **Use Cases:**
        *   Analyzing ride patterns across a whole city to predict surge areas.
        *   Running business intelligence (BI) reports on revenue, user growth, and partner churn over years.
        *   Machine Learning model training.
    *   **Why?** It's built to query terabytes of data in seconds, a task that would cripple a normal transactional database.

---

## 3. The New Data Flow: How The System Avoids Confusion

Here's how these databases work together in a real-world scenario, ensuring there is no confusion. The backend server (e.g., using Cloud Functions or a Node.js server) acts as the central "brain" that directs traffic.

**Scenario 1: User Login**
1.  **Rider enters phone ->** The server generates an OTP.
2.  The OTP is stored in **Redis** with a 5-minute expiry. (Fast, temporary storage).
3.  **Rider enters correct OTP ->** The server checks **PostgreSQL** to see if a `User` profile exists. (PostgreSQL is the source of truth for user data).
4.  The server creates a session token (JWT) and stores it in **Redis** for quick verification in subsequent requests.

**Scenario 2: Ride Request & Completion**
1.  **Rider books a ride ->** The ride request is written to **Firestore**. This is a "hot" event.
2.  A `rideDispatcher` **Cloud Function** (the brain) triggers.
3.  The Function queries **PostgreSQL** to find the 5 nearest, best-rated drivers (using PostGIS for geo-queries, as PostgreSQL is the source of truth for partner data).
4.  The Function sends push notifications to only those 5 drivers.
5.  A driver accepts the ride, updating the document in **Firestore**.
6.  The ride progresses, with live location updates happening in **Firestore**.
7.  **Driver ends trip ->** A "ride completed" event is triggered.
8.  Another **Cloud Function** reads the final ride data from **Firestore**.
9.  It then initiates a transaction in **PostgreSQL** to:
    *   Add the fare to the driver's wallet (ACID-compliant transaction).
    *   Log the transaction in the financial ledger.
    *   Save the completed ride to the permanent `RideHistory` table.
10. Finally, the temporary ride document in **Firestore** can be deleted or moved to an archive.

**Scenario 3: Admin Viewing Reports**
1.  **Admin opens "Financial Audit" page ->** The request goes to the backend server.
2.  The server queries **PostgreSQL** to generate the P&L statement and revenue charts, as it holds all the permanent financial data.
3.  **Admin opens "Market Trends" page ->** The server queries **Google BigQuery** to analyze city-wide ride patterns from months of historical data.

This clear separation of concerns ensures that the system is not confused. Each database has a specialized role, and the backend server is the intelligent orchestrator that knows which database to use for which job. This architecture provides Curocity with the scalability of a major tech company, ensuring our app is fast, reliable, and cost-effective as we grow.
