import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Prescription, UserRole, VerificationStatus } from '../types';

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

// --- Config ---
// Safely retrieve environment variables to prevent crashes in environments where import.meta.env is undefined
const getEnv = (key: string) => {
    try {
        // Check import.meta.env (Vite standard)
        // We check if 'env' exists on import.meta before accessing the key
        const meta = import.meta as any;
        if (meta && meta.env && meta.env[key]) {
            return meta.env[key];
        }
    } catch (e) {
        // Ignore errors accessing import.meta
    }

    try {
        // Check process.env (Node/CRA/Webpack standard)
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {
        // Ignore errors accessing process
    }
    
    return undefined;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("DevXWorld: Connected to Cloud Database");
    } catch (e) {
        console.warn("DevXWorld: Failed to initialize Supabase client", e);
    }
} else {
    console.log("DevXWorld: Running in Local Storage Mode (Add VITE_SUPABASE_URL to enable cloud)");
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
        return s ? JSON.parse(s) : [];
    },
    setRx: (rx: Prescription[]) => localStorage.setItem('devx_prescriptions', JSON.stringify(rx))
};

// --- DB Service API ---
export const dbService = {
    async loadData(): Promise<{ users: User[], rx: Prescription[] }> {
        if (!supabase) {
            return { users: local.getUsers(), rx: local.getRx() };
        }

        try {
            // Load Users
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('data')
                .eq('id', 'global_users')
                .single();

            // Load Prescriptions
            const { data: rxData, error: rxError } = await supabase
                .from('prescriptions')
                .select('data')
                .eq('id', 'global_prescriptions')
                .single();
            
            // Parse or Default
            const users = (userData && userData.data) ? userData.data : INITIAL_USERS;
            const rx = (rxData && rxData.data) ? rxData.data : [];

            // If cloud is empty (first run), sync initial local defaults to cloud
            if (userError && users === INITIAL_USERS) {
                 await this.saveUsers(INITIAL_USERS);
            }

            return { users, rx };
        } catch (e) {
            console.error("DB Load Error:", e);
            // Fallback to local on error to prevent app crash
            return { users: local.getUsers(), rx: local.getRx() };
        }
    },

    async saveUsers(users: User[]): Promise<void> {
        if (!supabase) {
            local.setUsers(users);
            return;
        }
        // Sync to Cloud (Upsert single JSON blob for prototype simplicity)
        await supabase.from('users').upsert({ id: 'global_users', data: users });
    },

    async savePrescriptions(rx: Prescription[]): Promise<void> {
        if (!supabase) {
            local.setRx(rx);
            return;
        }
        await supabase.from('prescriptions').upsert({ id: 'global_prescriptions', data: rx });
    }
};