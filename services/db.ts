
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Prescription, UserRole, VerificationStatus, Patient, AuditLog, PrescriptionTemplate, Supplier, Customer, Sale, Expense, SalesReturn, LabReferral, Appointment, MedicalCertificate, InventoryItem } from '../types';

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

const INITIAL_RX: Prescription[] = [];
const INITIAL_LAB_REFERRALS: LabReferral[] = [];
const INITIAL_APPOINTMENTS: Appointment[] = [];
const INITIAL_SUPPLIERS: Supplier[] = [];

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

// Use robust environment detection with hardcoded fallbacks for production
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
} else {
    console.log("📦 DevXWorld: Running in Offline-First Local Mode");
}

// --- Helper: Local Storage ---
const local = {
    getUsers: (): User[] => {
        const s = localStorage.getItem('devx_users');
        if (!s) return INITIAL_USERS;
        try {
            return JSON.parse(s);
        } catch (e) {
            return INITIAL_USERS;
        }
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
    setExpenses: (data: Expense[]) => localStorage.setItem('devx_expenses', JSON.stringify(data)),

    getInventory: (): InventoryItem[] => {
        const s = localStorage.getItem('devx_inventory');
        return s ? JSON.parse(s) : [];
    },
    setInventory: (data: InventoryItem[]) => localStorage.setItem('devx_inventory', JSON.stringify(data))
};

// --- DB Service API ---
export const dbService = {
    isCloudEnabled: () => !!supabase,

    async signUp(email: string, password: string, userData: User): Promise<string | null> {
        if (!supabase) {
            throw new Error("Cloud Database is not connected. Please check your .env configuration.");
        }

        // 1. Create Auth User
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { role: userData.role, full_name: userData.name }
            }
        });

        if (error) {
            console.error("Supabase Auth Signup Error:", error.message);
            throw error;
        }

        if (data.user) {
            // 2. Return the new Supabase ID so the frontend can use it
            return data.user.id;
        }
        return null;
    },

    async login(email: string, password: string): Promise<User | null> {
        if (!supabase) return null;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Supabase Auth Error:", error.message);
            return null;
        }
        // After auth, load the user profile from our global list
        const { users } = await this.loadData();
        return users.find(u => u.id === data.user.id) || null;
    },

    async getPublicPrescription(id: string): Promise<Prescription | null> {
        if (supabase) {
            // Try Relational Table first
            const { data, error } = await supabase.from('prescriptions').select('data').eq('id', id).single();
            if (error) {
                console.error("Supabase Public Rx Fetch Error:", error);
            }
            if (data && data.data) return data.data as Prescription;
        }
        // Fallback to local if checking from same device
        const localRx = local.getRx();
        return localRx.find(p => p.id === id) || null;
    },

    async getPublicLabReferral(id: string): Promise<LabReferral | null> {
        if (supabase) {
            const { data, error } = await supabase.from('lab_referrals').select('data').eq('id', id).single();
            if (data && data.data) return data.data as LabReferral;
        }
        const localLabs = local.getLabReferrals();
        return localLabs.find(r => r.id === id) || null;
    },

    async updateLabReferral(referral: LabReferral): Promise<boolean> {
        if (supabase) {
            const row = {
                id: referral.id,
                doctor_id: referral.doctorId,
                patient_id: referral.patientId,
                status: referral.status,
                data: referral
            };
            await supabase.from('lab_referrals').upsert(row);
            return true;
        }
        const localLabs = local.getLabReferrals();
        const updated = localLabs.map(r => r.id === referral.id ? referral : r);
        local.setLabReferrals(updated);
        return true;
    },

    async submitLabReport(id: string, url: string): Promise<void> {
        const ref = await this.getPublicLabReferral(id);
        if (ref) {
            const updated = { ...ref, status: 'COMPLETED' as const, reportUrl: url };
            await this.updateLabReferral(updated);
        }
    },

    // --- INVENTORY MANAGEMENT ---
    async getInventory(pharmacyId: string): Promise<InventoryItem[]> {
        if (supabase) {
            const { data } = await supabase.from('pharmacy_inventory').select('data').eq('pharmacy_id', pharmacyId);
            if (data) {
                const items = data.map(r => r.data as InventoryItem);
                local.setInventory(items); // Sync to local cache
                return items;
            }
        }
        // Fallback to local filtering
        return local.getInventory().filter(i => i.pharmacyId === pharmacyId);
    },

    async saveInventoryItem(item: InventoryItem) {
        if (supabase) {
            const row = {
                id: item.id,
                pharmacy_id: item.pharmacyId,
                product_name: item.name,      // MATCHES SCHEMA
                stock_quantity: item.stock,   // MATCHES SCHEMA
                mrp: item.mrp,
                batch_number: item.batchNumber,
                expiry_date: item.expiryDate,
                data: item
            };
            await supabase.from('pharmacy_inventory').upsert(row);
        }
        // Update local cache
        const current = local.getInventory();
        const index = current.findIndex(i => i.id === item.id);
        if (index >= 0) current[index] = item;
        else current.push(item);
        local.setInventory(current);
    },

    async saveInventory(items: InventoryItem[]) {
        if (supabase) {
            const rows = items.map(item => ({
                id: item.id,
                pharmacy_id: item.pharmacyId,
                product_name: item.name,      // MATCHES SCHEMA
                stock_quantity: item.stock,   // MATCHES SCHEMA
                mrp: item.mrp,
                batch_number: item.batchNumber,
                expiry_date: item.expiryDate,
                data: item
            }));
            await supabase.from('pharmacy_inventory').upsert(rows);
        }
        local.setInventory(items);
    },

    // --- DATA LOADING WITH SMART MERGE ---
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
            // Helper to merge Cloud and Local data (Prevents data loss on switch)
            const mergeData = <T extends { id: string }>(cloudList: T[], localList: T[]): T[] => {
                const map = new Map<string, T>();
                cloudList.forEach(item => map.set(item.id, item));
                localList.forEach(item => {
                    if (!map.has(item.id)) {
                        map.set(item.id, item);
                    }
                });
                return Array.from(map.values());
            };

            // USERS
            const { data: userData, error: userError } = await supabase.from('users').select('data').eq('id', 'global_users').single();
            if (userError && userError.code !== 'PGRST116') console.warn("Sync Users Error:", userError.message);

            const cloudUsers = userData ? (userData.data as User[]) : [];
            const mergedUsers = mergeData(cloudUsers, local.getUsers());
            if (mergedUsers.length === 0) mergedUsers.push(...INITIAL_USERS);

            // PRESCRIPTIONS
            let cloudRx: Prescription[] = [];
            const { data: rxRows } = await supabase.from('prescriptions').select('*');
            if (rxRows) cloudRx = rxRows.filter(r => r.id !== 'global_prescriptions').map(r => r.data as Prescription);
            const mergedRx = mergeData(cloudRx, local.getRx());

            // PATIENTS
            const { data: patientRows } = await supabase.from('patients').select('data');
            const cloudPatients = patientRows ? patientRows.map(r => r.data as Patient) : [];
            const mergedPatients = mergeData(cloudPatients, local.getPatients());
            if (mergedPatients.length > 0) local.setPatients(mergedPatients);

            // LAB REFERRALS
            const { data: labRows } = await supabase.from('lab_referrals').select('data');
            const cloudLabs = labRows ? labRows.map(r => r.data as LabReferral) : [];
            const mergedLabs = mergeData(cloudLabs, local.getLabReferrals());

            // APPOINTMENTS
            const { data: aptRows } = await supabase.from('appointments').select('data');
            const cloudApts = aptRows ? aptRows.map(r => r.data as Appointment) : [];
            const mergedApts = mergeData(cloudApts, local.getAppointments());

            // CERTIFICATES
            const { data: certRows } = await supabase.from('med_certificates').select('data');
            const cloudCerts = certRows ? certRows.map(r => r.data as MedicalCertificate) : [];
            const mergedCerts = mergeData(cloudCerts, local.getMedicalCertificates());

            // LOGS
            const { data: logsData } = await supabase.from('system_logs').select('data').eq('id', 'global_audit_logs').single();
            const mergedLogs = mergeData(logsData ? logsData.data : [], local.getAuditLogs());

            // ERP ENTITIES (Simple Load/Sync)
            const { data: supRows } = await supabase.from('suppliers').select('data');
            if (supRows && supRows.length > 0) local.setSuppliers(supRows.map(r => r.data));

            const { data: custRows } = await supabase.from('customers').select('data');
            if (custRows && custRows.length > 0) local.setCustomers(custRows.map(r => r.data));

            const { data: saleRows } = await supabase.from('sales').select('data');
            if (saleRows && saleRows.length > 0) local.setSales(saleRows.map(r => r.data));

            const { data: returnRows } = await supabase.from('sales_returns').select('data');
            if (returnRows && returnRows.length > 0) local.setSalesReturns(returnRows.map(r => r.data));

            const { data: expRows } = await supabase.from('expenses').select('data');
            if (expRows && expRows.length > 0) local.setExpenses(expRows.map(r => r.data));

            return {
                users: mergedUsers,
                rx: mergedRx,
                patients: mergedPatients,
                auditLogs: mergedLogs,
                labReferrals: mergedLabs,
                appointments: mergedApts,
                certificates: mergedCerts,
                salesReturns: local.getSalesReturns() // ERP is already sync'd above
            };
        } catch (e) {
            console.error("Load failed", e);
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

    async saveUsers(users: User[]) {
        // Prevent redundant saves if data hasn't changed locally
        const currentLocal = local.getUsers();
        if (JSON.stringify(currentLocal) === JSON.stringify(users)) {
            // Already synced locally, but if supabase is connected, we might want to check if cloud needs update
            // For now, we rely on the fact that this is called from App.tsx listeners
        }

        local.setUsers(users);

        if (supabase) {
            const { error } = await supabase.from('users').upsert({ id: 'global_users', data: users });
            if (error) console.error("Supabase Save Users Error:", error);
            else console.log("Users synced to Cloud.");
        }
    },

    async savePrescriptions(prescriptions: Prescription[]) {
        if (supabase) {
            try {
                const rows = prescriptions.map(rx => ({
                    id: rx.id,
                    doctor_id: rx.doctorId,
                    patient_id: rx.patientId || null,
                    pharmacy_id: rx.pharmacyId || null,
                    status: rx.status,
                    date: rx.date,
                    data: rx
                }));

                // Attempt standard save
                const { error } = await supabase.from('prescriptions').upsert(rows);

                if (error) {
                    console.error("Supabase Save Rx Error (Relational):", error);
                    // Fallback: Always try to save even if relational keys fail (e.g. missing patient_id in DB)
                    // This ensures the prescription data is at least verifiable
                    console.warn("Retrying save without relational links to ensure data persistence...");
                    const fallbackRows = prescriptions.map(rx => ({
                        id: rx.id,
                        doctor_id: rx.doctorId,
                        patient_id: null, // Break relational link
                        pharmacy_id: null,
                        status: rx.status,
                        date: rx.date,
                        data: rx
                    }));
                    const { error: retryError } = await supabase.from('prescriptions').upsert(fallbackRows);
                    if (retryError) console.error("Supabase Fallback Save Rx Error:", retryError);
                    else console.log("Prescriptions synced (Fallback Mode).");
                } else {
                    console.log("Prescriptions synced successfully.");
                }
            } catch (e) { console.error("Error saving relational rx:", e); }
        }
        local.setRx(prescriptions);
    },

    async savePatients(patients: Patient[]) {
        if (supabase) {
            const rows = patients.map(p => ({
                id: p.id,
                doctor_id: p.doctorId,
                full_name: p.fullName,
                phone: p.phone,
                data: p
            }));
            const { error } = await supabase.from('patients').upsert(rows);
            if (error) console.error("Save Patients Error:", error);
        }
        local.setPatients(patients);
    },

    async saveAuditLogs(logs: AuditLog[]) {
        if (supabase) await supabase.from('system_logs').upsert({ id: 'global_audit_logs', data: logs });
        local.setAuditLogs(logs);
    },

    async saveLabReferrals(data: LabReferral[]) {
        if (supabase) {
            const rows = data.map(r => ({
                id: r.id,
                doctor_id: r.doctorId,
                patient_id: r.patientId,
                status: r.status,
                data: r
            }));
            await supabase.from('lab_referrals').upsert(rows);
        }
        local.setLabReferrals(data);
    },

    async saveAppointments(data: Appointment[]) {
        if (supabase) {
            const rows = data.map(a => ({
                id: a.id,
                doctor_id: a.doctorId,
                patient_id: a.patientId,
                date: a.date,
                data: a
            }));
            await supabase.from('appointments').upsert(rows);
        }
        local.setAppointments(data);
    },

    async saveCertificates(data: MedicalCertificate[]) {
        if (supabase) {
            const rows = data.map(c => ({
                id: c.id,
                doctor_id: c.doctorId,
                patient_id: c.patientId,
                type: c.type,
                data: c
            }));
            await supabase.from('med_certificates').upsert(rows);
        }
        local.setMedicalCertificates(data);
    },

    // --- ERP SAVERS (Relational) ---
    async saveSuppliers(data: Supplier[]) {
        if (supabase) {
            const rows = data.map(s => ({
                id: s.id,
                pharmacy_id: s.pharmacyId,
                name: s.name,
                data: s
            }));
            await supabase.from('suppliers').upsert(rows);
        }
        local.setSuppliers(data);
    },
    async saveCustomers(data: Customer[]) {
        if (supabase) {
            const rows = data.map(c => ({
                id: c.id,
                pharmacy_id: c.pharmacyId,
                phone: c.phone,
                data: c
            }));
            await supabase.from('customers').upsert(rows);
        }
        local.setCustomers(data);
    },
    async saveSales(data: Sale[]) {
        if (supabase) {
            const rows = data.map(s => ({
                id: s.id,
                pharmacy_id: s.pharmacyId,
                invoice_number: s.invoiceNumber,
                date: s.date,
                total_amount: s.roundedTotal,
                data: s
            }));
            await supabase.from('sales').upsert(rows);
        }
        local.setSales(data);
    },
    async saveSalesReturns(data: SalesReturn[]) {
        if (supabase) {
            const rows = data.map(r => ({
                id: r.id,
                pharmacy_id: r.pharmacyId,
                original_invoice_id: r.originalInvoiceId,
                data: r
            }));
            await supabase.from('sales_returns').upsert(rows);
        }
        local.setSalesReturns(data);
    },
    async saveExpenses(data: Expense[]) {
        if (supabase) {
            const rows = data.map(e => ({
                id: e.id,
                pharmacy_id: e.pharmacyId,
                category: e.category,
                amount: e.amount,
                data: e
            }));
            await supabase.from('expenses').upsert(rows);
        }
        local.setExpenses(data);
    },

    // --- Utility Methods ---
    async logSecurityAction(userId: string, action: string, details: string) {
        const log: AuditLog = {
            id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            actorId: userId,
            action,
            details,
            timestamp: new Date().toISOString()
        };
        const currentLogs = local.getAuditLogs();
        const updatedLogs = [log, ...currentLogs].slice(0, 1000);
        local.setAuditLogs(updatedLogs);
        if (supabase) {
            try {
                await supabase.from('system_logs').upsert({ id: 'global_audit_logs', data: updatedLogs });
            } catch (e) { }
        }
    },

    async uploadFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            if (file.size > 5 * 1024 * 1024) {
                reject(new Error("File size exceeds 5MB limit"));
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    },

    saveTemplate(template: PrescriptionTemplate) {
        const current = local.getTemplates();
        const updated = [...current, template];
        local.setTemplates(updated);
    },

    getTemplates(doctorId: string): PrescriptionTemplate[] {
        return local.getTemplates().filter(t => t.doctorId === doctorId);
    },

    // ERP Getters
    getSuppliers: () => local.getSuppliers(),
    getCustomers: () => local.getCustomers(),
    getSales: () => local.getSales(),
    getSalesReturns: () => local.getSalesReturns(),
    getExpenses: () => local.getExpenses(),

    async seedDatabase() {
        if (!supabase) return;
        await this.saveUsers(INITIAL_USERS);
        await this.savePrescriptions(INITIAL_RX);
        await this.saveLabReferrals(INITIAL_LAB_REFERRALS);
        await this.saveAppointments(INITIAL_APPOINTMENTS);
        await this.saveSuppliers(INITIAL_SUPPLIERS);
        alert("Database Seeded with Initial Data!");
        window.location.reload();
    }
};
