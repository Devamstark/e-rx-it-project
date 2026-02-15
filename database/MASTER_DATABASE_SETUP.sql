-- ============================================================================
-- E-Rx Hub Master Database Redesign (Universal Patient Architecture)
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CLEANUP: Remove old tables for a fresh start
DROP TABLE IF EXISTS public.doctor_patients CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.lab_referrals CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.pharmacy_inventory CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.patient_accounts CASCADE;
DROP TABLE IF EXISTS public.medical_certificates CASCADE;
DROP TABLE IF EXISTS public.med_certificates CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.sales_returns CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;
DROP TABLE IF EXISTS public.pharmacies CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.users_old_backup CASCADE;
DROP TABLE IF EXISTS public.system_logs CASCADE;
DROP TABLE IF EXISTS public.pharmacy_staff CASCADE;

-- ============================================================================
-- 1. CORE IDENTITY SYSTEM
-- ============================================================================

-- Global Users table (Doctors, Pharmacies, Labs, Admins)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('DOCTOR', 'PHARMACY', 'LAB', 'ADMIN')),
  verification_status text DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'DIRECTORY', 'TERMINATED')),
  
  -- Profile Fields
  full_name text,
  phone text,
  license_number text, -- Doctor Registration or Pharmacy License
  specialty text,      -- Doctor specific
  clinic_name text,    -- Establishment name
  clinic_address text,
  city text,
  state text,
  pincode text,
  gstin text,
  documents jsonb DEFAULT '[]',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- UNIVERSAL PATIENTS (Single source of truth for identity ONLY)
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  phone text NOT NULL,
  email text,
  gender text CHECK (gender IN ('Male', 'Female', 'Other')),
  address text,
  abha_id text UNIQUE,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Composite Unique Index for Identity Matching (Duplicate Detection)
CREATE UNIQUE INDEX idx_unique_patient_identity ON public.patients (LOWER(full_name), date_of_birth, phone);

-- ============================================================================
-- 2. DOCTOR-PATIENT ISOLATION (Relational Mapping)
-- ============================================================================

CREATE TABLE public.doctor_patients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
);

-- ============================================================================
-- 3. CLINICAL RECORDS (Cross-Tenant Visibility)
-- ============================================================================

-- Prescriptions (Controls Pharmacy Visibility)
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id uuid NOT NULL REFERENCES public.users(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  pharmacy_id uuid REFERENCES public.users(id), -- Nullable until assigned
  
  doctor_name text, -- Denormalized for fast listing
  patient_name text, 
  pharmacy_name text,
  
  diagnosis text,
  medications jsonb NOT NULL DEFAULT '[]',
  vitals jsonb DEFAULT '{}',
  instruction text,
  
  status text DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'SENT_TO_PHARMACY', 'DISPENSED', 'CANCELLED', 'REJECTED')),
  digital_sign_token text,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Lab Referrals (Controls Lab Visibility)
CREATE TABLE public.lab_referrals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id uuid NOT NULL REFERENCES public.users(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  lab_id uuid REFERENCES public.users(id),
  
  test_details text NOT NULL,
  clinical_notes text,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
  report_url text,
  
  created_at timestamptz DEFAULT now()
);

-- Appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id uuid NOT NULL REFERENCES public.users(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  appointment_date timestamptz NOT NULL,
  time_slot text,
  status text DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 4. PHARMACY OPERATIONS
-- ============================================================================

-- Retail Sales
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id uuid NOT NULL REFERENCES public.users(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  prescription_id uuid REFERENCES public.prescriptions(id),
  
  invoice_number text NOT NULL,
  customer_name text, -- Snapshot
  items jsonb NOT NULL,
  sub_total numeric,
  gst_amount numeric,
  rounded_total numeric,
  payment_mode text,
  sale_date timestamptz DEFAULT now()
);

-- Pharmacy Inventory
CREATE TABLE public.pharmacy_inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id uuid NOT NULL REFERENCES public.users(id),
  name text NOT NULL,
  manufacturer text,
  batch_number text,
  expiry_date date,
  stock integer DEFAULT 0,
  min_stock_level integer DEFAULT 10,
  mrp numeric,
  purchase_price numeric,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 5. SYSTEM & AUDIT
-- ============================================================================

-- Audit Logs (Tracks every prescription, access, and change)
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid REFERENCES public.users(id),
  action text NOT NULL, -- "CREATE_RX", "DISPENSE", "VIEW_PATIENT"
  details jsonb,
  ip_address inet,
  timestamp timestamptz DEFAULT now()
);

-- Patient Portal Accounts (For future Patient App access)
CREATE TABLE public.patient_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_accounts ENABLE ROW LEVEL SECURITY;

-- 👤 USERS POLICY
CREATE POLICY "Public profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Self update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full access" ON public.users FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));

-- 🧬 PATIENTS POLICY
CREATE POLICY "Admin view all" ON public.patients FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Doctor access mapped patients" ON public.patients FOR SELECT USING (EXISTS (SELECT 1 FROM public.doctor_patients WHERE doctor_id = auth.uid() AND patient_id = public.patients.id));
CREATE POLICY "Pharmacy access via prescription" ON public.patients FOR SELECT USING (EXISTS (SELECT 1 FROM public.prescriptions WHERE pharmacy_id = auth.uid() AND patient_id = public.patients.id));
CREATE POLICY "Lab access via referral" ON public.patients FOR SELECT USING (EXISTS (SELECT 1 FROM public.lab_referrals WHERE lab_id = auth.uid() AND patient_id = public.patients.id));

-- 🔗 DOCTOR-PATIENT MAP
CREATE POLICY "Doctors manage own links" ON public.doctor_patients FOR ALL USING (doctor_id = auth.uid());

-- 📜 PRESCRIPTIONS
CREATE POLICY "Doctors own" ON public.prescriptions FOR ALL USING (doctor_id = auth.uid());
CREATE POLICY "Pharmacies assigned" ON public.prescriptions FOR SELECT USING (pharmacy_id = auth.uid());
CREATE POLICY "Pharmacies update status" ON public.prescriptions FOR UPDATE USING (pharmacy_id = auth.uid());

-- 🏥 PHARMACY OPS
CREATE POLICY "Pharmacy isolation inventory" ON public.pharmacy_inventory FOR ALL USING (pharmacy_id = auth.uid());
CREATE POLICY "Pharmacy isolation sales" ON public.sales FOR ALL USING (pharmacy_id = auth.uid());

-- 🛡️ AUDIT & ACCOUNTS
CREATE POLICY "Insert logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin view logs" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "System view accounts" ON public.patient_accounts FOR ALL USING (true);

-- ============================================================================
-- 7. AUTOMATION & TRIGGERS
-- ============================================================================

-- Function to handle new user signup from Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name, verification_status)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'DOCTOR'),
    COALESCE(new.raw_user_meta_data->>'name', ''),
    'PENDING'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup existing trigger before creating
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Universal Patient Match & Link function
CREATE OR REPLACE FUNCTION public.get_or_create_patient_link(
  _doc_id uuid,
  _full_name text,
  _dob date,
  _phone text,
  _email text DEFAULT NULL,
  _gender text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  _p_id uuid;
BEGIN
  SELECT id INTO _p_id FROM public.patients 
  WHERE LOWER(full_name) = LOWER(_full_name) AND date_of_birth = _dob AND phone = _phone;
  
  IF _p_id IS NULL THEN
    INSERT INTO public.patients (full_name, date_of_birth, phone, email, gender)
    VALUES (_full_name, _dob, _phone, _email, _gender)
    RETURNING id INTO _p_id;
  END IF;
  
  INSERT INTO public.doctor_patients (doctor_id, patient_id)
  VALUES (_doc_id, _p_id)
  ON CONFLICT (doctor_id, patient_id) DO NOTHING;
  
  RETURN _p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
