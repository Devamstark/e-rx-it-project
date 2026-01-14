import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Prescription, User, InventoryItem, Supplier, Customer, Sale, SalesReturn, Expense, AuditLog, Appointment, LabReferral, MedicalCertificate, PrescriptionTemplate, UserRole, VerificationStatus, Patient, PatientAccount } from '../types';

// --- Default Initial State ---
const INITIAL_USERS: User[] = [
    {
        id: 'adm-root',
        name: 'DevX Super Admin',
        email: 'admin',
        password: 'admin',
        role: UserRole.ADMIN,
        verificationStatus: VerificationStatus.VERIFIED,
        registrationDate: new Date().toISOString()
    }
];

const getEnv = (key: string) => {
    try {
        const meta = import.meta as any;
        if (meta && meta.env && meta.env[key]) return meta.env[key];
    } catch (e) { }
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
    } catch (e) { }
    return undefined;
};

const FALLBACK_URL = 'https://xqhvjabpsiimxjpbhbih.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxaHZqYWJwc2lpbXhqcGJoYmloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzM3MTcsImV4cCI6MjA3OTIwOTcxN30._IUN318q5XbhV-VU8RAPTSuWh2NLqK2GK0P_Qzg9GuQ';

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("🚀 DevXWorld: Connected to Supabase Cloud");
    } catch (e) {
        console.warn("❌ DevXWorld: Supabase Connection Failed", e);
    }
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
        const rootAdmin = INITIAL_USERS[0];
        if (email === rootAdmin.email && password === rootAdmin.password) {
            console.log("🔑 Root Admin Logged In via Master Key");
            return rootAdmin;
        }

        // 2. Cloud-Based Login via Supabase Auth
        const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) return null;

        // Load specific profile
        const { users } = await this.loadData();
        return users.find(u => u.id === data.user.id) || null;
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
            // 1. USERS
            const { data: userData } = await supabase!.from('users').select('*');
            const users = userData ? userData.map(row => ({
                ...(row.data as User),
                id: row.id, email: row.email, role: row.role as UserRole,
                verificationStatus: row.verification_status as VerificationStatus
            })) : [];

            // 2. PRESCRIPTIONS
            const { data: rxRows } = await supabase!.from('prescriptions').select('*');
            const rx = rxRows ? rxRows.map(r => r.data as Prescription) : [];

            // 3. PATIENTS
            const { data: patientRows } = await supabase!.from('patients').select('data');
            const patients = patientRows ? patientRows.map(r => r.data as Patient) : [];

            // 4. LAB REFERRALS
            const { data: labRows } = await supabase!.from('lab_referrals').select('data');
            const labReferrals = labRows ? labRows.map(r => r.data as LabReferral) : [];

            // 5. APPOINTMENTS
            const { data: aptRows } = await supabase!.from('appointments').select('data');
            const appointments = aptRows ? aptRows.map(r => r.data as Appointment) : [];

            // 6. CERTIFICATES
            const { data: certRows } = await supabase!.from('med_certificates').select('data');
            const certificates = certRows ? certRows.map(r => r.data as MedicalCertificate) : [];

            // 7. AUDIT LOGS
            const { data: logsData } = await supabase!.from('system_logs').select('data').eq('id', 'global_audit_logs').single();
            const auditLogs = logsData ? (logsData.data as AuditLog[]) : [];

            // 8. SALES RETURNS
            const { data: returnRows } = await supabase!.from('sales_returns').select('data');
            const salesReturns = returnRows ? returnRows.map(r => r.data as SalesReturn) : [];

            // 9. PATIENT ACCOUNTS
            const { data: accRows } = await supabase!.from('patient_accounts').select('*');
            const patientAccounts = (accRows || []).map(acc => ({
                id: acc.id, patientId: acc.patient_id, authUserId: acc.auth_user_id,
                status: acc.status, createdAt: acc.created_at, enabledByPharmacyId: acc.enabled_by_pharmacy_id
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
        const log: AuditLog = {
            id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            actorId: userId, action, details, timestamp: new Date().toISOString()
        };
        const { data: existing } = await supabase!.from('system_logs').select('data').eq('id', 'global_audit_logs').single();
        const logs = existing ? (existing.data as AuditLog[]) : [];
        await supabase!.from('system_logs').upsert({ id: 'global_audit_logs', data: [log, ...logs].slice(0, 1000) });
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
    }
};
