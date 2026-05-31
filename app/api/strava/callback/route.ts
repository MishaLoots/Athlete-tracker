import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!code) {
    return NextResponse.redirect(`${appUrl}/log?strava=error`)
  }

  // Exchange code for tokens
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  const data = await res.json()

  if (!data.access_token) {
    return NextResponse.redirect(`${appUrl}/log?strava=error`)
  }

  // Upsert tokens (single row — delete existing first)
  await supabase.from('strava_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('strava_tokens').insert({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  })

  return NextResponse.redirect(`${appUrl}/log?strava=connected`)
}
