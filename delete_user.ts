
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

async function deleteUser() {
    console.log(`🗑️ Attempting to delete user: ${TARGET_USER_ID}`);

    // 1. Delete from public.users (in case cascade doesn't work or it's orphaned)
    console.log("... Deleting from public.users");
    const { error: publicError } = await supabase
        .from('users')
        .delete()
        .eq('id', TARGET_USER_ID);

    if (publicError) console.error("⚠️ Error deleting from public.users:", publicError.message);
    else console.log("✅ Deleted from public.users (if existed)");

    // 2. Delete from Auth (The Source of Truth)
    console.log("... Deleting from Supabase Auth");
    const { data, error: authError } = await supabase.auth.admin.deleteUser(TARGET_USER_ID);

    if (authError) {
        console.error("❌ Failed to delete from Auth:", authError.message);
    } else {
        console.log("✅ Successfully deleted user from Supabase Auth.");
    }
}

deleteUser();
