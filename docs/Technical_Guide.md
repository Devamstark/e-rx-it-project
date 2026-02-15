# ⚙️ Technical Guide

## System Architecture
DevXWorld e-Rx Hub is a React 19 SPA using Supabase for backend services. It implements a hybrid data strategy, allowing offline-first capabilities via LocalStorage fallback with Cloud Synchronization for critical data.

### Tech Stack
*   **React 19** (TypeScript)
*   **Tailwind CSS**
*   **Supabase** (PostgreSQL + Auth)
*   **Vite** Build Tool

## Database Setup (SQL)
Run the initialization script (found in `/database/MASTER_DATABASE_SETUP.sql`) in the Supabase SQL Editor.

## Key Modules
*   **dbService (services/db.ts)**: Abstracted Data Layer. Handles switching between Cloud and Local storage transparently. Synchronizes ERP data (Sales, Inventory) to Cloud on load.
*   **App.tsx**: Main entry point handling routing, session multi-tenant states, and global event listeners.
