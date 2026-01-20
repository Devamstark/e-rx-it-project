
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkIntegrity() {
    console.log("🔍 Checking System Integrity...");

    // 1. Get Auth User
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error("❌ Auth Error:", authError);
        return;
    }

    const adminUser = users.find(u => u.email === 'admin@devx.com');
    if (!adminUser) {
        console.error("❌ Admin user NOT FOUND in Supabase Auth!");
    } else {
        console.log(`✅ Admin Found in Auth: ${adminUser.id} (${adminUser.email})`);
    }

    // 2. Get Public User
    const { data: publicUsers, error: dbError } = await supabase
        .from('users')
        .select('*');

    if (dbError) {
        console.error("❌ Public DB Error:", dbError);
        return;
    }

    const publicAdmin = publicUsers?.find(u => u.email === 'admin@devx.com');

    if (!publicAdmin) {
        console.error("❌ Admin user NOT FOUND in public.users table!");
        console.log("   Current public.users:", publicUsers?.length ? publicUsers.map(u => ({ id: u.id, email: u.email })) : "Empty");

        if (adminUser) {
            console.log("🛠️ Attempting to Repair...");
            const { error: insertError } = await supabase.from('users').insert({
                id: adminUser.id,
                email: adminUser.email,
                role: 'ADMIN',
                verification_status: 'VERIFIED',
                full_name: 'Super Admin',
                created_at: new Date().toISOString()
            });
            if (insertError) console.error("   ❌ Repair Failed:", insertError);
            else console.log("   ✅ Repair Successful! Profile created.");
        }

    } else {
        console.log(`✅ Admin Found in public.users: ${publicAdmin.id}`);
        if (adminUser && publicAdmin.id !== adminUser.id) {
            console.error("❌ ID MISMATCH! Auth ID != Public ID");
            console.log(`   Auth:   ${adminUser.id}`);
            console.log(`   Public: ${publicAdmin.id}`);
        } else {
            console.log("✅ IDs Match. Integrity OK.");
        }
    }
}

checkIntegrity();
