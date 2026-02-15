
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const TARGET_USER_ID = 'f205dc18-38d5-49ce-8085-b647274af5bf';

async function forceDeleteUser() {
    console.log(`🗑️ Force deleting user: ${TARGET_USER_ID}`);

    // Helper to delete from a table
    const cleanTable = async (table: string, column: string) => {
        const { error } = await supabase.from(table).delete().eq(column, TARGET_USER_ID);
        if (error) console.log(`   ⚠️ Failed to clean ${table}: ${error.message}`);
        else console.log(`   cleaned ${table}`);
    };

    console.log("1. Cleaning related records...");

    // Doctor/User Relations
    await cleanTable('prescriptions', 'doctor_id');
    await cleanTable('appointments', 'doctor_id');
    await cleanTable('appointments', 'patient_id'); // Just in case
    await cleanTable('lab_referrals', 'doctor_id');
    await cleanTable('med_certificates', 'doctor_id');
    await cleanTable('prescription_templates', 'doctor_id');

    // Pharmacy/User Relations
    await cleanTable('inventory', 'pharmacy_id');
    await cleanTable('sales', 'pharmacy_id');
    await cleanTable('sales_returns', 'pharmacy_id');

    // System Relations
    await cleanTable('audit_logs', 'actor_id');
    await cleanTable('patient_accounts', 'auth_user_id');

    // 2. Delete from public.users
    console.log("2. Deleting from public.users...");
    const { error: publicError } = await supabase
        .from('users')
        .delete()
        .eq('id', TARGET_USER_ID);

    if (publicError) console.error("   ❌ Error deleting from public.users:", publicError.message);
    else console.log("   ✅ Deleted from public.users");

    // 3. Delete from Auth
    console.log("3. Deleting from Supabase Auth...");
    const { error: authError } = await supabase.auth.admin.deleteUser(TARGET_USER_ID);

    if (authError) {
        console.error("   ❌ Failed to delete from Auth:", authError.message);
    } else {
        console.log("   ✅ Successfully deleted user from Supabase Auth.");
    }
}

forceDeleteUser();
