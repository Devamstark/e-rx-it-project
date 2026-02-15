
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
    console.error("❌ Missing Supabase URL/Key");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function debugAuditLogs() {
    console.log("🔍 Debugging Audit Logs...");

    // 1. Login as Admin
    console.log("... Logging in as admin@devx.com");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@devx.com',
        password: 'admin123'
    });

    if (authError) {
        console.error("❌ Login Failed:", authError.message);
        return;
    }

    const userId = authData.user.id;
    console.log(`✅ Logged in! ID: ${userId}`);

    // 2. Check Role in Public Users (Critical for RLS)
    console.log("... Checking public.users role");
    const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (userError) {
        console.error("❌ Failed to fetch public user row:", userError.message);
        console.log("   (This might cause RLS failures for audit logs)");
    } else {
        console.log(`✅ User Role in DB: ${userRow.role}`);
        if (userRow.role !== 'ADMIN') console.warn("⚠️ WARNING: Role is NOT 'ADMIN'. Audit Logs might be hidden.");
    }

    // 3. Fetch Audit Logs
    console.log("... Fetching audit_logs table");
    const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .limit(5);

    if (logsError) {
        console.error("❌ Failed to fetch logs (RLS Error?):", logsError.message);
        console.error("   Hint: Did you run the 'SUPABASE_FIX_DATA_LOGS.sql' script in Supabase?");
    } else {
        console.log(`✅ Fetch Success! Found ${logs?.length} logs.`);
        if (logs && logs.length > 0) {
            console.log("   Sample Log:", JSON.stringify(logs[0], null, 2));
        } else {
            console.log("   (Table returned empty array - either no logs exist or RLS is filtering them all out)");
        }
    }
}

debugAuditLogs();
