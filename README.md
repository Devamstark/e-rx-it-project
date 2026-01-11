# DevXWorld e-Rx Hub 🏥

**DevXWorld e-Rx Hub** is a next-generation, cloud-native healthcare ecosystem designed to bridge the gap between Doctors, Pharmacies, and Patients. Built with a focus on security, legal compliance, and operational efficiency, it serves as a central hub for verified medical practitioners and pharmacists in India.

---

## 👨‍💼 Founder & Vision
**Devam Trivedi**  
*Founder, DevXWorld*

> "Our mission is to digitize the prescription lifecycle while ensuring the highest standards of data privacy and medical integrity. DevXWorld is not just a portal; it is a promise of safer, faster, and more transparent healthcare for everyone." — **Devam Trivedi**

---

## 🚀 Core Features

### 🩺 For Doctors (Verified RMPs)
- **Smart Rx Pad**: AI-assisted prescription generation with drug interaction checks.
- **Patient Management**: Secure longitudinal patient records and ABHA integration.
- **Queue Management**: Real-time waiting room and appointment tracking.
- **Medical Documentation**: Digital sick leave, fitness certificates, and lab referrals.

### 💊 For Pharmacies (ERP Edition)
- **POS & Billing**: Touch-friendly point-of-sale with thermal receipt printing.
- **Inventory Control**: Real-time stock tracking, expiry alerts, and batch management.
- **Financial Ledger**: Managed customer credit (Khata) and supplier accounts.
- **Analytics**: Business intelligence for stock reordering and sales insights.

### 🧑‍🤝‍🧑 For Patients (Secure Portal)
- **App Access**: Secure login to view historical prescriptions and reports.
- **Direct Connect**: Instant access to pharmacy-verified receipts.
- **Safety**: Automated flags for clinical safety and compliance.

---

## 🛡️ Security & Compliance
- **Legally Compliant**: Strictly adheres to the **DPDP Act 2023**, **IT Act 2000**, and **Telemedicine Practice Guidelines 2020**.
- **Audit Ready**: Forensic-level logging of every transaction with immutable timestamps.
- **Role Isolation**: Strict RBAC (Role Based Access Control) ensuring data silos between doctors and shops.
- **Secure Authentication**: 2FA (Two-Factor Authentication) for all roles.

---

## 🛠️ Technology Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (Premium Glassmorphism Design)
- **Backend & Database**: Supabase (Cloud) + Local Storage (Offline-First)
- **AI Engine**: Google Gemini 2.5 Flash
- **Icons & Visuals**: Lucide React & Recharts

---

## 💻 Working Locally

1. **Clone the Repo**
2. **Setup Environment**:
   Create a `.env` file with:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   GEMINI_API_KEY=your_google_ai_key
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Run Development Server**:
   ```bash
   npm run dev
   ```

---

*© 2026 DevXWorld. All rights reserved. Designed and developed by Devam Trivedi.*
