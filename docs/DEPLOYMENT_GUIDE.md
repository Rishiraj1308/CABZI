# Deployment Guide: Next.js to Android App with Capacitor

This guide provides a step-by-step process for converting your Next.js web application into a native Android application that can be submitted to the Google Play Store. We will use **Capacitor**, a modern tool that wraps your web app in a native shell (WebView).

---

## Why Capacitor?

*   **Reuse Your Code:** You can use your entire existing Next.js web application without rewriting it.
*   **App Store Ready:** The output is a standard Android project that you can build and submit to the Google Play Store.
*   **Native Access:** You can access native device features (like Camera, Geolocation, etc.) through Capacitor's simple API.

---

## Step 1: Prepare Your Next.js App for Export

Capacitor needs a static version of your web app. You need to configure your Next.js project to produce a static HTML export.

1.  **Build the Static App:**
    Run the build command in your terminal. This will create a new folder named `out` in your project's root directory.

    ```bash
    npm run build
    ```
    This command will generate the necessary static files in the `out/` directory, which Capacitor will use.

---

## Step 2: Add Capacitor to Your Project

Now, we'll install Capacitor and initialize it.

1.  **Install Capacitor CLI:**
    ```bash
    npm install @capacitor/cli @capacitor/core
    ```

2.  **Initialize Capacitor:**
    The `npx cap init` command will ask you for your app name and an app ID (usually in reverse domain style, e.g., `com.curocity.app`).

    ```bash
    npx cap init
    ```
    *   **App Name:** Curocity
    *   **App ID:** com.curocity.app
    *   **Web Asset Directory:** When prompted, enter `out` (this is the folder Next.js created in Step 1).

---

## Step 3: Add the Android Platform

This command will create the native Android project for you.

1.  **Install the Android Package:**
    ```bash
    npm install @capacitor/android
    ```

2.  **Add the Android Platform:**
    This command creates an `android` folder in your project. This folder is a complete, standalone Android Studio project.
    ```bash
    npx cap add android
    ```

---

## Step 4: Sync and Open in Android Studio

Before you can add an icon, you must sync your web assets.

1.  **Sync Your Web App:**
    Before opening in Android Studio, you must run this command to copy your web app's static files into the native project.
    ```bash
    npx cap sync
    ```
    **Important:** You must run `npm run build` and then `npx cap sync` every time you make changes to your Next.js code.

2.  **Open in Android Studio:**
    Open Android Studio and choose "Open an existing project". Navigate to and select the `android` folder that Capacitor created inside your project directory.

---

## Step 5: Add App Icon (Important Step)

You need a dedicated app icon for the Android app. While I cannot create the image file for you, here is how you can do it easily.

1.  **Create the Icon Image:**
    *   **Size:** Your source image should be a square, at least **1024x1024 pixels**.
    *   **Design:** Keep the design simple. Android uses "adaptive icons", so the system will shape your icon (circle, square, squircle). Make sure your main logo is in the center, with plenty of empty space around it.
    *   **Tool:** You can use a free online tool like [Canva](https://www.canva.com/) or a more advanced one like Figma to create your logo. Save it as a `.png` file.

2.  **Generate Different Icon Sizes (The Easy Way):**
    Capacitor has a built-in tool to automatically generate all the required icon sizes for Android from your single source image.
    *   **Install the tool:**
        ```bash
        npm install @capacitor/assets
        ```
    *   **Place your icon:** Save your `1024x1024.png` icon in a new folder called `assets` in your project's root directory. For example, save it as `assets/icon.png`.
    *   **Run the command:** This single command will generate all the necessary icons and splash screens.
        ```bash
        npx @capacitor/assets generate --icon-path assets/icon.png --android
        ```

3.  **Verify in Android Studio:**
    After running the command, open your `android` project in Android Studio. You will see the new icons in the `app/src/main/res/mipmap-` folders.

---

## Step 6: Build and Publish

You are now ready to build the final Android app.

1.  **Run the Build:**
    Once the project is open and synced in Android Studio, you can:
    *   Build the project (`Build > Make Project`).
    *   Run it on an emulator or a connected physical device.
    *   Generate a signed APK or App Bundle (`Build > Generate Signed Bundle / APK...`) for publishing to the Google Play Store.

---

**Conclusion:** By following these steps, you can successfully package your "Curocity" Next.js application into a native Android app with a custom icon, leveraging your existing web development efforts to reach a wider audience on the Play Store.
