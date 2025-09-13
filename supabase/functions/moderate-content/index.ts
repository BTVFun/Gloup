// Edge Function: Content Moderation
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple content moderation rules
const BANNED_WORDS = [
  'spam', 'scam', 'hate', 'violence', 'harassment'
  // Add more as needed
]

const SUSPICIOUS_PATTERNS = [
  /(.)\1{4,}/g, // Repeated characters (aaaaa)
  /[A-Z]{10,}/g, // Too many caps
  /(https?:\/\/[^\s]+)/g, // URLs (might be spam)
]

interface ModerationRequest {
  content: string
  user_id: string
  post_id?: string
  context_type: 'post' | 'comment' | 'message'
}

interface ModerationResult {
  approved: boolean
  confidence: number
  flags: string[]
  suggested_action: 'approve' | 'review' | 'reject'
  filtered_content?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { content, user_id, post_id, context_type } = await req.json() as ModerationRequest

    // Perform moderation checks
    const moderationResult = await moderateContent(content, user_id, supabaseClient)

    // Log moderation result
    await supabaseClient
      .from('moderation_logs')
      .insert({
        user_id,
        post_id,
        content_type: context_type,
        original_content: content,
        moderation_result: moderationResult,
        created_at: new Date().toISOString(),
      })

    // If content is rejected, don't save it
    if (moderationResult.suggested_action === 'reject') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Content violates community guidelines',
          moderation: moderationResult,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // If content needs review, flag it
    if (moderationResult.suggested_action === 'review') {
      await supabaseClient
        .from('content_review_queue')
        .insert({
          user_id,
          post_id,
          content,
          flags: moderationResult.flags,
          priority: moderationResult.confidence > 0.8 ? 'high' : 'medium',
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        moderation: moderationResult,
        filtered_content: moderationResult.filtered_content || content,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in content moderation:', error)
    
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

async function moderateContent(
  content: string, 
  userId: string, 
  supabase: any
): Promise<ModerationResult> {
  const flags: string[] = []
  let confidence = 0
  let filteredContent = content

  // Check for banned words
  const lowerContent = content.toLowerCase()
  for (const word of BANNED_WORDS) {
    if (lowerContent.includes(word)) {
      flags.push(`banned_word:${word}`)
      confidence += 0.3
      filteredContent = filteredContent.replace(new RegExp(word, 'gi'), '***')
    }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      flags.push(`suspicious_pattern:${pattern.source}`)
      confidence += 0.2
    }
  }

  // Check user history
  const { data: userHistory } = await supabase
    .from('moderation_logs')
    .select('moderation_result')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(10)

  if (userHistory) {
    const recentViolations = userHistory.filter(
      (log: any) => log.moderation_result?.suggested_action !== 'approve'
    ).length

    if (recentViolations > 3) {
      flags.push('repeat_offender')
      confidence += 0.4
    }
  }

  // Determine action based on confidence
  let suggestedAction: 'approve' | 'review' | 'reject' = 'approve'
  
  if (confidence >= 0.8) {
    suggestedAction = 'reject'
  } else if (confidence >= 0.4) {
    suggestedAction = 'review'
  }

  return {
    approved: suggestedAction === 'approve',
    confidence: Math.min(confidence, 1),
    flags,
    suggested_action: suggestedAction,
    filtered_content: filteredContent !== content ? filteredContent : undefined,
  }
}