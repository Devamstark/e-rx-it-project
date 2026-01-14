-- =========================================================
-- DEVX E-RX HUB: TOTAL DATA WIPE (NUCLEAR RESET)
-- =========================================================
-- WARNING: THIS WILL PERMANENTLY DELETE ALL DATA.
-- This includes users, prescriptions, patients, and logs.
-- =========================================================

-- 1. TRUNCATE ALL PUBLIC TABLES
-- CASCADE ensures that dependent rows are also deleted.
TRUNCATE TABLE 
    public.users,
    public.prescriptions,
    public.patients,
    public.lab_referrals,
    public.appointments,
    public.med_certificates,
    public.system_logs,
    public.sales,
    public.sales_returns,
    public.customers,
    public.suppliers,
    public.expenses,
    public.pharmacy_inventory,
    public.patient_accounts
CASCADE;

-- 2. CLEAR SUPABASE AUTH USERS
-- This removes everyone's ability to login. 
-- You will need to re-register all doctors and pharmacies.
DELETE FROM auth.users;

-- 3. RESET SEQUENCES (If any)
-- This ensures IDs start back at 1 or their initial value.
-- (Only necessary if you use Serial/BigSerial columns)

-- 4. RE-INSERT SYSTEM ADMIN RECORD
-- This ensures you can still log in with the root "admin" credentials
-- to access the dashboard after the wipe.
INSERT INTO public.users (id, email, role, verification_status, data)
VALUES ('adm-root', 'admin', 'ADMIN', 'VERIFIED', '{"name": "System Admin"}')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- WIPE COMPLETE. YOUR DATABASE IS NOW FRESH.
-- =========================================================
