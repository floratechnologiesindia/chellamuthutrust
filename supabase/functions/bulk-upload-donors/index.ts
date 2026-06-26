import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HomeDonation {
  home_id: string
  amount: number
}

interface DonorRecord {
  name: string
  phone?: string
  email?: string
  pan_number?: string
  aadhar_number?: string
  address?: string
  referred_by?: string
  donor_category?: string
  notes?: string
  trust_id: string
  home_donations?: HomeDonation[]
  occasion?: string
  // Legacy fields (backward compat)
  donation_value?: number
  home_id?: string
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  let password = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length]
  }
  return password
}

function mapCategory(excelCategory: string | undefined): string {
  if (!excelCategory) return 'public'
  const lower = excelCategory.toLowerCase()
  if (lower.includes('csr') || lower.includes('institution')) return 'csr'
  if (lower.includes('monthly')) return 'monthly'
  if (lower.includes('annual') || lower.includes('yearly')) return 'yearly'
  return 'public'
}

async function createDonations(
  supabaseAdmin: any,
  userId: string,
  donor: DonorRecord,
) {
  const today = new Date().toISOString().split('T')[0]
  const donationBase = {
    donor_id: userId,
    occasion_note: donor.occasion || null,
    trust_id: donor.trust_id,
    sponsorship_type: 'ONE_TIME',
    payment_mode: 'offline',
    start_date: today,
    status: 'COMPLETED',
  }

  // New format: multiple home donations
  if (donor.home_donations && donor.home_donations.length > 0) {
    for (const hd of donor.home_donations) {
      if (hd.amount > 0 && hd.home_id) {
        await supabaseAdmin.from('donations').insert({
          ...donationBase,
          amount_pledged: hd.amount,
          home_id: hd.home_id,
        })
      }
    }
    return
  }

  // Legacy format: single donation_value + home_id
  if (donor.donation_value && donor.donation_value > 0 && donor.home_id) {
    await supabaseAdmin.from('donations').insert({
      ...donationBase,
      amount_pledged: donor.donation_value,
      home_id: donor.home_id,
    })
  }
}

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

    // Verify super_admin
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
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'super_admin')
      .single()

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can bulk upload donors' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { donors } = await req.json() as { donors: DonorRecord[] }
    if (!donors || !Array.isArray(donors) || donors.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No donors provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const donor of donors) {
      try {
        if (!donor.name || donor.name.trim() === '') {
          errors.push(`Skipped record with empty name`)
          continue
        }

        // Check for duplicate by phone
        if (donor.phone) {
          const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('phone', donor.phone)
            .maybeSingle()

          if (existing) {
            skipped++
            continue
          }
        }

        // Check for duplicate by email (if real email)
        if (donor.email && !donor.email.endsWith('@chellamuthu.local')) {
          const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', donor.email)
            .maybeSingle()

          if (existing) {
            skipped++
            continue
          }
        }

        const email = donor.email && donor.email.trim() !== ''
          ? donor.email.trim()
          : `donor_${(donor.phone || Date.now().toString()).replace(/[^0-9]/g, '')}@chellamuthu.local`

        const password = generatePassword()
        const mappedCategory = mapCategory(donor.donor_category)

        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: donor.name.trim() }
        })

        if (createError) {
          if (createError.message?.includes('already been registered')) {
            skipped++
          } else {
            errors.push(`${donor.name}: ${createError.message}`)
          }
          continue
        }

        const userId = authData.user.id

        const profileUpdate: Record<string, any> = {
          donor_category: mappedCategory,
        }
        if (donor.phone) profileUpdate.phone = donor.phone
        if (donor.pan_number) profileUpdate.pan_number = donor.pan_number
        if (donor.aadhar_number) profileUpdate.aadhar_number = donor.aadhar_number
        if (donor.address) profileUpdate.address = donor.address
        if (donor.referred_by) profileUpdate.referred_by = donor.referred_by
        if (donor.notes) profileUpdate.notes = donor.notes
        if (donor.trust_id) profileUpdate.trust_id = donor.trust_id

        await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', userId)

        // Create donation records
        await createDonations(supabaseAdmin, userId, donor)

        created++
      } catch (e) {
        errors.push(`${donor.name}: ${e.message || 'Unknown error'}`)
      }
    }

    return new Response(
      JSON.stringify({ created, skipped, errors, total: donors.length }),
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
