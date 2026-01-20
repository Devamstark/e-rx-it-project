import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Prescription, User, InventoryItem, Supplier, Customer, Sale, SalesReturn, Expense, AuditLog, Appointment, LabReferral, MedicalCertificate, PrescriptionTemplate, UserRole, VerificationStatus, Patient, PatientAccount } from '../types';

// --- Default Initial State ---
const INITIAL_USERS: User[] = [];

const getEnv = (key: string) => {
    let val = undefined;
    try {
        const meta = import.meta as any;
        if (meta && meta.env && meta.env[key]) val = meta.env[key];
    } catch (e) { }
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) val = process.env[key];
    } catch (e) { }

    // Debug Log (Remove in production if too noisy, but critical for now)
    console.log(`[EnvCheck] ${key}:`, val ? 'Found' : 'Missing');
    return val;
};


// CRITICAL: Vite replaces these STATICALLY at build time. 
// Do not use dynamic access (e.g. env[key]) as it fails in production.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("🚀 DevXWorld: Connected to Supabase Cloud");
    } catch (e) {
        console.warn("❌ DevXWorld: Supabase Connection Failed", e);
    }
} else {
    console.error("❌ DevXWorld: Supabase Credentials Missing in Environment!", {
        url: !!SUPABASE_URL,
        key: !!SUPABASE_KEY,
        envCheck: getEnv('VITE_SUPABASE_URL')
    });
}

// --- DB Service API (100% Cloud-Only Version) ---
export const dbService = {
    isCloudEnabled: () => !!supabase,

    checkCloud() {
        if (!supabase) throw new Error("Cloud Database is not connected. Operation failed.");
    },

    async signUp(email: string, password: string, userData: User): Promise<string | null> {
        this.checkCloud();
        const { data, error } = await supabase!.auth.signUp({
            email,
            password,
            options: { data: { role: userData.role, full_name: userData.name } }
        });
        if (error) throw error;
        return data.user?.id || null;
    },

    async login(email: string, password: string): Promise<User | null> {
        this.checkCloud();

        // 1. Check for Initial Root Admin (Master Key Fallback)
        // REMOVED FOR SECURITY: Root admin must be created in Supabase Auth

        // 2. Cloud-Based Login via Supabase Auth
        const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Supabase Auth Error:", error.message);
            return null;
        }

        // 3. Fetch ONLY this user's profile from the public table
        const { data: profile, error: profileError } = await supabase!
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile) {
            console.error("Profile not found in 'users' table for ID:", data.user.id);
            // Fallback: If auth succeeded but profile is missing, try to create one on the fly
            console.warn("Attempting to reconstruct profile from Auth metadata...");
            return {
                id: data.user.id,
                email: data.user.email!,
                name: data.user.user_metadata?.full_name || 'User',
                role: (data.user.user_metadata?.role?.toUpperCase() as UserRole) || UserRole.DOCTOR,
                verificationStatus: VerificationStatus.VERIFIED,
                registrationDate: data.user.created_at
            };
        }

        // Return the merged profile
        return {
            id: profile.id,
            email: profile.email,
            role: (profile.role?.toUpperCase() as UserRole) || UserRole.DOCTOR,
            name: profile.full_name || profile.email?.split('@')[0] || 'User',
            verificationStatus: (profile.verification_status?.toUpperCase() as VerificationStatus) || VerificationStatus.PENDING,
            registrationDate: profile.created_at,
            phone: profile.phone,
            licenseNumber: profile.license_number,
            clinicName: profile.clinic_name,
            documents: profile.documents || []
        };
    },

    async getUser(userId: string): Promise<User | null> {
        this.checkCloud();

        // 1. Try fetching from public users table
        const { data: profile, error } = await supabase!
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (profile && !error) {
            return {
                id: profile.id,
                email: profile.email,
                role: (profile.role?.toUpperCase() as UserRole) || UserRole.DOCTOR,
                name: profile.full_name || profile.email?.split('@')[0] || 'User',
                verificationStatus: (profile.verification_status?.toUpperCase() as VerificationStatus) || VerificationStatus.PENDING,
                registrationDate: profile.created_at,
                // Map other optional fields
                phone: profile.phone,
                licenseNumber: profile.license_number,
                clinicName: profile.clinic_name,
                clinicAddress: profile.clinic_address,
                city: profile.city,
                state: profile.state,
                pincode: profile.pincode,
                qualifications: profile.qualifications,
                specialty: profile.specialty,
                nmrUid: profile.nmr_uid,
                documents: profile.documents || []
            };
        }

        // 2. Fallback: Try fetching from Auth Admin (if we have admin privileges or if it's self?)
        // Client-side we can't easily get other users' auth metadata unless we are admin.
        // But we can try 'getUser' if we have an active session for that user?
        // Actually, if we are restoring a session, 'supabase.auth.getUser()' might work if the session is valid in Supabase client.

        const { data: authUser } = await supabase!.auth.getUser();
        if (authUser.user && authUser.user.id === userId) {
            console.warn("Restoring user from Auth Session (Public profile missing)");
            return {
                id: authUser.user.id,
                email: authUser.user.email!,
                name: authUser.user.user_metadata?.full_name || 'User',
                role: (authUser.user.user_metadata?.role?.toUpperCase() as UserRole) || UserRole.DOCTOR,
                verificationStatus: VerificationStatus.VERIFIED, // Assume verified if they can login? Or Pending.
                registrationDate: authUser.user.created_at
            };
        }

        return null;
    },

    async loadData(): Promise<{
        users: User[],
        rx: Prescription[],
        patients: Patient[],
        auditLogs: AuditLog[],
        labReferrals: LabReferral[],
        appointments: Appointment[],
        certificates: MedicalCertificate[],
        salesReturns: SalesReturn[],
        patientAccounts: PatientAccount[]
    }> {
        this.checkCloud();
        try {
            // 1. USERS (Relational Map)
            const { data: userData } = await supabase!.from('users').select('*');
            const users = userData ? userData.map(row => ({
                id: row.id,
                email: row.email,
                role: row.role as UserRole,
                name: row.full_name || row.email?.split('@')[0] || 'User',
                verificationStatus: row.verification_status as VerificationStatus,
                registrationDate: row.created_at,
                // Optional Fields
                phone: row.phone,
                licenseNumber: row.license_number,
                clinicName: row.clinic_name,
                clinicAddress: row.clinic_address,
                city: row.city,
                state: row.state,
                pincode: row.pincode,
                qualifications: row.qualifications,
                specialty: row.specialty,
                nmrUid: row.nmr_uid,
                documents: row.documents || [] // JSONB column
            } as User)) : [];

            // 2. PRESCRIPTIONS (Relational Map)
            const { data: rxRows } = await supabase!.from('prescriptions').select('*');
            const rx = rxRows ? rxRows.map(row => ({
                id: row.id,
                doctorId: row.doctor_id,
                doctorName: 'Unknown', // Will need to join or lookup, for now placeholder
                patientId: row.patient_id,
                patientName: row.patient_name,
                patientPhone: row.patient_phone,
                patientAge: row.patient_age,
                patientGender: row.patient_gender,
                pharmacyId: row.pharmacy_id,
                pharmacyName: row.pharmacy_name,
                diagnosis: row.diagnosis,
                medicines: row.medications || [], // JSONB
                vitals: row.vitals || {},         // JSONB
                advice: row.instruction,
                status: row.status,
                date: row.date,
                digitalSignatureToken: row.digital_sign_token
            } as Prescription)) : [];

            // 3. PATIENTS (Relational Map)
            const { data: patientRows } = await supabase!.from('patients').select('*');
            const patients = patientRows ? patientRows.map(row => ({
                id: row.id,
                doctorId: row.doctor_id,
                fullName: row.full_name,
                phone: row.phone,
                age: row.age,
                gender: row.gender,
                address: row.address,
                email: row.email,
                abhaNumber: row.abha_id,
                // JSONB History
                ...row.history, // Spread history JSON into root if that's the design, or keep separate? 
                // Type definition has history fields at root. Assuming history jsonb stores { allergies, chronicConditions... }
                registeredAt: row.created_at
            } as Patient)) : [];

            // 4. LAB REFERRALS (Relational Map)
            const { data: labRows } = await supabase!.from('lab_referrals').select('*');
            const labReferrals = labRows ? labRows.map(row => ({
                id: row.id,
                doctorId: row.doctor_id,
                patientId: row.patient_id,
                patientName: row.patient_name,
                testName: row.test_name,
                notes: row.notes,
                status: row.status,
                reportUrl: row.report_url,
                date: row.created_at,
                doctorName: 'Unknown' // Lookup needed or unused
            } as LabReferral)) : [];

            // 5. APPOINTMENTS (Relational Map)
            const { data: aptRows } = await supabase!.from('appointments').select('*');
            const appointments = aptRows ? aptRows.map(row => ({
                id: row.id,
                doctorId: row.doctor_id,
                patientName: row.patient_name,
                patientPhone: row.patient_phone, // Mapped to patientId in some views? TS type has patientId. 
                // SQL has no patient_id column, only names. 
                // We map what we have.
                patientId: 'WALK-IN', // Placeholder if SQL lacks it
                date: row.date,
                timeSlot: row.time,
                status: row.status,
                type: row.type || 'VISIT'
            } as Appointment)) : [];

            // 6. CERTIFICATES (Relational Map)
            const { data: certRows } = await supabase!.from('medical_certificates').select('*'); // Fixed table name
            const certificates = certRows ? certRows.map(row => ({
                id: row.id,
                doctorId: row.doctor_id,
                patientName: row.patient_name,
                type: row.type,
                startDate: row.start_date,
                endDate: row.end_date,
                remarks: row.remarks,
                issueDate: row.issued_at,
                patientId: 'N/A' // Placeholder
            } as MedicalCertificate)) : [];

            // 7. AUDIT LOGS
            try {
                const { data: logsRows } = await supabase!
                    .from('audit_logs')
                    .select('*')
                    .order('timestamp', { ascending: false });

                var auditLogs: AuditLog[] = [];
                if (logsRows) {
                    auditLogs = logsRows.map(row => ({
                        id: row.id,
                        actorId: row.actor_id || 'Unknown',
                        action: row.action,
                        details: row.details,
                        timestamp: row.timestamp
                    }));
                }
            } catch (logErr) {
                console.warn("Could not load audit logs (Permissions?):", logErr);
                var auditLogs: AuditLog[] = [];
            }

            // 8. SALES RETURNS (Relational Map)
            const { data: returnRows } = await supabase!.from('sales_returns').select('*');
            const salesReturns = returnRows ? returnRows.map(row => ({
                id: row.id,
                pharmacyId: row.pharmacy_id,
                originalInvoiceId: row.original_invoice_id,
                items: row.items || [],
                refundAmount: row.refund_amount,
                reason: row.reason,
                date: row.date,
                invoiceNumber: 'Unknown', // Needs join
                customerName: 'Unknown'   // Needs join
            } as SalesReturn)) : [];

            // 9. PATIENT ACCOUNTS
            const { data: accRows } = await supabase!.from('patient_accounts').select('*');
            const patientAccounts = (accRows || []).map(acc => ({
                id: acc.id,
                patientId: acc.patient_id,
                authUserId: acc.auth_user_id,
                status: acc.status,
                createdAt: acc.created_at,
                enabledByPharmacyId: acc.enabled_by_pharmacy_id
            }));

            return {
                users: users.length > 0 ? users : INITIAL_USERS,
                rx, patients, auditLogs, labReferrals, appointments, certificates, salesReturns, patientAccounts
            };
        } catch (e) {
            console.error("Load Data Error:", e);
            throw e;
        }
    },

    async getTemplates(doctorId: string): Promise<PrescriptionTemplate[]> {
        this.checkCloud();
        const { data } = await supabase!.from('prescription_templates').select('data').eq('doctor_id', doctorId);
        return data ? data.map(r => r.data as PrescriptionTemplate) : [];
    },

    async saveTemplate(template: PrescriptionTemplate) {
        this.checkCloud();
        await supabase!.from('prescription_templates').upsert({
            id: template.id,
            doctor_id: template.doctorId,
            data: template
        });
    },

    getSuppliers(): Supplier[] {
        // This is a stub for synchronous access if needed, 
        // but it's better to use data from loadData()
        console.warn("getSuppliers() called synchronously. Use loadData() for real-time data.");
        return [];
    },

    getCustomers(): Customer[] {
        console.warn("getCustomers() called synchronously. Use loadData() for real-time data.");
        return [];
    },

    getSales(): Sale[] {
        console.warn("getSales() called synchronously. Use loadData() for real-time data.");
        return [];
    },

    getSalesReturns(): SalesReturn[] {
        console.warn("getSalesReturns() called synchronously. Use loadData() for real-time data.");
        return [];
    },

    getExpenses(): Expense[] {
        console.warn("getExpenses() called synchronously. Use loadData() for real-time data.");
        return [];
    },

    async getPatientAccount(patientId: string): Promise<PatientAccount | null> {
        this.checkCloud();
        const { data } = await supabase!
            .from('patient_accounts')
            .select('*')
            .eq('patient_id', patientId)
            .single();

        if (!data) return null;
        return {
            id: data.id,
            patientId: data.patient_id,
            authUserId: data.auth_user_id,
            status: data.status,
            createdAt: data.created_at,
            enabledByPharmacyId: data.enabled_by_pharmacy_id
        };
    },

    async saveUsers(users: User[]) {
        this.checkCloud();
        const rows = users.map(u => ({
            id: u.id, email: u.email, role: u.role, verification_status: u.verificationStatus,
            data: u, updated_at: new Date().toISOString()
        }));
        await supabase!.from('users').upsert(rows);
    },

    async deleteUser(userId: string) {
        this.checkCloud();
        await supabase!.from('users').delete().eq('id', userId);
    },

    async updateUser(user: User) {
        this.checkCloud();
        const row = {
            id: user.id, email: user.email, role: user.role, verification_status: user.verificationStatus,
            data: user, updated_at: new Date().toISOString()
        };
        await supabase!.from('users').upsert(row);
    },

    async savePrescriptions(rx: Prescription[]) {
        this.checkCloud();
        const rows = rx.map(r => ({
            id: r.id, doctor_id: r.doctorId, patient_id: r.patientId || null,
            pharmacy_id: r.pharmacyId || null, status: r.status, date: r.date, data: r
        }));
        await supabase!.from('prescriptions').upsert(rows);
    },

    async savePatients(patients: Patient[]) {
        this.checkCloud();
        const rows = patients.map(p => ({
            id: p.id, doctor_id: p.doctorId, full_name: p.fullName, phone: p.phone, data: p
        }));
        await supabase!.from('patients').upsert(rows);
    },

    async logSecurityAction(userId: string, action: string, details: string) {
        this.checkCloud();
        // Friendly Name for Admin Logs
        const actorLabel = (userId === 'e7569d98-4c84-4e57-8c2a-e58d5130981e' || details.includes('Admin')) ? 'System Admin' : userId;

        // Use the proper relational table 'audit_logs'
        const log = {
            actor_id: userId, // Must be UUID for foreign key, or handle if 'System Admin' isn't a uuid
            action,
            details,
            timestamp: new Date().toISOString()
        };

        // If userId is not a valid UUID (e.g. "System Admin"), we might need to handle it. 
        // But for logged in users, it is a UUID.
        // If it's the specific hardcoded ID or a real user ID, use it.
        // If it's a descriptive string, we can't use it in 'actor_id' FK.
        // The table definition says: actor_id uuid REFERENCES public.users(id).
        // If we want to log "System Admin", we need that user to exist (which we created).

        let validActorId = userId;
        // If userId is not a UUID (simple check), try to fallback or null
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        if (!isUuid) {
            // Try to find the admin user ID if we know it, or just leave null if allowed.
            // But let's assume for now the app passes valid IDs or we skip the FK if we modified the table to allow text.
            // The setup.sql uses uuid. Let's just try to insert. 
            // If userId is 'System Admin', we can't insert into uuid column.
            // We'll trust the caller passes a real ID (like currentUser.id).
            if (userId === 'System Admin') {
                // Fetch real admin id or use the one we know?
                // Let's use the current user's ID if possible.
            }
        }

        const { error } = await supabase!.from('audit_logs').insert({
            actor_id: isUuid ? userId : null, // nullable?
            action,
            details,
            timestamp: new Date().toISOString()
        });

        if (error) {
            if (error.code === '23503') { // Foreign Key Violation (User missing)
                console.warn("⚠️ Skipped Audit Log: Actor ID not found in users table.");
            } else {
                console.error("Log Security Action Error:", error);
            }
        }
    },

    async uploadFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            if (file.size > 5 * 1024 * 1024) return reject(new Error("File too large"));
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = e => reject(e);
        });
    },

    // Legacy ERP/Helper stubs (Now Cloud-only or managed in loadData)
    async getInventory(pharmacyId: string): Promise<InventoryItem[]> {
        this.checkCloud();
        const { data } = await supabase!.from('pharmacy_inventory').select('data').eq('pharmacy_id', pharmacyId);
        return data ? data.map(r => r.data as InventoryItem) : [];
    },

    async saveInventoryItem(item: InventoryItem) {
        this.checkCloud();
        await supabase!.from('pharmacy_inventory').upsert({
            id: item.id, pharmacy_id: item.pharmacyId, product_name: item.name,
            stock_quantity: item.stock, mrp: item.mrp, batch_number: item.batchNumber,
            expiry_date: item.expiryDate, data: item
        });
    },

    async grantPatientAccess(patientId: string, patientName: string, email: string, password: string, pharmacyId: string) {
        this.checkCloud();
        const { data, error } = await supabase!.functions.invoke('grant-patient-access', {
            body: { email, password, patientId, pharmacyId, patientName }
        });
        if (error) throw error;
        return data;
    },

    async saveLabReferrals(data: LabReferral[]) {
        this.checkCloud();
        const rows = data.map(r => ({ id: r.id, doctor_id: r.doctorId, status: r.status, data: r }));
        await supabase!.from('lab_referrals').upsert(rows);
    },

    async saveAppointments(data: Appointment[]) {
        this.checkCloud();
        const rows = data.map(a => ({ id: a.id, doctor_id: a.doctorId, date: a.date, data: a }));
        await supabase!.from('appointments').upsert(rows);
    },

    async saveCertificates(data: MedicalCertificate[]) {
        this.checkCloud();
        const rows = data.map(c => ({ id: c.id, doctor_id: c.doctorId, data: c }));
        await supabase!.from('med_certificates').upsert(rows);
    },

    async saveSalesReturns(data: SalesReturn[]) {
        this.checkCloud();
        const rows = data.map(r => ({ id: r.id, pharmacy_id: r.pharmacyId, data: r }));
        await supabase!.from('sales_returns').upsert(rows);
    },

    async getPatientAccounts(): Promise<PatientAccount[]> {
        this.checkCloud();
        const { data } = await supabase!.from('patient_accounts').select('*');
        return (data || []).map(acc => ({
            id: acc.id, patientId: acc.patient_id, authUserId: acc.auth_user_id,
            status: acc.status, createdAt: acc.created_at, enabledByPharmacyId: acc.enabled_by_pharmacy_id
        }));
    },

    async saveSuppliers(data: Supplier[]) {
        this.checkCloud();
        const rows = data.map(s => ({ id: s.id, pharmacy_id: s.pharmacyId, name: s.name, data: s }));
        await supabase!.from('suppliers').upsert(rows);
    },

    async saveCustomers(data: Customer[]) {
        this.checkCloud();
        const rows = data.map(c => ({ id: c.id, pharmacy_id: c.pharmacyId, phone: c.phone, data: c }));
        await supabase!.from('customers').upsert(rows);
    },

    async saveSales(data: Sale[]) {
        this.checkCloud();
        const rows = data.map(s => ({ id: s.id, pharmacy_id: s.pharmacyId, date: s.date, total_amount: s.roundedTotal, data: s }));
        await supabase!.from('sales').upsert(rows);
    },

    async saveExpenses(data: Expense[]) {
        this.checkCloud();
        const rows = data.map(e => ({ id: e.id, pharmacy_id: e.pharmacyId, category: e.category, amount: e.amount, data: e }));
        await supabase!.from('expenses').upsert(rows);
    },

    async syncRegistry() {
        this.checkCloud();
        const { error } = await supabase!.rpc('sync_users');
        if (error) throw error;
    }
};
