import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, patientId, pharmacyId, patientName } = await req.json()

        // 1. Check if mapping already exists for this patient
        const { data: existingMapping } = await supabaseClient
            .from('patient_accounts')
            .select('id')
            .eq('patient_id', patientId)
            .single()

        if (existingMapping) {
            return new Response(JSON.stringify({ success: true, message: 'Access already enabled' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        let authUserId: string;

        // 2. Try to get existing user or create new one
        const { data: usersList, error: listError } = await supabaseClient.auth.admin.listUsers()
        if (listError) throw listError

        const existingUser = usersList.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

        if (existingUser) {
            authUserId = existingUser.id
        } else {
            // Create New Auth User
            const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { role: 'PATIENT', full_name: patientName }
            })
            if (authError) throw authError
            authUserId = authData.user.id
        }

        // 3. Create Patient Account Mapping
        const { error: mappingError } = await supabaseClient
            .from('patient_accounts')
            .insert({
                patient_id: patientId,
                auth_user_id: authUserId,
                enabled_by_pharmacy_id: pharmacyId,
                status: 'active'
            })

        if (mappingError) throw mappingError

        return new Response(JSON.stringify({ success: true, userId: authUserId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
