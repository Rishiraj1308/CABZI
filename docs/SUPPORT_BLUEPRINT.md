# Cabzi: The Unified Support Center Blueprint

This document outlines the complete architecture and workflow for the Cabzi Support Center. It is designed to handle queries from both Riders and Partners seamlessly, providing a single, efficient platform for the customer support team.

---

## 1. The User's Journey (Submitting a Query)

This flow is identical for both **Riders** and **Partners**.

**Step 1: Initiate Support**
- The user navigates to the "Support" or "Help" section within their respective app interface (Rider App or Partner App).
- They are presented with options like FAQs, but the primary option is **"Chat with AI Support Bot"**.

**Step 2: Interact with the AI Bot**
- The user starts a conversation with the AI bot.
- The user types their problem or question (e.g., "My payment failed but money was debited," or "I am not getting enough rides.").

**Step 3: Automatic Ticket Creation**
- The moment the user sends their first message, the system **automatically logs a ticket** in the background.
- **How it works:**
    - The system captures the user's message (`query`).
    - It automatically attaches the user's details from their session (`customerName`, `customerPhone`, `userType` - 'rider' or 'partner').
    - A unique `ticketId` is generated (e.g., `TKT-R-1692...` for a rider, `TKT-P-1692...` for a partner).
    - The initial `status` is set to **`Pending`**.
    - This entire object is saved as a new document in the `supportQueries` collection in Firestore.

**Step 4: User Receives Confirmation**
- The AI Bot provides an immediate, helpful response.
- **Crucially**, the bot's response includes the generated **`ticketId`**.
- **Example Bot Response:** *"Thank you, [User's Name]. Your query has been logged with Ticket ID: **TKT-R-1692581**. A customer support executive will connect with you shortly."*
- This gives the user instant assurance that their issue has been officially recorded.

---

## 2. The Database: `supportQueries` Collection

This Firestore collection is the single source of truth for all support tickets.

**Document Structure:**

```json
{
  "id": "auto-generated-firestore-id",
  "ticketId": "TKT-P-1692582",
  "customerName": "Ramesh Kumar",
  "customerPhone": "+919876543210",
  "userType": "partner", // Can be 'rider' or 'partner'
  "query": "Sir, my earnings from yesterday are not reflecting in my wallet. Please check.",
  "status": "Pending", // Can be 'Pending', 'In Progress', 'Resolved'
  "createdAt": "August 21, 2024 at 3:10:45 PM UTC+5:30", // Firestore Timestamp
  "assignedTo": "support_executive_id_01", // (Future Scope)
  "resolutionNotes": "Checked wallet transactions. Amount was credited after a 2-hour delay. Informed partner." // (Future Scope)
}
```

---

## 3. The Admin Panel: The Executive's Workspace (`/admin/support`)

This is the command center for the support team.

**UI & Functionality:**

*   **Live Query Table:**
    *   The panel displays a real-time table that listens (`onSnapshot`) to the `supportQueries` collection.
    *   Queries are sorted with the **newest `Pending` tickets at the top**.

*   **Table Columns:**
    *   **Ticket ID:** The unique ticket identifier.
    *   **User Details:**
        *   Shows the customer's name and phone number.
        *   Includes a small, clear **icon** (`User` for rider, `Car` for partner) to instantly identify the user type.
    *   **Query:** A truncated (shortened) version of the user's message to save space.
    *   **Status:** A colored `Badge` to show the current status:
        *   **`Pending`** (Red)
        *   **`In Progress`** (Yellow)
        *   **`Resolved`** (Green)
    *   **Actions:** A `DropdownMenu` (`...` icon) for each ticket.

*   **Executive Actions:**
    *   **Connect:** The "Actions" menu has two options:
        1.  **"Chat with Customer"** (Future Scope: Opens an internal chat window).
        2.  **"Call Customer"** (A simple `tel:` link that uses the stored `customerPhone`).
    *   **Update Status:** The "Actions" menu allows the executive to change the ticket's status.
        *   Clicking "Set to In Progress" updates the `status` field in Firestore to `In Progress`.
        *   Clicking "Mark as Resolved" updates the `status` field to `Resolved`.
        *   These changes **instantly and automatically** update the view for all other executives using the panel.

This blueprint creates a robust, scalable, and professional support ecosystem, ensuring that no customer or partner query is ever missed.
