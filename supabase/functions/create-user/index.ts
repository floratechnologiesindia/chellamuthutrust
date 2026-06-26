import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  name: string
  email: string
  password: string
  phone?: string
  role: 'super_admin' | 'admin' | 'employee' | 'warden' | 'donor' | 'finance'
  trust_id?: string
  home_id?: string
  // Donor-specific fields
  organization?: string
  donor_category?: 'monthly' | 'yearly' | 'public' | 'csr'
  address?: string
  city?: string
  state?: string
  pincode?: string
  pan_number?: string
  aadhar_number?: string
  requires_80g?: boolean
  notes?: string
  working_sector?: 'private' | 'govt' | 'others'
  designation?: string
  donor_type?: 'indian' | 'nri' | 'foreigner'
  religion?: string
  referred_by?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is a super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if requesting user is super_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'super_admin')
      .single()

    if (roleError || !roleData) {
      console.error('Role check error:', roleError)
      return new Response(
        JSON.stringify({ error: 'Only super admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const userData: CreateUserRequest = await req.json()
    console.log('Creating user with data:', { ...userData, password: '[REDACTED]' })

    // Validate required fields
    if (!userData.name || !userData.email || !userData.password || !userData.role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, email, password, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role-specific requirements
    if (userData.role === 'admin' && !userData.trust_id) {
      return new Response(
        JSON.stringify({ error: 'Admins must be assigned to a trust' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (userData.role === 'warden' && !userData.home_id) {
      return new Response(
        JSON.stringify({ error: 'Wardens must be assigned to a home' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Skip email verification
      user_metadata: { name: userData.name }
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = authData.user.id
    console.log('Created auth user with ID:', newUserId)

    // Update user role (trigger creates default 'donor' role, we update to correct role)
    const { error: updateRoleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: userData.role })
      .eq('user_id', newUserId)

    if (updateRoleError) {
      console.error('Error updating role:', updateRoleError)
      // Role might not exist yet, try inserting
      const { error: insertRoleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: newUserId, role: userData.role })
      
      if (insertRoleError) {
        console.error('Error inserting role:', insertRoleError)
      }
    }

    // Update profile with all fields including donor-specific ones
    const profileUpdate: Record<string, any> = {}
    if (userData.phone) profileUpdate.phone = userData.phone
    if (userData.trust_id) profileUpdate.trust_id = userData.trust_id
    if (userData.home_id) profileUpdate.home_id = userData.home_id
    // Donor-specific fields
    if (userData.organization) profileUpdate.organization = userData.organization
    if (userData.donor_category) profileUpdate.donor_category = userData.donor_category
    if (userData.address) profileUpdate.address = userData.address
    if (userData.city) profileUpdate.city = userData.city
    if (userData.state) profileUpdate.state = userData.state
    if (userData.pincode) profileUpdate.pincode = userData.pincode
    if (userData.pan_number) profileUpdate.pan_number = userData.pan_number
    if (userData.aadhar_number) profileUpdate.aadhar_number = userData.aadhar_number
    if (userData.requires_80g !== undefined) profileUpdate.requires_80g = userData.requires_80g
    if (userData.notes) profileUpdate.notes = userData.notes
    if (userData.working_sector) profileUpdate.working_sector = userData.working_sector
    if (userData.designation) profileUpdate.designation = userData.designation
    if (userData.donor_type) profileUpdate.donor_type = userData.donor_type
    if (userData.religion) profileUpdate.religion = userData.religion
    if (userData.referred_by) profileUpdate.referred_by = userData.referred_by

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', newUserId)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }
    }

    console.log('User created successfully:', newUserId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUserId,
        email: userData.email,
        message: 'User created successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})