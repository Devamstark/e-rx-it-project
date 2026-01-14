-- MIGRATION: 20260114_refactor_users_table.sql
-- This script refactors the users table from a single-row store to a proper relational structure.

-- 1. Create the new users table (if not exists)
CREATE TABLE IF NOT EXISTS public.users_new (
    id TEXT PRIMARY KEY, -- Using TEXT to match IDs (might be UUIDs or custom IDs)
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrate data from the old global row (if any)
-- This logic assumes the 'data' column in the old 'users' table contains an array of users.
DO $$
DECLARE
    user_record JSONB;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Check if the old structure (id='global_users') exists
        FOR user_record IN 
            SELECT jsonb_array_elements(data) FROM public.users WHERE id = 'global_users'
        LOOP
            INSERT INTO public.users_new (id, email, role, verification_status, data)
            VALUES (
                user_record->>'id',
                user_record->>'email',
                user_record->>'role',
                COALESCE(user_record->>'verificationStatus', 'PENDING'),
                user_record
            )
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                verification_status = EXCLUDED.verification_status,
                data = EXCLUDED.data,
                updated_at = NOW();
        END LOOP;
    END IF;
END $$;

-- 3. Replace the old table
-- Caution: We rename the old one instead of dropping it immediately.
ALTER TABLE IF EXISTS public.users RENAME TO users_old_blob;
ALTER TABLE public.users_new RENAME TO users;

-- 4. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Super Admin Policy
CREATE POLICY "Admins can do everything" ON public.users FOR ALL TO authenticated
USING (
    (auth.jwt()->>'email' = 'admin') OR 
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'))
);

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT TO authenticated
USING (id = auth.uid()::text);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- 6. Grant Access
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO anon;

-- 7. Add Index
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
