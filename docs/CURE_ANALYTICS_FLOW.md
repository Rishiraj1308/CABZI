# Curocity: CURE Analytics Data Flow

This document outlines the step-by-step data flow and logic for the Hospital Analytics dashboard.

## The Goal: From Raw Data to Smart Decisions

The main purpose of the analytics page is to answer critical questions for a hospital manager:
*   "Where do most of our emergencies happen?" (Heatmap)
*   "Are we reaching patients faster or slower in certain areas?" (Response Time by Zone)
*   "When are our busiest hours?" (Peak Hour Analysis)

To answer these, we need to collect and process data from every emergency case.

---

### **Step 1: Data Collection (The Source of Truth)**

Every time a user makes an SOS request that your hospital handles, a document is created in the `emergencyCases` collection in Firestore. This document is our "source of truth." For analytics, we would store these key pieces of information for every single case:

*   **`caseId`**: The unique ID for the emergency (e.g., `CASE-1694...`).
*   **`location`**: The exact `GeoPoint` (latitude, longitude) where the emergency occurred.
*   **`assignedPartner.id`**: Your hospital's unique ID.
*   **`status`**: The final status (e.g., `completed`, `cancelled`).
*   **Timestamps (Most Important):**
    *   `createdAt`: When the user pressed the SOS button.
    *   `acceptedAt`: When your staff clicked "Accept".
    *   `arrivedAtPatientAt`: When the ambulance reached the patient's location.
    *   `completedAt`: When the patient was successfully brought to the hospital.

---

### **Step 2: Data Processing (The "Brain")**

The raw data from Step 1 isn't a report; it's just a log. To create the charts and stats, we need to process it. This would happen in the backend.

A **scheduled Cloud Function** would run automatically every night (e.g., at 2 AM). This function would:

1.  **Read all of yesterday's `completed` cases** from the `emergencyCases` collection.
2.  **Calculate Key Metrics** for each case:
    *   **`Response Time`**: The difference in minutes between `acceptedAt` and `arrivedAtPatientAt`. This tells us how fast your ambulance was.
    *   **`Dispatch Time`**: The difference between `createdAt` and `acceptedAt`. This tells us how fast your staff responded.
3.  **Aggregate the Data:** The function would then group all of yesterday's data and update a separate collection, let's call it `analytics_reports`. A document in this collection might look like this:

    ```json
    // Document ID: "2024-09-05"
    {
      "date": "2024-09-05",
      "totalCases": 52,
      "avgResponseTime": 8.5, // minutes
      "casesByHour": { "08": 5, "09": 7, "17": 12, ... },
      "heatmapPoints": [ 
        { "lat": 28.5, "lon": 77.2, "intensity": 3 },
        { "lat": 28.4, "lon": 77.1, "intensity": 5 } 
      ]
    }
    ```

---

### **Step 3: Data Presentation (The Dashboard)**

Now, when you open the `/cure/analytics` page, it becomes very simple and fast:

1.  The page **does not** read thousands of individual case documents.
2.  Instead, it reads the pre-calculated, aggregated data from our `analytics_reports` collection.
3.  It then uses this clean, summarized data to instantly draw the charts:
    *   The `heatmapPoints` array is used to create the Heatmap.
    *   The `avgResponseTime` is shown in the Stat Card.
    *   The `casesByHour` object is used to create the Peak Hours chart.

This architecture ensures that your analytics page loads quickly and doesn't cost a lot in database reads, no matter how much data you have.
