-- Migration to Secure Patient Data with RLS

-- 1. Check if patients table exists and has the correct structure. 
-- If it was the old 'blob' store (id='global_patients'), we should probably drop it or ignore it.
-- For this fix, we will create a proper relational table.

DROP TABLE IF EXISTS patients; -- WARNING: This clears existing patient data. In a real prod env, we would migrate.

CREATE TABLE patients (
    id TEXT PRIMARY KEY, -- Keeping as TEXT to match existing ID format (e.g. 'PAT-123')
    owner_doctor_id UUID REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    date_of_birth TEXT, -- Keeping as TEXT to match ISO string format in JSON
    gender TEXT,
    phone TEXT,
    address TEXT,
    data JSONB, -- Store the full original JSON object here to preserve all fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy
-- Doctors can only SELECT, INSERT, UPDATE, DELETE their own patients.
CREATE POLICY "Doctors can only access their own patients"
ON patients
FOR ALL
USING (auth.uid() = owner_doctor_id)
WITH CHECK (auth.uid() = owner_doctor_id);

-- 4. Create Index for Performance
CREATE INDEX idx_patients_owner ON patients(owner_doctor_id);

-- 5. Grant access to authenticated users (RLS will restrict rows)
GRANT ALL ON patients TO authenticated;
GRANT ALL ON patients TO service_role;
