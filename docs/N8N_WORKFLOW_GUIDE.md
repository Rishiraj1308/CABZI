# n8n Workflow Integration Guide for Curocity

This document explains the "Why" and "How" of integrating **n8n**, a powerful workflow automation tool, into the Curocity ecosystem. It allows the non-technical operations team to build, test, and deploy automated business logic without writing code.

---

## The "Why": Giving Power to the Operations Team

Imagine the operations team wants to implement a new business rule: *"When there is a high demand for rides in Cyber Hub, Gurgaon, automatically send a push notification to all available drivers in a 5km radius offering them a ₹50 incentive bonus for the next hour."*

**The Traditional Way (Slow & Expensive):**
1.  The Ops team writes a proposal document.
2.  The proposal goes to the Product Manager.
3.  The Product Manager creates a ticket for the Tech team.
4.  A developer writes the backend code for this logic.
5.  The code is tested, deployed, and finally goes live.
_This process can take days or even weeks._

**The n8n Way (Fast & Empowering):**
1.  The Ops team **drags and drops nodes** in the n8n visual interface to create this exact logic.
2.  They connect a "Webhook" node as the trigger.
3.  They add a "Send Push Notification" node.
4.  They click "Activate".
_The new rule is live in **minutes**, not weeks._

**n8n gives our business the agility of a startup, allowing us to rapidly experiment with incentives, alerts, and partner communications.**

---

## The "How": A Step-by-Step Technical Guide

### Step 1: Setting up the Local n8n Environment

For development, you will run n8n on your own machine.

1.  **Install n8n:** Make sure you have Node.js installed. Then, open your terminal and run this one-time command:
    ```bash
    npm install n8n -g
    ```
2.  **Start n8n:** To run the n8n editor, simply type this command in your terminal:
    ```bash
    n8n
    ```
3.  **Access the Editor:** Open your web browser and go to `http://localhost:5678`. You will see the n8n visual workflow editor.

### Step 2: Creating a Workflow with a Webhook Trigger

1.  **New Workflow:** In the n8n editor, create a new, blank workflow.
2.  **Add a Webhook Node:** Click the `+` button and add a "Webhook" node. This node is the entry point for our data.
3.  **Configure the Webhook:**
    *   Keep the "Authentication" as "None".
    *   Keep the "HTTP Method" as "POST".
4.  **Get the Test URL:** The Webhook node will show you a **Test URL**. It will look like `http://localhost:5678/webhook-test/...`.
    *   **This URL only works on your local machine.** We cannot use it directly with our live application. This is where `ngrok` comes in.

### Step 3: Exposing Your Local n8n to the Internet with `ngrok`

We need a public URL that forwards traffic to our local n8n instance.

1.  **Install & Configure `ngrok`:** Follow the simple instructions in the `NGROK_GUIDE.md` document.
2.  **Start the Tunnel:** Run the following command in a **new terminal window** (do not close your n8n terminal):
    ```bash
    ngrok http 5678
    ```
3.  **Get the Public URL:** `ngrok` will give you a public "Forwarding" URL, like `https://<random-id>.ngrok-free.app`. **This is the magic URL.**

### Step 4: Connecting the Curocity App to Your n8n Workflow

1.  **Update the `.env` file:** Open the `.env` file in the Curocity project's root directory.
2.  **Set the Webhook URL:** Find the `N8N_WEBHOOK_URL` variable and set its value to the public `ngrok` URL you copied, making sure to add `/webhook/high-demand` at the end. For example:
    ```
    N8N_WEBHOOK_URL="https://<random-id>.ngrok-free.app/webhook/high-demand"
    ```
3.  **Restart the App:** Stop and restart the Next.js development server for the changes to take effect.

### Step 5: Testing the Full Flow

1.  **Listen for Data:** In your n8n Webhook node, click the **"Listen for Test Event"** button. Your n8n is now waiting for data.
2.  **Trigger the Event:** In the Curocity Admin Panel, go to the **Live Map** (`/admin/map`). Click the **"Simulate High Demand"** button.
3.  **See the Magic:** Go back to your n8n browser tab. You will see that the event data (e.g., `{ "zoneName": "Cyber Hub, Gurgaon" }`) has been successfully received by your local workflow!

You can now add more nodes in n8n (like "Send Email", "Send Slack Message", or even a "Push Notification" node) to build powerful automations based on events from the Curocity app.
