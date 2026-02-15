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
        if (!supabase) {
            console.warn("⚠️ Cloud Database not connected. Using local storage fallback.");
            return false;
        }
        return true;
    },

    // --- Local Persistence Helpers ---
    _getLocal(key: string) {
        try {
            const data = localStorage.getItem(`devx_local_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    },
    _setLocal(key: string, data: any) {
        try {
            localStorage.setItem(`devx_local_${key}`, JSON.stringify(data));
        } catch (e) { }
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
        const isCloud = this.checkCloud();
        try {
            if (!isCloud) {
                return {
                    users: this._getLocal('users') || INITIAL_USERS,
                    rx: this._getLocal('rx') || [],
                    patients: this._getLocal('patients') || [],
                    auditLogs: this._getLocal('auditLogs') || [],
                    labReferrals: this._getLocal('labReferrals') || [],
                    appointments: this._getLocal('appointments') || [],
                    certificates: this._getLocal('certificates') || [],
                    salesReturns: this._getLocal('salesReturns') || [],
                    patientAccounts: this._getLocal('patientAccounts') || []
                };
            }

            // 1. USERS
            const { data: userData } = await supabase!.from('users').select('*');
            const users: User[] = (userData || []).map(row => ({
                id: row.id,
                email: row.email,
                role: row.role as UserRole,
                name: row.full_name || row.email?.split('@')[0] || 'User',
                verificationStatus: row.verification_status as VerificationStatus,
                registrationDate: row.created_at,
                phone: row.phone,
                licenseNumber: row.license_number,
                clinicName: row.clinic_name,
                clinicAddress: row.clinic_address,
                city: row.city,
                state: row.state,
                pincode: row.pincode,
                qualifications: row.qualifications,
                specialty: row.specialty,
                documents: row.documents || []
            }));

            // 2. PRESCRIPTIONS
            const { data: rxRows } = await supabase!.from('prescriptions').select('*');
            const rx: Prescription[] = (rxRows || []).map(row => ({
                id: row.id,
                doctorId: row.doctor_id,
                doctorName: row.doctor_name || 'Dr.',
                patientId: row.patient_id,
                patientName: row.patient_name,
                pharmacyId: row.pharmacy_id,
                pharmacyName: row.pharmacy_name,
                diagnosis: row.diagnosis,
                medicines: row.medications || [],
                vitals: row.vitals || {},
                advice: row.instruction,
                status: row.status,
                date: row.date,
                patientAge: 0,
                patientGender: 'Other',
                digitalSignatureToken: row.digital_sign_token
            }));

            // 3. PATIENTS (Universal Identity)
            const { data: patientRows } = await supabase!.from('patients').select('*');
            const patients: Patient[] = (patientRows || []).map(row => ({
                id: row.id,
                fullName: row.full_name,
                dateOfBirth: row.date_of_birth,
                gender: row.gender,
                phone: row.phone,
                email: row.email,
                address: row.address,
                abha_id: row.abha_id,
                registeredAt: row.created_at,
                allergies: [],
                chronicConditions: []
            })) as any;

            // 4. AUDIT LOGS
            const { data: logsRows } = await supabase!.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
            const auditLogs: AuditLog[] = (logsRows || []).map(row => ({
                id: row.id,
                actorId: row.actor_id || 'System',
                action: row.action,
                details: row.details ? JSON.stringify(row.details) : '',
                timestamp: row.timestamp
            }));

            // 5. APPOINTMENTS
            const { data: aptRows } = await supabase!.from('appointments').select('*');
            const appointments: Appointment[] = (aptRows || []).map(row => ({
                id: row.id,
                doctorId: row.doctor_id,
                patientId: row.patient_id,
                patientName: 'Patient',
                date: row.appointment_date,
                timeSlot: row.time_slot,
                status: row.status,
                type: row.reason || 'VISIT'
            })) as any;

            return {
                users, rx, patients, auditLogs, appointments,
                labReferrals: [], certificates: [], salesReturns: [], patientAccounts: []
            };
        } catch (e) {
            console.warn("Load Data Warning (Graceful degradation):", e);
            // Return what we have to prevent app crash
            return { users: [], rx: [], patients: [], auditLogs: [], labReferrals: [], appointments: [], certificates: [], salesReturns: [], patientAccounts: [] };
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
        this._setLocal('users', users);
        if (!this.checkCloud()) return;
        const rows = users.map(u => ({
            id: u.id, email: u.email, role: u.role,
            full_name: u.name, verification_status: u.verificationStatus,
            phone: u.phone, license_number: u.licenseNumber,
            clinic_name: u.clinicName, clinic_address: u.clinicAddress,
            city: u.city, pincode: u.pincode, state: u.state,
            documents: u.documents || [], updated_at: new Date().toISOString()
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
            id: user.id, email: user.email, role: user.role,
            full_name: user.name, verification_status: user.verificationStatus,
            phone: user.phone, license_number: user.licenseNumber, specialty: user.specialty,
            qualifications: user.qualifications, nmr_uid: user.nmrUid, state_council: user.stateCouncil,
            clinic_name: user.clinicName, clinic_address: user.clinicAddress, city: user.city,
            pincode: user.pincode, state: user.state, gstin: user.gstin, fax: user.fax,
            documents: user.documents || [], updated_at: new Date().toISOString()
        };
        await supabase!.from('users').upsert(row);
    },

    async savePrescriptions(rx: Prescription[]) {
        this._setLocal('rx', rx);
        if (!this.checkCloud()) return;
        const rows = rx.map(r => ({
            id: r.id, doctor_id: r.doctorId, patient_id: r.patientId,
            doctor_name: r.doctorName, patient_name: r.patientName,
            pharmacy_id: r.pharmacyId || null, pharmacy_name: r.pharmacyName,
            diagnosis: r.diagnosis, medications: r.medicines, vitals: r.vitals,
            instruction: r.advice, status: r.status, date: r.date,
            digital_sign_token: r.digitalSignatureToken
        }));
        await supabase!.from('prescriptions').upsert(rows);
    },

    async savePatients(patients: Patient[]) {
        this._setLocal('patients', patients);
        if (!this.checkCloud()) return;
        // Optimization: Use RPC for each to ensure linking
        for (const p of patients) {
            await this.createPatient(p.doctorId || '', p);
        }
    },

    // NEW: Unified Patient Creation Logic
    async createPatient(docId: string, patient: Partial<Patient>): Promise<string> {
        this.checkCloud();
        const { data, error } = await supabase!.rpc('get_or_create_patient_link', {
            _doc_id: docId,
            _full_name: patient.fullName,
            _dob: patient.dateOfBirth,
            _phone: patient.phone,
            _email: patient.email || null,
            _gender: patient.gender || null
        });
        if (error) throw error;
        return data as string;
    },

    async logSecurityAction(userId: string, action: string, details: string) {
        if (!this.checkCloud()) return;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        await supabase!.from('audit_logs').insert({
            actor_id: isUuid ? userId : null,
            action,
            details: { message: details },
            timestamp: new Date().toISOString()
        });
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

    async getInventory(pharmacyId: string): Promise<InventoryItem[]> {
        this.checkCloud();
        const { data } = await supabase!.from('pharmacy_inventory').select('*').eq('pharmacy_id', pharmacyId);
        return (data || []).map(r => ({
            id: r.id, pharmacyId: r.pharmacy_id, name: r.name, stock: r.stock,
            mrp: r.mrp, batchNumber: r.batch_number, expiryDate: r.expiry_date,
            manufacturer: r.manufacturer, minStockLevel: r.min_stock_level,
            purchasePrice: r.purchase_price, isNarcotic: false
        }));
    },

    async saveInventoryItem(item: InventoryItem) {
        this.checkCloud();
        await supabase!.from('pharmacy_inventory').upsert({
            id: item.id, pharmacy_id: item.pharmacyId, name: item.name,
            stock: item.stock, mrp: item.mrp, batch_number: item.batchNumber,
            expiry_date: item.expiryDate, manufacturer: item.manufacturer,
            purchase_price: item.purchasePrice, min_stock_level: item.minStockLevel
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
        const rows = data.map(r => ({
            id: r.id, doctor_id: r.doctorId, status: r.status,
            patient_id: r.patientId,
            test_details: r.testName, clinical_notes: r.notes, report_url: r.reportUrl
        }));
        await supabase!.from('lab_referrals').upsert(rows);
    },

    async saveAppointments(data: Appointment[]) {
        this.checkCloud();
        const rows = data.map(a => ({
            id: a.id, doctor_id: a.doctorId, patient_id: a.patientId,
            appointment_date: a.date, time_slot: a.timeSlot, status: a.status, reason: a.type
        }));
        await supabase!.from('appointments').upsert(rows);
    },

    async saveCertificates(data: MedicalCertificate[]) {
        // Mock stub - certificates table was consolidated
    },

    async saveSalesReturns(data: SalesReturn[]) {
        // Mock stub
    },

    async getPatientAccounts(): Promise<PatientAccount[]> {
        this.checkCloud();
        const { data } = await supabase!.from('patient_accounts').select('*');
        return (data || []).map(acc => ({
            id: acc.id, patientId: acc.patient_id, authUserId: acc.auth_user_id,
            status: acc.status as any, createdAt: acc.created_at, enabledByPharmacyId: acc.enabled_by_pharmacy_id
        }));
    },

    async saveSuppliers(data: Supplier[]) {
        // Generic ERP data handled via state for now
    },

    async saveCustomers(data: Customer[]) {
        // Handled via universal patients
    },

    async saveSales(data: Sale[]) {
        this.checkCloud();
        const rows = data.map(s => ({
            id: s.id, pharmacy_id: s.pharmacyId, patient_id: s.patientId,
            invoice_number: s.invoiceNumber, customer_name: s.customerName,
            items: s.items, sub_total: s.subTotal, gst_amount: s.gstAmount,
            rounded_total: s.roundedTotal, payment_mode: s.paymentMode
        }));
        await supabase!.from('sales').upsert(rows);
    },

    async saveExpenses(data: Expense[]) {
        // Generic ERP
    },

    async syncRegistry() {
        this.checkCloud();
        const { error } = await supabase!.rpc('sync_users');
        if (error) throw error;
    }
};
