-- DANGER: THIS SCRIPT DELETES ALL DATA FROM THE SYSTEM
-- Run this in the Supabase SQL Editor to start fresh.

-- 1. Clear Clinical Data (Doctor Side)
TRUNCATE TABLE patients CASCADE;
TRUNCATE TABLE prescriptions CASCADE;
TRUNCATE TABLE lab_referrals CASCADE;
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE med_certificates CASCADE;

-- 2. Clear Pharmacy Data (Pharmacy Side)
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE suppliers CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE inventory CASCADE; -- If exists as a separate table

-- 3. Optional: Clear Users (If you want to delete all registered accounts too)
-- TRUNCATE TABLE users CASCADE; 
-- DELETE FROM auth.users WHERE email != 'admin'; -- Keep admin if needed

-- Note: If any table doesn't exist, the script might error on that line. 
-- You can run lines individually or ignore errors for missing tables.
