// Supabase Edge Function: admin-set-password
// Allows admins to set passwords directly for users
// Deploy with: supabase functions deploy admin-set-password

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hardcoded admin emails who can set passwords (fallback if auth check fails)
const ADMIN_EMAILS = [
  "trevor@autovol.com",
  "trevor.fletcher@autovol.com",
  "admin@modulardashboard.com"
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, userId, adminEmail } = await req.json();

    // Validate inputs
    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: "Password is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email && !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Either email or userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service_role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Try to verify admin via auth token first
    let isAdmin = false;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: callingUser } } = await supabaseAdmin.auth.getUser(token);
      
      if (callingUser) {
        // Check if calling user is an admin in profiles
        const { data: callerProfile } = await supabaseAdmin
          .from("profiles")
          .select("dashboard_role")
          .eq("id", callingUser.id)
          .single();

        if (callerProfile?.dashboard_role === "admin") {
          isAdmin = true;
        }
        
        // Also check if their email is in the hardcoded admin list
        if (callingUser.email && ADMIN_EMAILS.includes(callingUser.email.toLowerCase())) {
          isAdmin = true;
        }
      }
    }
    
    // Fallback: check if adminEmail is in the hardcoded list
    if (!isAdmin && adminEmail && ADMIN_EMAILS.includes(adminEmail.toLowerCase())) {
      isAdmin = true;
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required. Contact support if you should have access." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the target user or create them
    let targetUserId = userId;
    let targetUserEmail = email;
    
    if (!targetUserId && email) {
      // Look up user by email
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (targetUser) {
        targetUserId = targetUser.id;
      } else {
        // User doesn't exist - create them
        console.log("User not found, creating new user:", email);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true
        });
        
        if (createError) {
          console.error("Create user error:", createError);
          return new Response(
            JSON.stringify({ success: false, error: `Failed to create user: ${createError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Update employee record
        await supabaseAdmin
          .from("employees")
          .update({ 
            supabase_user_id: newUser.user.id,
            access_status: "active" 
          })
          .eq("email", email);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `User created and password set for ${email}`,
            userId: newUser.user.id,
            created: true
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update the existing user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: password,
      email_confirm: true
    });

    if (error) {
      console.error("Password update error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update employee access status if they exist
    await supabaseAdmin
      .from("employees")
      .update({ access_status: "active" })
      .eq("email", data.user.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password set for ${data.user.email}`,
        userId: data.user.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
