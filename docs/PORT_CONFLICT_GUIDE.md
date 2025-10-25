# How to Fix "Port in Use" Emulator Errors

This guide provides a clear, step-by-step process for resolving "port is already in use" errors when starting the Firebase Local Emulator Suite. This usually happens when a previous emulator session did not shut down cleanly, leaving a "zombie" process holding onto the port.

---

## The Problem

When you run `firebase emulators:start`, you might see an error like:
`Error: Could not start Authentication Emulator, port taken.`
`Error: Port 9099 is already in use.`

This means another application is using the port that the emulator needs.

## The Solution: Find and Kill the Process

We need to find the Process ID (PID) of the application that's using the port and then "kill" (forcefully stop) that process.

### Step 1: Find the Process ID (PID)

Open your terminal and use the `lsof` (List Open Files) command. This command is very powerful for figuring out which process is using which port.

Run the following command for each port that is giving you trouble. Replace `<PORT_NUMBER>` with the actual port number from the error message.

```bash
lsof -i :<PORT_NUMBER>
```

**Common Curocity Emulator Ports:**
*   **Auth Emulator Port:** `lsof -i :9100`
*   **Firestore Emulator Port:** `lsof -i :8082`
*   **Functions Emulator Port:** `lsof -i :5002`
*   **Storage Emulator Port:** `lsof -i :9200`
*   **Emulator UI Port:** `lsof -i :4002`

**Example:**
If you get an error for the Auth Emulator, you would run:
```bash
lsof -i :9100
```

The output will look something like this:
```
COMMAND   PID      USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
java    37123    youruser  123u IPv6 0x...      0t0  TCP localhost:9100 (LISTEN)
```
In this example, the **PID** is `37123`. This is the number we need.

### Step 2: Kill the Process

Now that you have the PID, use the `kill` command to stop it. The `-9` flag is a "force kill" signal, which is very effective.

Replace `<PID>` with the number you found in Step 1.

```bash
kill -9 <PID>
```

**Example (using the PID from above):**
```bash
kill -9 37123
```

This command will not show any output if it's successful.

### Step 3: Restart the Emulators

After killing all the problematic processes, you can now restart the Firebase emulators without any issues.

```bash
firebase emulators:start --only firestore,auth,functions,storage
```

The emulators should now start up successfully. This process is a reliable way to clean up your development environment whenever you run into port conflicts.
