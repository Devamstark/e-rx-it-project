
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Prescription, UserRole, VerificationStatus, Patient, AuditLog, PrescriptionTemplate, Supplier, Customer, Sale, Expense, SalesReturn, LabReferral, Appointment, MedicalCertificate } from '../types';

// --- Default Initial State (Used if DB is empty) ---
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

const INITIAL_RX: Prescription[] = [
    {
        id: 'RX-2024-001',
        doctorId: 'DOC-1709823', 
        doctorName: 'Dr. Ridham Trivedi',
        doctorDetails: {
            name: 'Ridham Trivedi',
            qualifications: 'MBBS, MD (Medicine)',
            registrationNumber: 'MCI-12345',
            nmrUid: 'NMR-5566',
            stateCouncil: 'Maharashtra Medical Council',
            clinicName: 'Trivedi Hospital',
            clinicAddress: '123 Health St, Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400050',
            phone: '9876543210',
            email: 'dr.ridham@example.com',
            specialty: 'Cardiologist'
        },
        patientId: 'PAT-001',
        patientName: 'Amit Sharma',
        patientAge: 45,
        patientGender: 'Male',
        diagnosis: 'Hypertension',
        medicines: [
            { name: 'Amlodipine', dosage: '5mg', frequency: 'OD', duration: '30 days', instructions: 'After breakfast' }
        ],
        advice: 'Reduce salt intake. Regular morning walk for 30 mins.',
        date: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
        status: 'DISPENSED',
        pharmacyId: 'sup-1', 
        pharmacyName: 'Apollo Pharmacy',
        digitalSignatureToken: 'SIG-MOCK-1'
    }
];

const INITIAL_LAB_REFERRALS: LabReferral[] = [
    {
        id: 'LAB-001',
        patientId: 'PAT-001',
        patientName: 'Amit Sharma',
        doctorId: 'DOC-1709823',
        doctorName: 'Dr. Ridham Trivedi',
        testName: 'Lipid Profile',
        labName: 'Metropolis Labs',
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
        status: 'COMPLETED',
        reportUrl: 'mock_report.pdf',
        notes: 'Check Cholesterol levels'
    }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
    {
        id: 'APT-101',
        doctorId: 'DOC-1709823',
        patientId: 'PAT-001',
        patientName: 'Amit Sharma',
        patientGender: 'Male',
        patientAge: 45,
        date: new Date().toISOString(),
        timeSlot: '10:00 AM',
        status: 'WAITING',
        type: 'VISIT',
        reason: 'Follow-up BP Check'
    }
];

// Seed Data to ensure ERP isn't empty on first load
const INITIAL_SUPPLIERS: Supplier[] = [
    { id: 'sup-1', name: 'Apollo Wholesale', contact: '9876543210', balance: -500, address: 'Mumbai, MH' },
    { id: 'sup-2', name: 'MedPlus Distributors', contact: '9988776655', balance: 2500, address: 'Delhi, DL' }
];

// --- Credentials ---
const FALLBACK_URL = 'https://xqhvjabpsiimxjpbhbih.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxaHZqYWJwc2lpbXhqcGJoYmloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzM3MTcsImV4cCI6MjA3OTIwOTcxN30._IUN318q5XbhV-VU8RAPTSuWh2NLqK2GK0P_Qzg9GuQ';

const getEnv = (key: string) => {
    try {
        const meta = import.meta as any;
        if (meta && meta.env && meta.env[key]) return meta.env[key];
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
    } catch (e) {}
    return undefined;
};

const getStoredConfig = () => {
    const url = localStorage.getItem('devx_db_url');
    const key = localStorage.getItem('devx_db_key');
    if (url && key) return { url, key };
    return null;
};

const stored = getStoredConfig();
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || stored?.url || FALLBACK_URL;
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || stored?.key || FALLBACK_KEY;

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("DevXWorld: Connected to Cloud Database");
    } catch (e) {
        console.warn("DevXWorld: Failed to initialize Supabase client", e);
    }
} else {
    console.log("DevXWorld: Running in Local Storage Mode");
}

// --- Helper: Local Storage ---
const local = {
    getUsers: (): User[] => {
        const s = localStorage.getItem('devx_users');
        return s ? JSON.parse(s) : INITIAL_USERS;
    },
    setUsers: (users: User[]) => localStorage.setItem('devx_users', JSON.stringify(users)),
    getRx: (): Prescription[] => {
        const s = localStorage.getItem('devx_prescriptions');
        return s ? JSON.parse(s) : INITIAL_RX;
    },
    setRx: (rx: Prescription[]) => localStorage.setItem('devx_prescriptions', JSON.stringify(rx)),
    getPatients: (): Patient[] => {
        const s = localStorage.getItem('devx_patients');
        return s ? JSON.parse(s) : [];
    },
    setPatients: (patients: Patient[]) => localStorage.setItem('devx_patients', JSON.stringify(patients)),
    getAuditLogs: (): AuditLog[] => {
        const s = localStorage.getItem('devx_audit_logs');
        return s ? JSON.parse(s) : [];
    },
    setAuditLogs: (logs: AuditLog[]) => localStorage.setItem('devx_audit_logs', JSON.stringify(logs)),
    getLabReferrals: (): LabReferral[] => {
        const s = localStorage.getItem('devx_lab_referrals');
        return s ? JSON.parse(s) : INITIAL_LAB_REFERRALS;
    },
    setLabReferrals: (data: LabReferral[]) => localStorage.setItem('devx_lab_referrals', JSON.stringify(data)),
    
    // New Feature Helpers
    getAppointments: (): Appointment[] => {
        const s = localStorage.getItem('devx_appointments');
        return s ? JSON.parse(s) : INITIAL_APPOINTMENTS;
    },
    setAppointments: (data: Appointment[]) => localStorage.setItem('devx_appointments', JSON.stringify(data)),
    
    getMedicalCertificates: (): MedicalCertificate[] => {
        const s = localStorage.getItem('devx_med_certificates');
        return s ? JSON.parse(s) : [];
    },
    setMedicalCertificates: (data: MedicalCertificate[]) => localStorage.setItem('devx_med_certificates', JSON.stringify(data)),

    // Templates
    getTemplates: (): PrescriptionTemplate[] => {
        const s = localStorage.getItem('devx_rx_templates');
        return s ? JSON.parse(s) : [];
    },
    setTemplates: (templates: PrescriptionTemplate[]) => localStorage.setItem('devx_rx_templates', JSON.stringify(templates)),
    
    // ERP Entities
    getSuppliers: (): Supplier[] => {
        const s = localStorage.getItem('devx_suppliers');
        return s ? JSON.parse(s) : INITIAL_SUPPLIERS;
    },
    setSuppliers: (data: Supplier[]) => localStorage.setItem('devx_suppliers', JSON.stringify(data)),
    
    getCustomers: (): Customer[] => {
        const s = localStorage.getItem('devx_customers');
        return s ? JSON.parse(s) : [];
    },
    setCustomers: (data: Customer[]) => localStorage.setItem('devx_customers', JSON.stringify(data)),
    
    getSales: (): Sale[] => {
        const s = localStorage.getItem('devx_sales');
        return s ? JSON.parse(s) : [];
    },
    setSales: (data: Sale[]) => localStorage.setItem('devx_sales', JSON.stringify(data)),

    getSalesReturns: (): SalesReturn[] => {
        const s = localStorage.getItem('devx_sales_returns');
        return s ? JSON.parse(s) : [];
    },
    setSalesReturns: (data: SalesReturn[]) => localStorage.setItem('devx_sales_returns', JSON.stringify(data)),

    getExpenses: (): Expense[] => {
        const s = localStorage.getItem('devx_expenses');
        return s ? JSON.parse(s) : [];
    },
    setExpenses: (data: Expense[]) => localStorage.setItem('devx_expenses', JSON.stringify(data))
};

// --- DB Service API ---
export const dbService = {
    isCloudEnabled: () => !!supabase,
    
    configureCloud: (url: string, key: string) => {
        localStorage.setItem('devx_db_url', url);
        localStorage.setItem('devx_db_key', key);
        window.location.reload();
    },

    disconnectCloud: () => {
        localStorage.removeItem('devx_db_url');
        localStorage.removeItem('devx_db_key');
        window.location.reload();
    },

    signOut: async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
    },

    async loadData(): Promise<{ 
        users: User[], 
        rx: Prescription[], 
        patients: Patient[], 
        auditLogs: AuditLog[], 
        labReferrals: LabReferral[],
        appointments: Appointment[],
        certificates: MedicalCertificate[],
        salesReturns: SalesReturn[]
    }> {
        if (!supabase) {
            return { 
                users: local.getUsers(), 
                rx: local.getRx(), 
                patients: local.getPatients(),
                auditLogs: local.getAuditLogs(),
                labReferrals: local.getLabReferrals(),
                appointments: local.getAppointments(),
                certificates: local.getMedicalCertificates(),
                salesReturns: local.getSalesReturns()
            };
        }

        try {
            // Load Users
            const { data: userData } = await supabase.from('users').select('data').eq('id', 'global_users').single();
            const { data: rxData } = await supabase.from('prescriptions').select('data').eq('id', 'global_prescriptions').single();
            const { data: patientData } = await supabase.from('patients').select('data').eq('id', 'global_patients').single();
            const { data: labData } = await supabase.from('lab_referrals').select('data').eq('id', 'global_lab_referrals').single();
            const { data: aptData } = await supabase.from('appointments').select('data').eq('id', 'global_appointments').single();
            const { data: certData } = await supabase.from('med_certificates').select('data').eq('id', 'global_med_certificates').single();
            
            // Load ERP Data (Sync to Local Storage for Synchronous Access in Components)
            const { data: supData } = await supabase.from('suppliers').select('data').eq('id', 'global_suppliers').single();
            if (supData) local.setSuppliers(supData.data);

            const { data: custData } = await supabase.from('customers').select('data').eq('id', 'global_customers').single();
            if (custData) local.setCustomers(custData.data);

            const { data: salesData } = await supabase.from('sales').select('data').eq('id', 'global_sales').single();
            if (salesData) local.setSales(salesData.data);

            const { data: retData } = await supabase.from('sales_returns').select('data').eq('id', 'global_sales_returns').single();
            if (retData) local.setSalesReturns(retData.data);

            const { data: expData } = await supabase.from('expenses').select('data').eq('id', 'global_expenses').single();
            if (expData) local.setExpenses(expData.data);

            // Load Audit Logs with Merging
            let sqlLogs: AuditLog[] = [];
            let blobLogsData: AuditLog[] = [];
            
            const { data: logsData, error: logsError } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (!logsError && logsData) {
                sqlLogs = logsData.map((l: any) => ({
                    id: l.id,
                    actorId: l.actor_id,
                    action: l.action,
                    details: l.details,
                    timestamp: l.created_at
                }));
            }

            const { data: blobLogs } = await supabase.from('system_logs').select('data').eq('id', 'global_audit_logs').single();
            if (blobLogs && blobLogs.data) { blobLogsData = blobLogs.data; }

            const allLogs = [...sqlLogs, ...blobLogsData];
            const uniqueLogs = Array.from(new Map(allLogs.map(item => [item.id, item])).values());
            const auditLogs = uniqueLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            const users = (userData && userData.data) ? userData.data : INITIAL_USERS;
            const rx = (rxData && rxData.data) ? rxData.data : INITIAL_RX;
            const patients = (patientData && patientData.data) ? patientData.data : [];
            const labReferrals = (labData && labData.data) ? labData.data : INITIAL_LAB_REFERRALS;
            const appointments = (aptData && aptData.data) ? aptData.data : INITIAL_APPOINTMENTS;
            const certificates = (certData && certData.data) ? certData.data : [];
            const salesReturns = (retData && retData.data) ? retData.data : [];

            return { users, rx, patients, auditLogs, labReferrals, appointments, certificates, salesReturns };
        } catch (e) {
            console.error("DB Load Error:", e);
            return { 
                users: local.getUsers(), 
                rx: local.getRx(), 
                patients: local.getPatients(), 
                auditLogs: local.getAuditLogs(), 
                labReferrals: local.getLabReferrals(),
                appointments: local.getAppointments(),
                certificates: local.getMedicalCertificates(),
                salesReturns: local.getSalesReturns()
            };
        }
    },

    async saveUsers(users: User[]): Promise<void> {
        if (!supabase) { local.setUsers(users); return; }
        await supabase.from('users').upsert({ id: 'global_users', data: users });
    },

    async savePrescriptions(rx: Prescription[]): Promise<void> {
        if (!supabase) { local.setRx(rx); return; }
        await supabase.from('prescriptions').upsert({ id: 'global_prescriptions', data: rx });
    },

    async savePatients(patients: Patient[]): Promise<void> {
        if (!supabase) { local.setPatients(patients); return; }
        await supabase.from('patients').upsert({ id: 'global_patients', data: patients });
    },
    
    async saveLabReferrals(data: LabReferral[]): Promise<void> {
        if (!supabase) { local.setLabReferrals(data); return; }
        await supabase.from('lab_referrals').upsert({ id: 'global_lab_referrals', data: data });
    },

    async saveAppointments(data: Appointment[]): Promise<void> {
        if (!supabase) { local.setAppointments(data); return; }
        await supabase.from('appointments').upsert({ id: 'global_appointments', data: data });
    },

    async saveCertificates(data: MedicalCertificate[]): Promise<void> {
        if (!supabase) { local.setMedicalCertificates(data); return; }
        await supabase.from('med_certificates').upsert({ id: 'global_med_certificates', data: data });
    },

    // --- ERP Saving (Now Cloud Aware) ---
    async saveSuppliers(data: Supplier[]): Promise<void> {
        local.setSuppliers(data); // Optimistic update
        if (supabase) {
            await supabase.from('suppliers').upsert({ id: 'global_suppliers', data: data });
        }
    },

    async saveCustomers(data: Customer[]): Promise<void> {
        local.setCustomers(data);
        if (supabase) {
            await supabase.from('customers').upsert({ id: 'global_customers', data: data });
        }
    },

    async saveSales(data: Sale[]): Promise<void> {
        local.setSales(data);
        if (supabase) {
            await supabase.from('sales').upsert({ id: 'global_sales', data: data });
        }
    },

    async saveSalesReturns(data: SalesReturn[]): Promise<void> {
        local.setSalesReturns(data);
        if (supabase) {
            await supabase.from('sales_returns').upsert({ id: 'global_sales_returns', data: data });
        }
    },

    async saveExpenses(data: Expense[]): Promise<void> {
        local.setExpenses(data);
        if (supabase) {
            await supabase.from('expenses').upsert({ id: 'global_expenses', data: data });
        }
    },

    async logSecurityAction(actorId: string, action: string, details: string = ''): Promise<AuditLog> {
        const clientTimestamp = new Date().toISOString();
        const log: AuditLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
            actorId, action, details, timestamp: clientTimestamp
        };

        if (!supabase) {
            const logs = local.getAuditLogs();
            local.setAuditLogs([log, ...logs]);
            return log;
        }

        try {
            await supabase.from('audit_logs').insert({
                actor_id: actorId,
                action: action,
                details: details,
                created_at: clientTimestamp 
            });
        } catch (e) {
            console.warn("SQL Insert failed, falling back to blob log", e);
            // Blob fallback logic...
        }
        return log;
    },

    async uploadFile(file: File): Promise<string> {
        if (file.size > 5 * 1024 * 1024) throw new Error("File size exceeds 5MB limit.");
        if (supabase) {
            try {
                const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
                const { data } = await supabase.storage.from('documents').upload(fileName, file);
                if (data) {
                    const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(data.path);
                    return publicUrl.publicUrl;
                }
            } catch (e) { console.warn("Upload failed", e); }
        }
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
        });
    },

    getTemplates: (doctorId: string): PrescriptionTemplate[] => {
        const allTemplates = local.getTemplates();
        return allTemplates.filter(t => t.doctorId === doctorId);
    },
    
    saveTemplate: (template: PrescriptionTemplate): void => {
        const allTemplates = local.getTemplates();
        local.setTemplates([...allTemplates, template]);
    },

    // Synchronous getters for local access in components (Pre-fetched by loadData)
    getSuppliers: (): Supplier[] => local.getSuppliers(),
    getCustomers: (): Customer[] => local.getCustomers(),
    getSales: (): Sale[] => local.getSales(),
    getSalesReturns: (): SalesReturn[] => local.getSalesReturns(),
    getExpenses: (): Expense[] => local.getExpenses(),
};
