// Supabase Edge Function: invite-user
// Securely invites users using the service_role key
// Deploy with: supabase functions deploy invite-user

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, metadata, redirectTo } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service_role key
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

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      // User already exists - check if they have a profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', existingUser.id)
        .single()

      if (profile) {
        return new Response(
          JSON.stringify({ 
            error: 'User already has MODA access',
            existingUser: {
              id: existingUser.id,
              email: existingUser.email,
              createdAt: existingUser.created_at
            }
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Send invite email - always use production domain to avoid 404s from expired preview deployments
    const productionUrl = 'https://modulardashboard.com';
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: productionUrl,
      data: {
        name: metadata?.name || email.split('@')[0],
        invited_by: metadata?.invitedBy || 'MODA Admin',
        dashboard_role: metadata?.dashboardRole || 'employee'
      }
    })

    if (error) {
      console.error('Invite error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update employee record if it exists
    if (data?.user?.id) {
      await supabaseAdmin
        .from('employees')
        .update({ 
          supabase_user_id: data.user.id,
          access_status: 'invited'
        })
        .eq('email', email)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invite sent to ${email}`,
        userId: data?.user?.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
