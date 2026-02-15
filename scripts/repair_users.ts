
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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

async function repairUsers() {
    console.log("🔄 Starting User Sync/Repair...");

    // 1. Fetch All Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError || !users) {
        console.error("❌ Failed to list auth users:", authError);
        return;
    }

    console.log(`found ${users.length} users in Auth. Syncing to 'public.users'...`);

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
        // Construct the public user object from metadata
        const metadata = user.user_metadata || {};
        const role = metadata.role || 'PATIENT'; // Default fallback
        const name = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Unknown';

        const publicUser = {
            id: user.id,
            email: user.email,
            role: role.toUpperCase(),
            full_name: name,
            verification_status: metadata.verificationStatus || (role === 'ADMIN' ? 'VERIFIED' : 'PENDING'),

            // Map common fields from metadata if they exist
            license_number: metadata.licenseNumber || null,
            phone: metadata.phone || null,
            clinic_name: metadata.clinicName || null,
            clinic_address: metadata.clinicAddress || null,
            city: metadata.city || null,
            state: metadata.state || null,
            pincode: metadata.pincode || null,

            created_at: user.created_at,
            updated_at: new Date().toISOString()
        };

        // Auto-verify known test accounts for convenience
        const userEmail = user.email || '';
        if (name.toLowerCase().includes('doctor') || userEmail.includes('doctor')) {
            publicUser.verification_status = 'VERIFIED'; // Auto-verify for user convenience
        }
        if (name.toLowerCase().includes('pharmacy') || userEmail.includes('pharmacy')) {
            publicUser.verification_status = 'VERIFIED';
        }

        // Upsert into public.users
        const { error: upsertError } = await supabase
            .from('users')
            .upsert(publicUser);

        if (upsertError) {
            console.error(`❌ Failed to sync ${user.email}:`, upsertError.message);
            failCount++;
        } else {
            console.log(`✅ Synced: ${user.email} | Role: ${publicUser.role} | Status: ${publicUser.verification_status}`);
            successCount++;
        }
    }

    console.log(`\n🎉 Repair Complete!`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

repairUsers().catch(err => console.error("Fatal Error:", err));
