// Edge Function: Send Push Notifications
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  user_id: string
  title: string
  body: string
  data?: Record<string, any>
  type: 'reaction' | 'comment' | 'follow' | 'message' | 'system'
  priority?: 'high' | 'normal' | 'low'
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

    const notification = await req.json() as NotificationRequest

    // Get user's notification preferences
    const { data: userPrefs, error: prefsError } = await supabaseClient
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .single()

    if (prefsError && prefsError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user preferences: ${prefsError.message}`)
    }

    // Check if user wants this type of notification
    const prefs = userPrefs || {}
    const notificationEnabled = prefs[`${notification.type}_notifications`] !== false

    if (!notificationEnabled) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notification skipped due to user preferences',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Get user's push tokens
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('user_push_tokens')
      .select('token, platform')
      .eq('user_id', notification.user_id)
      .eq('active', true)

    if (tokensError) {
      throw new Error(`Failed to fetch push tokens: ${tokensError.message}`)
    }

    // Send notifications to all user's devices
    const results = []
    
    for (const tokenData of pushTokens || []) {
      try {
        const result = await sendPushNotification({
          token: tokenData.token,
          platform: tokenData.platform,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          priority: notification.priority || 'normal',
        })
        results.push({ token: tokenData.token, success: true, result })
      } catch (error) {
        results.push({ token: tokenData.token, success: false, error: error.message })
        
        // If token is invalid, mark it as inactive
        if (error.message.includes('invalid') || error.message.includes('not registered')) {
          await supabaseClient
            .from('user_push_tokens')
            .update({ active: false })
            .eq('token', tokenData.token)
        }
      }
    }

    // Store notification in database
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        type: notification.type,
        sent_at: new Date().toISOString(),
        delivery_results: results,
      })

    // Update analytics
    await supabaseClient
      .from('analytics_events')
      .insert({
        event_type: 'notification_sent',
        user_id: notification.user_id,
        metadata: {
          notification_type: notification.type,
          devices_count: pushTokens?.length || 0,
          successful_deliveries: results.filter(r => r.success).length,
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        delivered_to: results.filter(r => r.success).length,
        total_devices: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error sending notification:', error)
    
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

async function sendPushNotification({
  token,
  platform,
  title,
  body,
  data,
  priority,
}: {
  token: string
  platform: 'ios' | 'android' | 'web'
  title: string
  body: string
  data?: Record<string, any>
  priority: 'high' | 'normal' | 'low'
}) {
  // This is a simplified example. In production, you'd use:
  // - Firebase Cloud Messaging for Android/iOS
  // - Apple Push Notification Service for iOS
  // - Web Push for web browsers
  
  const payload = {
    to: token,
    title,
    body,
    data: data || {},
    priority: priority === 'high' ? 'high' : 'normal',
    sound: 'default',
    badge: 1,
  }

  // Mock implementation - replace with actual push service
  console.log(`Sending push notification to ${platform} device:`, payload)
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  return { messageId: `mock_${Date.now()}` }
}