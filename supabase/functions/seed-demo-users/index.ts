import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEMO_PASSWORD = 'Demo@123'

const DEMO_USERS = [
  { email: 'superadmin@demo.com', name: 'Super Admin Demo', role: 'super_admin' },
  { email: 'admin@demo.com', name: 'Admin Demo', role: 'admin' },
  { email: 'finance@demo.com', name: 'Finance Demo', role: 'finance' },
  { email: 'employee@demo.com', name: 'Employee Demo', role: 'employee' },
  { email: 'warden@demo.com', name: 'Warden Demo', role: 'warden' },
  { email: 'donor@demo.com', name: 'Donor Demo', role: 'donor' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const results: any[] = []

    // First, create or get the sample trust
    let { data: existingTrust } = await supabaseAdmin
      .from('trusts')
      .select('id')
      .eq('name', 'Chellamuthu Charitable Trust')
      .maybeSingle()

    let trustId = existingTrust?.id

    if (!trustId) {
      const { data: newTrust, error: trustError } = await supabaseAdmin
        .from('trusts')
        .insert({
          name: 'Chellamuthu Charitable Trust',
          description: 'A charitable trust dedicated to supporting underprivileged children and elderly',
          address: '123 Gandhi Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          pincode: '600001',
          contact_email: 'contact@chellamuthu.org',
          contact_phone: '+91 44 1234 5678',
          registration_number: 'TN/2020/12345',
        })
        .select('id')
        .single()

      if (trustError) {
        console.error('Error creating trust:', trustError)
        throw trustError
      }
      trustId = newTrust.id
      results.push({ type: 'trust', name: 'Chellamuthu Charitable Trust', status: 'created' })
    } else {
      results.push({ type: 'trust', name: 'Chellamuthu Charitable Trust', status: 'exists' })
    }

    // Create or get the sample home
    let { data: existingHome } = await supabaseAdmin
      .from('homes')
      .select('id')
      .eq('name', 'Sunshine Children Home')
      .maybeSingle()

    let homeId = existingHome?.id

    if (!homeId) {
      const { data: newHome, error: homeError } = await supabaseAdmin
        .from('homes')
        .insert({
          trust_id: trustId,
          name: 'Sunshine Children Home',
          type: 'children_home',
          description: 'A loving home for orphaned and abandoned children',
          address: '456 Anna Salai',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          pincode: '600002',
          capacity_children: 50,
          capacity_old_age: 0,
        })
        .select('id')
        .single()

      if (homeError) {
        console.error('Error creating home:', homeError)
        throw homeError
      }
      homeId = newHome.id
      results.push({ type: 'home', name: 'Sunshine Children Home', status: 'created' })
    } else {
      results.push({ type: 'home', name: 'Sunshine Children Home', status: 'exists' })
    }

    // Create demo users
    for (const demoUser of DEMO_USERS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email === demoUser.email)

        if (existingUser) {
          // Reset password for existing user to ensure it matches
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: DEMO_PASSWORD
          })

          results.push({ 
            email: demoUser.email, 
            role: demoUser.role, 
            status: 'exists (password reset)',
            userId: existingUser.id 
          })
          
          // Ensure role is set correctly
          const { data: existingRole } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', existingUser.id)
            .maybeSingle()

          if (existingRole?.role !== demoUser.role) {
            await supabaseAdmin
              .from('user_roles')
              .upsert({ 
                user_id: existingUser.id, 
                role: demoUser.role 
              }, { onConflict: 'user_id' })
          }

          // Update profile with trust/home assignments
          const profileUpdate: any = {}
          if (['admin', 'employee', 'finance'].includes(demoUser.role)) {
            profileUpdate.trust_id = trustId
          }
          if (demoUser.role === 'warden') {
            profileUpdate.trust_id = trustId
            profileUpdate.home_id = homeId
          }
          
          if (Object.keys(profileUpdate).length > 0) {
            await supabaseAdmin
              .from('profiles')
              .update(profileUpdate)
              .eq('id', existingUser.id)
          }
          
          continue
        }

        // Create new user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: demoUser.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { name: demoUser.name }
        })

        if (authError) {
          console.error(`Error creating user ${demoUser.email}:`, authError)
          results.push({ email: demoUser.email, status: 'error', error: authError.message })
          continue
        }

        const userId = authData.user.id

        // Update role (trigger creates donor by default)
        if (demoUser.role !== 'donor') {
          await supabaseAdmin
            .from('user_roles')
            .update({ role: demoUser.role })
            .eq('user_id', userId)
        }

        // Assign trust/home based on role
        const profileUpdate: any = {}
        if (['admin', 'employee', 'finance'].includes(demoUser.role)) {
          profileUpdate.trust_id = trustId
        }
        if (demoUser.role === 'warden') {
          profileUpdate.trust_id = trustId
          profileUpdate.home_id = homeId
        }

        if (Object.keys(profileUpdate).length > 0) {
          await supabaseAdmin
            .from('profiles')
            .update(profileUpdate)
            .eq('id', userId)
        }

        // Set warden as primary warden for the home
        if (demoUser.role === 'warden') {
          await supabaseAdmin
            .from('homes')
            .update({ primary_warden_id: userId })
            .eq('id', homeId)
        }

        results.push({ 
          email: demoUser.email, 
          role: demoUser.role, 
          status: 'created',
          userId 
        })

      } catch (userError: any) {
        console.error(`Error processing user ${demoUser.email}:`, userError)
        results.push({ email: demoUser.email, status: 'error', error: userError.message })
      }
    }

    console.log('Seed results:', JSON.stringify(results, null, 2))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demo users seeded successfully',
        results,
        credentials: {
          password: DEMO_PASSWORD,
          users: DEMO_USERS.map(u => ({ email: u.email, role: u.role }))
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Seed error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})