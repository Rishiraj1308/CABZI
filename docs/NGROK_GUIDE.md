# ngrok Guide: How to Connect Your Local n8n to the Live App

This guide explains how to use `ngrok`, a powerful tool that creates a secure, public URL for a service running on your local machine. We will use it to connect your local n8n workflow to the live Cabzi application for testing.

---

## Why `ngrok`?

-   **Problem:** Your n8n workflow is running on your computer at `localhost:5678`. The live Cabzi application on the internet has no way to send data to this private address.
-   **Solution:** `ngrok` creates a "tunnel" from a public URL (e.g., `https://random-text.ngrok.io`) directly to your `localhost:5678`. When Cabzi sends data to the public URL, it instantly appears in your local n8n workflow.

---

## The 3 Simple Steps

### Step 1: Download & Unzip `ngrok`

1.  **Download:** Go to the official ngrok download page: [**https://ngrok.com/download**](https://ngrok.com/download)
2.  **Select Your OS:** Download the version for your operating system (Windows, Mac, Linux).
3.  **Unzip:** Unzip the downloaded file. You will get a single executable file named `ngrok` (or `ngrok.exe` on Windows). There is nothing to install.

### Step 2: Connect Your Account (One-Time Setup)

`ngrok` now requires a free account to use it.

1.  **Sign Up:** Go to the [ngrok Dashboard](https://dashboard.ngrok.com/signup) and create a free account.
2.  **Get Your Authtoken:** After signing up, go to the [**"Your Authtoken"**](https://dashboard.ngrok.com/get-started/your-authtoken) section of your dashboard.
3.  **Run the Command:** Copy the command shown on that page (it will look like `ngrok config add-authtoken <YOUR_TOKEN>`) and run it **once** in your terminal. This saves your token to your computer so you don't have to log in again.

### Step 3: Start the Tunnel

This is the command you will run every time you want to connect n8n.

1.  **Open Terminal:** Open your computer's terminal (Command Prompt, PowerShell, or Terminal).
2.  **Navigate to Folder (if needed):** If the `ngrok` file is not in your system's PATH, you may need to navigate to the folder where you unzipped it.
3.  **Run the Magic Command:** Type the following command and press Enter. `5678` is the default port n8n uses.

    ```bash
    ngrok http 5678
    ```
    *(On Mac/Linux, if you get a "permission denied" error, you may need to run `./ngrok http 5678` instead).*

4.  **Copy the URL:** The terminal will display a session status screen. Look for the line that says **"Forwarding"** and copy the URL that starts with `https://`. It will look something like this:
    `https://1a2b-3c4d-5e6f-7g8h.ngrok-free.app`

### You're Live!

You now have a public URL. You can paste this URL into your `.env` file as the `N8N_WEBHOOK_URL` to connect the Cabzi app directly to your local n8n workflow. Any event triggered in the app will now be received by your local n8n instance.