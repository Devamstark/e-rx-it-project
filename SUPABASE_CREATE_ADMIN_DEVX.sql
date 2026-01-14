-- ===============================================================
-- SCRIPT: CREATE 'ADMIN' USER (Mapping to admin@devx.local)
-- ===============================================================
-- This script helps you set up a user that works with the 
-- "Just 'admin'" login feature we added to the frontend.
-- ===============================================================
-- Instructions:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User"
-- 3. Enter Email:  admin@devx.local
-- 4. Enter Password:  admin
-- 5. Click "Create User"
-- 6. COPY the 'User UID' of the new user.
-- 7. PASTE the UID below where it says REPLACE_WITH_UID_HERE.
-- 8. Run this script in the SQL Editor.
-- ===============================================================

DO $$
DECLARE
    -- PASTE YOUR COPIED UID HERE
    target_uid UUID := 'REPLACE_WITH_UID_HERE'::UUID; 
BEGIN
    INSERT INTO public.users (id, email, role, verification_status, data)
    VALUES (
        target_uid, 
        'admin@devx.local', 
        'ADMIN', 
        'VERIFIED', 
        '{"name": "System Admin"}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'ADMIN', verification_status = 'VERIFIED';
    
    RAISE NOTICE 'Admin user configured successfully linked to admin@devx.local';
END $$;
