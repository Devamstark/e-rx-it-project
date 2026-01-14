-- =========================================================
-- DEVX E-RX HUB: COMPLETE DATABASE REFACTOR & SECURITY FIX
-- =========================================================
-- Instructions: 
-- 1. Open Supabase Dashboard -> SQL Editor
-- 2. Create a New Query
-- 3. Paste EVERYTHING below and click RUN
-- =========================================================

-- 1. REFACTOR USERS TABLE (From Blob to Individual Rows)
-- This fixes the "Deleted users coming back" bug and enables RLS security.

-- Drop old blob table if it exists as 'users' (we rename it to keep data safe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- Check if it's the old blob format (id='global_users')
        IF EXISTS (SELECT 1 FROM public.users WHERE id = 'global_users') THEN
            ALTER TABLE public.users RENAME TO users_old_backup;
        END IF;
    END IF;
END $$;

-- Create the new relational users table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Links to auth.users.id
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SET UP SYSTEM LOGS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.system_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    action TEXT,
    details TEXT,
    data JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 4. CREATE SECURITY POLICIES

-- Policy: Allow ADMINS to do everything
DROP POLICY IF EXISTS "Admins manage all users" ON public.users;
CREATE POLICY "Admins manage all users" ON public.users 
FOR ALL TO authenticated 
USING (
    (auth.jwt()->>'email' = 'admin') OR 
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'))
);

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
CREATE POLICY "Users view own profile" ON public.users 
FOR SELECT TO authenticated 
USING (id = auth.uid()::text);

-- Policy: Admin logs access
DROP POLICY IF EXISTS "Admins view all logs" ON public.system_logs;
CREATE POLICY "Admins view all logs" ON public.system_logs 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'));

-- 5. GRANT PERMISSIONS
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;

-- 6. CREATE INDEXES FOR SPEED
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 7. SEED INITIAL ADMIN (Optional - replace 'admin' with your admin identifier if needed)
-- Note: You will still need to sign up this user via the App UI to create the Auth entry.
INSERT INTO public.users (id, email, role, verification_status, data)
VALUES ('adm-root', 'admin', 'ADMIN', 'VERIFIED', '{"name": "System Admin"}')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- MIGRATION COMPLETE
-- =========================================================
