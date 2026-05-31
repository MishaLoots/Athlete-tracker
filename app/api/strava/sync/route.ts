import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getFreshToken() {
  const { data } = await supabase.from('strava_tokens').select('*').limit(1).single()
  if (!data) return null

  // Refresh if expired
  if (data.expires_at < Math.floor(Date.now() / 1000)) {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const fresh = await res.json()
    await supabase.from('strava_tokens').update({
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: fresh.expires_at,
      updated_at: new Date().toISOString(),
    }).eq('id', data.id)
    return fresh.access_token
  }

  return data.access_token
}

// Map Strava sport_type to our activity_type
function mapActivityType(sportType: string): string {
  const map: Record<string, string> = {
    Ride: 'road',
    RoadBike: 'road',
    GravelBike: 'gravel',
    MountainBikeRide: 'mtb',
    VirtualRide: 'zwift',
    WeightTraining: 'gym',
    Workout: 'gym',
    Yoga: 'rest',
    Walk: 'rest',
    Hike: 'rest',
  }
  return map[sportType] ?? 'road'
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const token = await getFreshToken()
  if (!token) {
    return NextResponse.json({ error: 'Not connected to Strava' }, { status: 401 })
  }

  // Fetch activities for the given date
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(start.getTime() / 1000)}&before=${Math.floor(end.getTime() / 1000)}&per_page=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  const activities = await res.json()

  if (!activities.length) {
    return NextResponse.json({ error: 'No activity found for this date' }, { status: 404 })
  }

  const a = activities[0]
  const distanceKm = Math.round((a.distance / 1000) * 10) / 10
  const durationMin = Math.round(a.moving_time / 60)
  const activityType = mapActivityType(a.sport_type)

  // Calculate TSS if power data available (rides)
  let tss: number | null = null
  if (a.weighted_average_watts && a.moving_time) {
    const ftp = 285
    const np = a.weighted_average_watts
    const if_ = np / ftp
    tss = Math.round((a.moving_time * np * if_) / (ftp * 3600) * 100)
  }

  // Upsert into daily_log
  const { error } = await supabase.from('daily_log').upsert({
    date,
    activity_type: activityType,
    duration_min: durationMin,
    distance_km: distanceKm,
    tss,
    training_notes: a.name,
  }, { onConflict: 'date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    synced: true,
    activity: a.name,
    type: activityType,
    distance_km: distanceKm,
    duration_min: durationMin,
    tss,
  })
}
