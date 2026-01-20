
-- 1. Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Allow Admins to View ALL Logs
DROP POLICY IF EXISTS "Admin Select Logs" ON public.audit_logs;
CREATE POLICY "Admin Select Logs" ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  )
);

-- 3. Allow Authenticated Users to Insert Logs (for valid audit trail)
DROP POLICY IF EXISTS "User Insert Logs" ON public.audit_logs;
CREATE POLICY "User Insert Logs" ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Grant Permissions to Service Role (just in case)
GRANT ALL ON public.audit_logs TO service_role;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
