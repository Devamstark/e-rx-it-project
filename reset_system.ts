
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

async function nukeAndRebuild() {
    console.log("☢️ STARTING FULL SYSTEM RESET ☢️");

    // 1. DELETE ALL DATA from Public Tables (Order matters for FKs)
    const tables = [
        'audit_logs',
        'sales_returns',
        'sales',
        'pharmacy_inventory', // maps to inventory
        'prescription_templates',
        'med_certificates',
        'lab_referrals',
        'appointments',
        'prescriptions',
        'patient_accounts',
        'users', // The profile table
    ];

    console.log("\n🧹 Cleaning Public Database Tables...");
    for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (error) {
            // Some tables might use 'id' or different PK, or be empty. Warn but continue.
            console.warn(`   ⚠️ Could not truncate '${table}': ${error.message}`);
        } else {
            console.log(`   ✅ Cleared '${table}'`);
        }
    }

    // 2. DELETE ALL USERS from Supabase Auth
    console.log("\n🧹 Deleting ALL Auth Users...");
    let hasMore = true;
    let deletedCount = 0;

    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) { console.error("   ❌ Failed to list users:", error); break; }

        if (!users || users.length === 0) {
            hasMore = false;
        } else {
            console.log(`   Found ${users.length} users to delete...`);
            for (const user of users) {
                const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
                if (delErr) console.error(`   ❌ Failed to delete ${user.email}:`, delErr.message);
                else deletedCount++;
            }
        }
    }
    console.log(`   ✅ Auth Cleaned. Removed ${deletedCount} users.`);

    // 3. CREATE SUPER ADMIN
    console.log("\n👑 Creating Super Admin...");
    const adminEmail = 'admin@devx.com';
    const adminPassword = 'admin123';

    const { data: adminData, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', full_name: 'Super Admin' }
    });

    if (createError) {
        console.error("   ❌ Failed to create admin in Auth:", createError.message);
        return;
    }

    const adminId = adminData.user.id;
    console.log(`   ✅ Admin Created in Auth (ID: ${adminId})`);

    // 4. SYNC TO PUBLIC TABLE
    console.log("   Syncing to public.users...");
    const { error: syncError } = await supabase.from('users').insert({
        id: adminId,
        email: adminEmail,
        role: 'ADMIN',
        full_name: 'Super Admin',
        verification_status: 'VERIFIED',
        created_at: new Date().toISOString()
    });

    if (syncError) {
        console.error("   ❌ Failed to sync admin profile:", syncError.message);
    } else {
        console.log("   ✅ Admin Profile Synced Successfully!");
    }

    console.log("\n✨ SYSTEM RESET COMPLETE ✨");
    console.log("👉 Login: admin / admin");
}

nukeAndRebuild();
