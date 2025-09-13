// Edge Function: Calculate Glow Points
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReactionData {
  post_id: string
  user_id: string
  kind: 'couronne' | 'vetements' | 'sport' | 'mental' | 'confiance' | 'soins'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { post_id, user_id, kind, action } = await req.json() as ReactionData & { action: 'add' | 'remove' }

    // Calculate points based on reaction type
    const points = kind === 'couronne' ? 20 : 10
    const pointsChange = action === 'add' ? points : -points

    // Start transaction-like operations
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select('glow_points, author_id')
      .eq('id', post_id)
      .single()

    if (postError) {
      throw new Error(`Failed to fetch post: ${postError.message}`)
    }

    // Update post glow points
    const newPostPoints = Math.max(0, (post.glow_points || 0) + pointsChange)
    const { error: updatePostError } = await supabaseClient
      .from('posts')
      .update({ glow_points: newPostPoints })
      .eq('id', post_id)

    if (updatePostError) {
      throw new Error(`Failed to update post points: ${updatePostError.message}`)
    }

    // Update author's total glow points
    const { data: authorPosts, error: authorPostsError } = await supabaseClient
      .from('posts')
      .select('glow_points')
      .eq('author_id', post.author_id)

    if (authorPostsError) {
      throw new Error(`Failed to fetch author posts: ${authorPostsError.message}`)
    }

    const totalAuthorPoints = authorPosts.reduce((sum, p) => sum + (p.glow_points || 0), 0)

    const { error: updateAuthorError } = await supabaseClient
      .from('profiles')
      .update({ glow_points: totalAuthorPoints })
      .eq('id', post.author_id)

    if (updateAuthorError) {
      throw new Error(`Failed to update author points: ${updateAuthorError.message}`)
    }

    // Log the activity for analytics
    await supabaseClient
      .from('analytics_events')
      .insert({
        event_type: 'glow_points_calculated',
        user_id,
        metadata: {
          post_id,
          author_id: post.author_id,
          reaction_kind: kind,
          points_change: pointsChange,
          new_post_points: newPostPoints,
          new_author_points: totalAuthorPoints,
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        post_points: newPostPoints,
        author_points: totalAuthorPoints,
        points_change: pointsChange,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error calculating glow points:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})