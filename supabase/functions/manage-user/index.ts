// Supabase Edge Function: manage-user
// Create or delete user accounts. Requires admin role.
// Called from the Settings screen by an authenticated admin user.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    // --- Verify caller's JWT server-side ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }
    const jwt = authHeader.slice(7)

    // Create a service-role client — needed for admin.createUser/deleteUser
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // Verify the JWT and get the caller's identity
    const { data: { user: caller }, error: authError } = await serviceClient.auth.getUser(jwt)
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // --- Check admin role in profiles table ---
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 403, headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403, headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // --- Parse action ---
    const body = await req.json()
    const { action } = body

    // --- ACTION: create ---
    if (action === 'create') {
      const { username, password, displayName } = body
      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'username and password are required' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      const email = `${username.toLowerCase()}@society-tracker.local`
      const dispName = displayName || username

      const { data: authUser, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: dispName },
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      // Create profiles row
      const { error: profileInsertError } = await serviceClient.from('profiles').insert({
        id: authUser.user.id,
        display_name: dispName,
        auth_email: email,
        role: 'member',
      })

      if (profileInsertError) {
        // Auth user created but profile row failed — partial failure
        return new Response(JSON.stringify({
          error: 'Account created but profile setup failed: ' + profileInsertError.message,
          userId: authUser.user.id,
        }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ success: true, userId: authUser.user.id, email }), {
        status: 200, headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // --- ACTION: delete ---
    if (action === 'delete') {
      const { userId } = body
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      // Don't allow deleting yourself
      if (userId === caller.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId)
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      // profiles row is cascade-deleted via FK constraint
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // --- ACTION: update-role ---
    if (action === 'update-role') {
      const { userId, role: newRole } = body
      if (!userId || !['admin', 'member'].includes(newRole)) {
        return new Response(JSON.stringify({ error: 'Valid userId and role (admin/member) are required' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      // Don't allow demoting yourself
      if (userId === caller.id && newRole !== 'admin') {
        return new Response(JSON.stringify({ error: 'Cannot remove your own admin role' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      const { error: updateError } = await serviceClient
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})
