-- 1. Create Patient Accounts Table
CREATE TABLE IF NOT EXISTS public.patient_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled_by_pharmacy_id TEXT REFERENCES public.pharmacies(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(patient_id),
    UNIQUE(auth_user_id)
);

-- 2. Enable RLS
ALTER TABLE public.patient_accounts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Patient Accounts
DROP POLICY IF EXISTS "Admins have full access to patient_accounts" ON public.patient_accounts;
CREATE POLICY "Admins have full access to patient_accounts" 
ON public.patient_accounts FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND (data->>'role') = 'ADMIN'));

DROP POLICY IF EXISTS "Pharmacies can view own patient activations" ON public.patient_accounts;
CREATE POLICY "Pharmacies can view own patient activations" 
ON public.patient_accounts FOR SELECT TO authenticated
USING (enabled_by_pharmacy_id = auth.uid()::text);

DROP POLICY IF EXISTS "Patients can view their own account mapping" ON public.patient_accounts;
CREATE POLICY "Patients can view their own account mapping" 
ON public.patient_accounts FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- 4. Update RLS for Prescriptions to allow Patient Access
-- We need to check the mapping table
DROP POLICY IF EXISTS "Patients can view own prescriptions" ON public.prescriptions;
CREATE POLICY "Patients can view own prescriptions" 
ON public.prescriptions FOR SELECT TO authenticated
USING (
    patient_id = (SELECT patient_id FROM public.patient_accounts WHERE auth_user_id = auth.uid()) OR
    doctor_id = auth.uid()::text OR
    pharmacy_id = auth.uid()::text
);

-- Similarly for Lab Referrals
DROP POLICY IF EXISTS "Patients can view own lab referrals" ON public.lab_referrals;
CREATE POLICY "Patients can view own lab referrals" 
ON public.lab_referrals FOR SELECT TO authenticated
USING (
    patient_id = (SELECT patient_id FROM public.patient_accounts WHERE auth_user_id = auth.uid()) OR
    doctor_id = auth.uid()::text
);

-- Similarly for Patients Profile (Self Access)
DROP POLICY IF EXISTS "Patients can view own medical profile" ON public.patients;
CREATE POLICY "Patients can view own medical profile" 
ON public.patients FOR SELECT TO authenticated
USING (
    id = (SELECT patient_id FROM public.patient_accounts WHERE auth_user_id = auth.uid()) OR
    doctor_id = auth.uid()::text
);
