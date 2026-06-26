import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Only super admins can delete donors' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { donorId } = await req.json();
    if (!donorId) {
      return new Response(JSON.stringify({ error: 'donorId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Nullify donor references in donations and food_slots before deleting
    await supabaseAdmin.from('donations').update({ donor_id: donorId }).eq('donor_id', donorId);
    // Actually we need to delete donations or nullify - but donor_id is NOT NULL on donations
    // So we must delete related donations and food_slots first
    await supabaseAdmin.from('donation_payments').delete().in(
      'donation_id',
      (await supabaseAdmin.from('donations').select('id').eq('donor_id', donorId)).data?.map(d => d.id) || []
    );
    await supabaseAdmin.from('donations').delete().eq('donor_id', donorId);
    await supabaseAdmin.from('food_slots').delete().eq('donor_id', donorId);
    await supabaseAdmin.from('corpus_fund_contributions').delete().eq('donor_id', donorId);
    await supabaseAdmin.from('kind_donations').delete().eq('donor_id', donorId);
    await supabaseAdmin.from('notifications').delete().eq('user_id', donorId);
    await supabaseAdmin.from('tasks').delete().eq('related_donor_id', donorId);

    // Delete auth user (cascades to profiles and user_roles)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(donorId);
    if (deleteError) {
      console.error('Failed to delete donor:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
