
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
// Using Service Key to bypass RLS for debugging "Absolute Truth"
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkData() {
    console.log("🔍 DIAGNOSTIC: Checking User Data...");

    // 1. Check Public Users Table
    const { data: publicUsers, error: publicError } = await supabase
        .from('users')
        .select('*');

    if (publicError) {
        console.error("❌ Error fetching public.users:", publicError);
    } else {
        console.log(`\n📊 Found ${publicUsers.length} rows in 'public.users':`);
        publicUsers.forEach(u => {
            console.log(`   - [${u.role}] ${u.email} (Status: ${u.verification_status}) (ID: ${u.id})`);
        });
    }

    // 2. Check Auth Users (Restricted to Service Role)
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error("❌ Error fetching Auth users:", authError);
    } else {
        console.log(`\n🔐 Found ${authUsers.length} users in 'auth.users':`);
        authUsers.forEach(u => {
            console.log(`   - ${u.email} (ID: ${u.id}) Metadata:`, u.user_metadata);
        });
    }

    // 3. Compare
    console.log("\n⚖️ COMPARISON:");
    if (!authUsers || !publicUsers) return;

    authUsers.forEach(au => {
        const match = publicUsers.find(pu => pu.id === au.id);
        if (!match) {
            console.warn(`   ⚠️ WARNING: User ${au.email} exists in AUTH but MISSING in PUBLIC.USERS (Sync Failed?)`);
        } else {
            // console.log(`   ✅ Synced: ${au.email}`);
        }
    });

}

checkData();
