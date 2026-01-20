
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Use process.cwd() instead of __dirname to avoid ESM issues
const envPath = path.resolve(process.cwd(), '.env');
console.log("Loading .env from:", envPath);
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const SUPABASE_URL = envConfig.SUPABASE_URL;
const SERVICE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const adminEmail = 'admin@devx.com';
const adminPassword = 'admin123'; // Min 6 chars

async function createAdmin() {
    console.log(`Creating Admin User: ${adminEmail}`);

    // 1. Check if exists
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error("List Users Error:", listError);
        return;
    }

    const existing = listData.users.find(u => u.email === adminEmail);
    let userId = existing?.id;

    if (existing) {
        console.log("User already exists. Updating password...");
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            existing.id,
            { password: adminPassword, user_metadata: { role: 'ADMIN', full_name: 'System Admin' } }
        );
        if (updateError) console.error("Update Error:", updateError);
        else console.log("Password updated to 'admin123'");
    } else {
        console.log("Creating new user...");
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: { role: 'ADMIN', full_name: 'System Admin' }
        });

        if (createError) {
            console.error("Create Error:", createError);
            return;
        }
        userId = createData.user.id;
        console.log("User created successfully.");
    }

    // 2. Enforce Role in Public Table
    if (userId) {
        console.log("Syncing public.users table...");
        const { error: upsertError } = await supabase.from('users').upsert({
            id: userId,
            email: adminEmail,
            role: 'ADMIN',
            verification_status: 'VERIFIED',
            full_name: 'System Admin',
            created_at: new Date().toISOString()
        });

        if (upsertError) console.error("Public Table Sync Error:", upsertError);
        else console.log("Public table synced. Admin is ready.");
    }
}

createAdmin();
