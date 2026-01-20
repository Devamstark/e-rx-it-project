# DevXWorld e-Rx Hub: Technical MVP Breakdown

This document provides a detailed mapping of the MVP's features to its technical component implementation.

## 1. Doctor Module
**Primary Component:** `components/doctor/DoctorDashboard.tsx`
The central hub for the Doctor's workflow. It manages state for the sub-views and handles data synchronization.

### Sub-Components & Features to Component Map
| Feature | Component / Implementation | Description |
| :--- | :--- | :--- |
| **Verification** | `DoctorVerification.tsx` | Handles the initial KYC flow. Captures Registration No, NMR UID, State Council, and Document Uploads (Degree/License). |
| **Prescription Writing** | `CreatePrescription.tsx` | The core "Smart Pad". Features: <br>• **Vitals Input:** BP, Pulse, Weight, SpO2 (Graphic sliders/inputs).<br>• **Medicine Search:** Auto-complete database of generic/brand names.<br>• **Dose Calculator:** Automatic frequency/duration logic.<br>• **Templates:** Save/Load favorite Rx patterns. |
| **Patient Management** | `PatientManager.tsx` | A CRUD interface for patient records. <br>• **Search:** Find patients by Name/Mobile.<br>• **History:** View past visits and prescriptions.<br>• **ABHA:** Input fields for National Health ID. |
| **Rx Preview** | `PrescriptionModal.tsx` | A print-ready view of the generated prescription. Generates the PDF layout with the Doctor's Letterhead and Digital Signature simulation. |
| **Appointment Queue** | *Inside Dashboard* | Managing the "Waiting Room" list. Actions: "Mark Checked In", "Start Consult", "No Show". |
| **Clinical Tools** | *Inside Dashboard* | • **BMI Calculator**: Auto-calc from Height/Weight.<br>• **Medical Certificates**: Generate Sick Leave/Fitness certs.<br>• **Lab Referrals**: Create pathology test requests. |

---

## 2. Pharmacy Module ("ERP Edition")
**Primary Component:** `components/pharmacy/PharmacyDashboard.tsx`
*Note: This is currently a monolithic component (~120KB) handling the entire Retail Pharmacy ERP logic.*

### Features Implemented
*   **E-Rx Queue (Live Feed):**
    *   Real-time polling of prescriptions sent by Doctors.
    *   **Action:** "Dispense" (Decrements stock) or "Reject".
*   **Point of Sale (POS):**
    *   **Billing Engine:** Cart management, Disc%, GST calculation.
    *   **Patient Lookup:** Links sales to registered patient profiles.
    *   **Receipt Printer:** Generates 80mm generic thermal printer CSS layout.
*   **Inventory Management:**
    *   **Master Stock:** CRUD for Medicines (Batch No, Expiry, MRP, Purchase Rate).
    *   **Low Stock Alerts:** Visual warning when qty < 10.
    *   **Expiry Tracker:** Highlights near-expiry batches.
*   **Financial Ledgers:**
    *   **Sales Returns:** Handling refunds/exchanges.
    *   **Customer Credit (Khata):** Managing patient dues and partial payments.
    *   **Supplier Logic:** *Basic implementation for tracking distributor payments.*

---

## 3. Admin Module
**Primary Component:** `components/admin/AdminDashboard.tsx`
*Note: A monolithic component handling system oversight.*

### Features Implemented
*   **User Registry (The "Gatekeeper"):**
    *   **Verification Queue:** Lists Doctors/Pharmacies with `PENDING` status.
    *   **Doc Viewer:** Inline rendering of uploaded License/Degree proofs.
    *   **Approval Logic:** State transition from `PENDING` -> `VERIFIED`.
*   **Security & Audit:**
    *   **Audit Log Viewer:** Read-only table of `audit_logs` table (Login, Data Access, Logout).
    *   **Filters:** Filter logs by Actor Role or Time range.
*   **System Stats:**
    *   High-level counters: Total Users, Total Active Rx, Today's Volume.

---

## 4. Shared / Core Components (The "Stitch" System)
Located in `components/ui/` and `components/auth/`.

*   **Authentication:** `Login.tsx` - Handles Role selection, Credentials, and 2FA/OTP simulation.
*   **Layout:** `AppShell.tsx` (New) / `Layout.tsx` (Legacy) - Contains the Sidebar, Header, and User Profile logic.
*   **Design Atoms:** `Button.tsx`, `Card.tsx` - Material 3 styled base elements.

## 5. Data Services (`services/db.ts`)
The application uses a **Service Layer Pattern**. The UI never talks to the DB directly; it calls methods in `dbService`.
*   **Sync Logic:** Determining whether to fetch from LocalStorage (Offline) or Supabase (Online).
*   **Encryption:** (Planned) Handling sensitive data processing before storage.
