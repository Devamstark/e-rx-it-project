-- ============================================================================
-- MASTER DATABASE SETUP - DEVXWORD E-RX HUB V2 (COMPLETE EDITION)
-- ============================================================================
-- RUN THIS SCRIPT IN A FRESH SUPABASE SQL EDITOR TO SETUP THE ENTIRE PLATFORM
-- This includes Tables, Security Policies (RLS), and Automation Triggers.

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-running (Clean Slate)
DROP TABLE IF EXISTS public.system_logs CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.sales_returns CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.pharmacy_inventory CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.lab_referrals CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.medical_certificates CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.patient_accounts CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- A. CORE USERS TABLE (Syncs with Authentication)
-- ============================================================================
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('DOCTOR', 'PHARMACY', 'ADMIN', 'PATIENT')),
  verification_status text DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'DIRECTORY', 'TERMINATED')),
  
  -- Profile Fields (JSONB for unlimited flexibility)
  full_name text,
  phone text,
  
  -- Doctor Specific
  license_number text,
  specialty text,
  qualifications text,
  nmr_uid text,
  state_council text,
  
  -- Pharmacy Specific
  clinic_name text,
  clinic_address text,
  city text,
  pincode text,
  state text,
  gstin text,
  fax text,
  
  -- Metadata
  documents jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public View" ON public.users FOR SELECT USING (true);
CREATE POLICY "Self Update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin All" ON public.users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
);

-- ============================================================================
-- B. AUTOMATION: SYNC AUTH -> PUBLIC.USERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name, created_at)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'PATIENT'),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- C. CORE MEDICAL TABLES
-- ============================================================================

-- 1. Patients (Address Book)
CREATE TABLE public.patients (
    id text PRIMARY KEY,
    doctor_id uuid REFERENCES public.users(id), 
    full_name text NOT NULL,
    phone text,
    age integer,
    email text,
    gender text,
    address text,
    abha_id text UNIQUE,
    history jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docs see own patients" ON public.patients FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "Admin see all" ON public.patients FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));

-- 2. Prescriptions
CREATE TABLE public.prescriptions (
  id text PRIMARY KEY, -- "RX-2024-..."
  doctor_id uuid REFERENCES public.users(id),
  patient_id text,
  patient_name text NOT NULL,
  patient_phone text,
  patient_age integer,
  patient_gender text,
  pharmacy_id uuid REFERENCES public.users(id),
  pharmacy_name text,
  
  diagnosis text,
  medications jsonb NOT NULL,
  vitals jsonb DEFAULT '{}',
  instruction text,
  
  status text DEFAULT 'SENT_TO_PHARMACY',
  date timestamptz DEFAULT now(),
  
  -- Digital Signing
  digital_sign_token text
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docs view own" ON public.prescriptions FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "Pharmacies view targeted" ON public.prescriptions FOR ALL USING (auth.uid() = pharmacy_id);

-- 3. Lab Referrals
CREATE TABLE public.lab_referrals (
    id text PRIMARY KEY, -- "LAB-123"
    doctor_id uuid REFERENCES public.users(id),
    patient_id text,
    patient_name text,
    test_name text NOT NULL,
    notes text,
    status text DEFAULT 'PENDING',
    report_url text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.lab_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docs manage labs" ON public.lab_referrals FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "Public Upload (Secure)" ON public.lab_referrals FOR UPDATE USING (true); -- Secured by PIN in logic

-- 4. Appointments
CREATE TABLE public.appointments (
    id text PRIMARY KEY,
    doctor_id uuid REFERENCES public.users(id),
    patient_name text NOT NULL,
    patient_phone text,
    date date NOT NULL,
    time text,
    status text DEFAULT 'SCHEDULED',
    type text DEFAULT 'WALK-IN',
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docs manage appts" ON public.appointments FOR ALL USING (auth.uid() = doctor_id);

-- 5. Medical Certificates
CREATE TABLE public.medical_certificates (
    id text PRIMARY KEY,
    doctor_id uuid REFERENCES public.users(id),
    patient_name text NOT NULL,
    type text NOT NULL, -- SICK / FITNESS
    start_date date,
    end_date date,
    remarks text,
    issued_at timestamptz DEFAULT now()
);
ALTER TABLE public.medical_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docs manage certs" ON public.medical_certificates FOR ALL USING (auth.uid() = doctor_id);

-- ============================================================================
-- D. PHARMACY ERP & POS TABLES
-- ============================================================================

-- 6. Inventory
CREATE TABLE public.pharmacy_inventory (
    id text PRIMARY KEY,
    pharmacy_id uuid REFERENCES public.users(id),
    name text NOT NULL,
    batch_number text,
    stock integer DEFAULT 0,
    mrp numeric DEFAULT 0,
    purchase_price numeric DEFAULT 0,
    gst_percentage numeric DEFAULT 0,
    expiry_date date,
    manufacturer text,
    min_stock_level integer DEFAULT 10
);
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pharmacies manage own stock" ON public.pharmacy_inventory FOR ALL USING (auth.uid() = pharmacy_id);

-- 7. Customers (Ledger)
CREATE TABLE public.customers (
    id text PRIMARY KEY,
    pharmacy_id uuid REFERENCES public.users(id),
    name text NOT NULL,
    phone text,
    address text,
    balance numeric DEFAULT 0, -- Function of Credit/Debit
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pharmacies view own customers" ON public.customers FOR ALL USING (auth.uid() = pharmacy_id);

-- 8. Sales (POS)
CREATE TABLE public.sales (
    id text PRIMARY KEY,
    pharmacy_id uuid REFERENCES public.users(id),
    invoice_number text,
    customer_id text REFERENCES public.customers(id),
    customer_name text,
    items jsonb NOT NULL,
    sub_total numeric,
    gst_amount numeric,
    discount_amount numeric,
    rounded_total numeric,
    amount_paid numeric,
    balance_due numeric,
    payment_mode text,
    date timestamptz DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pharmacies view own sales" ON public.sales FOR ALL USING (auth.uid() = pharmacy_id);

-- 9. Sales Returns
CREATE TABLE public.sales_returns (
    id text PRIMARY KEY,
    pharmacy_id uuid REFERENCES public.users(id),
    original_invoice_id text REFERENCES public.sales(id),
    items jsonb,
    refund_amount numeric,
    reason text,
    date timestamptz DEFAULT now()
);
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pharmacies view returns" ON public.sales_returns FOR ALL USING (auth.uid() = pharmacy_id);

-- 10. Suppliers (Ledger)
CREATE TABLE public.suppliers (
    id text PRIMARY KEY,
    pharmacy_id uuid REFERENCES public.users(id),
    name text NOT NULL,
    phone text,
    gstin text,
    balance numeric DEFAULT 0,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pharmacies view suppliers" ON public.suppliers FOR ALL USING (auth.uid() = pharmacy_id);

-- ============================================================================
-- E. SYSTEM & AUDIT
-- ============================================================================

-- 11. Audit Logs
CREATE TABLE public.audit_logs (
    id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    actor_id uuid REFERENCES public.users(id), -- Who did it
    action text NOT NULL, -- "LOGIN", "DISPENSE", "CREATE_RX"
    details text,
    timestamp timestamptz DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Anyone can INSERT a log (logging their own action), only Admin can SELECT
CREATE POLICY "Insert Logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "Admin View Logs" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));

-- 12. Patient Accounts (Access Mapping)
CREATE TABLE public.patient_accounts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id text REFERENCES public.patients(id),
    auth_user_id uuid REFERENCES auth.users(id),
    enabled_by_pharmacy_id uuid REFERENCES public.users(id),
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.patient_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System View" ON public.patient_accounts FOR ALL USING (true);


-- ============================================================================
-- F. SEED INSTRUCTIONS
-- ============================================================================
-- 1. Run this script.
-- 2. Sign Up as 'admin@devx.com' / 'admin'.
-- 3. Run: UPDATE public.users SET role = 'ADMIN', verification_status = 'VERIFIED' WHERE email = 'admin@devx.com';
