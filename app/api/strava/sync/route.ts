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

// Priority order for picking the "primary" activity type on a double day
const ACTIVITY_PRIORITY: Record<string, number> = {
  race: 7, long: 6, road: 5, gravel: 5, mtb: 5, zwift: 4,
  hard: 4, moderate: 3, gym: 2, karate: 2, rest: 1,
}

// Map Strava sport_type + activity name to our activity_type
function mapActivityType(sportType: string, activityName: string): string {
  const name = activityName.toLowerCase()

  // Name-based overrides — checked before sport_type map
  if (name.includes('karate') || name.includes('martial') || name === 'afternoon workout') return 'karate'

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

  // Fetch ALL activities for the given date (per_page=10 covers any double/triple day)
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(start.getTime() / 1000)}&before=${Math.floor(end.getTime() / 1000)}&per_page=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  const activities = await res.json()

  if (!activities.length) {
    return NextResponse.json({ error: 'No activity found for this date' }, { status: 404 })
  }

  // Accumulate totals across all sessions
  let totalDistanceKm = 0
  let totalDurationMin = 0
  let totalTss = 0
  let totalCaloriesBurned = 0
  const names: string[] = []
  let primaryType = 'rest'
  let primaryPriority = -1

  for (const a of activities) {
    const activityType = mapActivityType(a.sport_type, a.name ?? '')
    const distanceKm = Math.round((a.distance / 1000) * 10) / 10
    const durationMin = Math.round(a.moving_time / 60)

    totalDistanceKm += distanceKm
    totalDurationMin += durationMin
    totalCaloriesBurned += a.calories ?? 0
    names.push(a.name ?? activityType)

    // TSS from power data if available (mainly rides)
    if (a.weighted_average_watts && a.moving_time) {
      const ftp = 285
      const np = a.weighted_average_watts
      const if_ = np / ftp
      totalTss += Math.round((a.moving_time * np * if_) / (ftp * 3600) * 100)
    }

    // Use the highest-priority activity type as the primary for the day
    const priority = ACTIVITY_PRIORITY[activityType] ?? 0
    if (priority > primaryPriority) {
      primaryPriority = priority
      primaryType = activityType
    }
  }

  const finalDistance = Math.round(totalDistanceKm * 10) / 10
  const finalTss = totalTss > 0 ? totalTss : null
  const combinedNotes = names.join(' + ')

  // Upsert into daily_log — all sessions combined into one row
  const { error } = await supabase.from('daily_log').upsert({
    date,
    activity_type: primaryType,
    duration_min: totalDurationMin,
    distance_km: finalDistance || null,
    tss: finalTss,
    training_notes: combinedNotes,
    calories_burned: totalCaloriesBurned > 0 ? totalCaloriesBurned : null,
  }, { onConflict: 'date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    synced: true,
    sessions: activities.length,
    activity: combinedNotes,
    type: primaryType,
    distance_km: finalDistance,
    duration_min: totalDurationMin,
    tss: finalTss,
    calories_burned: totalCaloriesBurned > 0 ? totalCaloriesBurned : null,
  })
}
