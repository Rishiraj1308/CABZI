# Cabzi Admin: The Complete Workflow & Improvements Guide

This document provides a clear, step-by-step guide on the daily workflows, responsibilities, and advanced features of a Cabzi Admin. The admin panel acts as the central command system of the entire CPR (Cure-Path-ResQ) ecosystem.

## 1. Admin Login & Security

**Access:** Secure, non-public route (`/login?role=admin`).

**Authentication:** Email + strong password + optional 2FA (OTP / Authenticator app).

**Role-Based Access:**
- **Platform Owner:** Full control (all modules).
- **Finance Manager:** Only financial dashboards & P&L.
- **Support Staff:** Ticket resolution & partner communication.

**Improvements:**
- Auto-logout after inactivity.
- Activity logs for every admin action.
- Alerts on suspicious login attempts.

## 2. Partner Verification (The Gatekeeper)

**Step 1: Notification of New Applications**
- **Unified Partner Management** (`/admin/partners`) shows new driver, mechanic, or hospital applications with `Pending` badge.
- Automatic alerts for new applications via email/Slack.

**Step 2: Review & Validation**
- **Partner Ledger / Details View:** shows all personal, vehicle/business, and document info.
- **AI-assisted verification:**
    - OCR auto-check for PAN, Aadhaar, RC.
    - Risk scoring for suspicious entries.

**Step 3: Take Action**
- **Approve:** Partner verified, can start accepting jobs.
- **Reject:** Invalid documents → rejection message sent automatically.
- **Suspend:** Temporary block for policy violation (auto expiry after 7 days or manual).

**Improvements:**
- Auto reminders for document expiry (licence, insurance, insurance renewal).
- Bulk approvals/rejections for mass onboarding.
- Historical verification trail for audit compliance.

## 3. Live Operations Monitoring

**Step 1:** Open **Live Map** (`/admin/map`) → real-time city view.

**Step 2:** Monitor Activity
- GPS tracking of all online Path drivers, ResQ mechanics, and Cure ambulances.
- Live trip tracking with rider location.

**Step 3: Hotspot Analysis & Alerts**
- Density tooltips per 5 km radius (drivers, riders, mechanics).
- **Auto alerts:**
    - High-demand low-supply areas → push driver incentives.
    - SOS / accidents → highlight on top of map.
- **Predictive AI:** forecast demand spikes based on historical data.

## 4. Support Ticket Management

**Step 1:** Monitor **Support Center** (`/admin/support`)
- Tickets sorted by priority (Pending → High → Medium → Low).

**Step 2: Triage & Connect**
- **Actions → Call Customer / Chat** (internal interface).
- Auto-tag tickets by category: Payment / Ride Issue / Safety / App Bug.

**Step 3: Resolve & Close**
- Add internal notes (e.g., refund processed).
- Change ticket status → **Resolved** (green).

**Improvements:**
- **SLA Timer** → auto-escalation for unresolved tickets.
- **AI-assisted suggested replies** to save time.
- Historical ticket analytics (common issues, average resolution time).

## 5. Financial Audit & Partner Wallets

**Step 1:** Review P&L (`/admin/audit`) → revenue vs. expenses visualization.

**Step 2:** Add Company Expenses (`/admin/accounts`) → instant ledger update.

**Step 3:** Monitor Wallets & Loans (`/admin/bank`) →
- Track Cabzi float, disbursed loans, repayment statuses.

**Improvements:**
- Auto-reconciliation with payment gateways.
- **Fraud detection alerts** (unusual refund or withdrawal patterns).
- **Subscription revenue dashboard** (drivers’ subscription model).
- **Loan risk scoring** → AI predicts default probability.

## 6. Operations Efficiency & Automation

- **Shift management** for support & operations staff.
- **Bulk partner actions** (approve, reject, suspend).
- **Incentive push** to partners in high-demand zones.
- **Auto-suspend** low-rating partners (<2.5 rating over 10 trips).
- **Document expiry reminders** (insurance, licence).

## 7. Audit & Compliance

- Every admin action logged (approve/reject/suspend/payment edit).
- Role-based access: finance vs support vs operations.
- One-click report export (Excel/CSV) for audits and board meetings.
- GDPR & DPDP 2023 compliance for user data.

---

## ✅ Summary:

- Admin Panel is now **proactive, AI-assisted, and audit-ready**.
- Manual workflows are automated wherever possible.
- Real-time operations monitoring + predictive analytics increase efficiency.
- Security, compliance, and auditability ensure enterprise-grade operations.