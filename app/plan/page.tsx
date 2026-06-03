'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DAY_TYPES, DAY_TYPE_LABELS, DAY_TYPE_COLORS, DAY_TYPE_TARGETS } from '@/lib/dayTypes'

const ACTIVITY_TYPES = ['road', 'gravel', 'mtb', 'zwift', 'gym', 'karate', 'rest']

const ACTIVITY_TO_DAY_TYPE: Record<string, string> = {
  road: 'easy', gravel: 'easy', mtb: 'easy', zwift: 'easy',
  gym: 'easy', karate: 'easy', rest: 'rest',
}

// Priority for determining day's macro target when multiple sessions exist
const DAY_TYPE_PRIORITY: Record<string, number> = {
  rest: 0, recovery: 1, easy: 2, moderate: 3, hard: 4, long: 5, race: 6,
}

type Session = {
  id?: string
  date: string
  activity_type: string | null
  planned_duration_min: number | null
  planned_tss: number | null
  planned_distance_km: number | null
  day_type: string | null
  notes: string | null
  session_order: number
}

type Actual = {
  date: string
  activity_type: string | null
  duration_min: number | null
  tss: number | null
  distance_km: number | null
}

function getWeekDates(offset = 0): string[] {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function newSession(date: string, order: number): Session {
  return { date, activity_type: null, planned_duration_min: null, planned_tss: null, planned_distance_km: null, day_type: null, notes: null, session_order: order }
}

function getDayType(sessions: Session[]): string | null {
  if (!sessions.length) return null
  return sessions.reduce((best, s) => {
    const p = DAY_TYPE_PRIORITY[s.day_type ?? 'rest'] ?? 0
    const bp = DAY_TYPE_PRIORITY[best ?? 'rest'] ?? 0
    return p > bp ? s.day_type : best
  }, null as string | null)
}

export default function PlanPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [dates, setDates] = useState<string[]>(getWeekDates(0))
  const [sessions, setSessions] = useState<Record<string, Session[]>>({})
  const [actuals, setActuals] = useState<Record<string, Actual[]>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const d = getWeekDates(weekOffset)
    setDates(d)
    loadData(d)
  }, [weekOffset])

  async function loadData(d: string[]) {
    const [planRes, actualRes] = await Promise.all([
      supabase.from('weekly_plan').select('*').in('date', d).order('session_order'),
      supabase.from('daily_log').select('date, activity_type, duration_min, tss, distance_km').in('date', d),
    ])

    const sessionMap: Record<string, Session[]> = {}
    d.forEach((date) => { sessionMap[date] = [] })
    ;(planRes.data ?? []).forEach((s: Session) => {
      if (!sessionMap[s.date]) sessionMap[s.date] = []
      sessionMap[s.date].push(s)
    })
    setSessions(sessionMap)

    const actualMap: Record<string, Actual[]> = {}
    ;(actualRes.data ?? []).forEach((a: Actual) => {
      if (!actualMap[a.date]) actualMap[a.date] = []
      actualMap[a.date].push(a)
    })
    setActuals(actualMap)
  }

  function updateSession(date: string, idx: number, field: keyof Session, value: string) {
    setSessions((prev) => {
      const list = [...(prev[date] ?? [])]
      const updated = { ...list[idx], [field]: value || null }
      if (field === 'activity_type') {
        updated.day_type = ACTIVITY_TO_DAY_TYPE[value] ?? 'rest'
      }
      list[idx] = updated
      return { ...prev, [date]: list }
    })
  }

  function addSession(date: string) {
    setSessions((prev) => {
      const list = prev[date] ?? []
      return { ...prev, [date]: [...list, newSession(date, list.length + 1)] }
    })
  }

  function removeSession(date: string, idx: number) {
    setSessions((prev) => {
      const list = [...(prev[date] ?? [])]
      list.splice(idx, 1)
      return { ...prev, [date]: list }
    })
  }

  async function saveDay(date: string) {
    setSaving(true)
    const list = sessions[date] ?? []

    // Delete all existing for this date, re-insert
    await supabase.from('weekly_plan').delete().eq('date', date)

    if (list.length > 0) {
      const toInsert = list.map((s, i) => ({
        date: s.date,
        activity_type: s.activity_type,
        planned_duration_min: s.planned_duration_min,
        planned_tss: s.planned_tss,
        planned_distance_km: s.planned_distance_km,
        day_type: s.day_type,
        notes: s.notes,
        session_order: i + 1,
      }))
      const { data } = await supabase.from('weekly_plan').insert(toInsert).select()
      if (data) {
        setSessions((prev) => ({ ...prev, [date]: data as Session[] }))
      }
    }

    setSaving(false)
    setEditing(null)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Weekly Plan</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((o) => o - 1)}
            className="px-3 py-1 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-100 text-sm">←</button>
          <span className="text-sm text-gray-500 w-24 text-center">
            {weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : weekOffset === -1 ? 'Last week' : `${weekOffset > 0 ? '+' : ''}${weekOffset}w`}
          </span>
          <button onClick={() => setWeekOffset((o) => o + 1)}
            className="px-3 py-1 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-100 text-sm">→</button>
        </div>
      </div>

      <div className="space-y-2">
        {dates.map((date) => {
          const daySessions = sessions[date] ?? []
          const dayActuals = actuals[date] ?? []
          const isToday = date === today
          const isPast = date < today
          const isEditing = editing === date
          const dayName = new Date(date).toLocaleDateString('en-ZA', { weekday: 'long' })
          const dayNum = new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
          const dayType = getDayType(daySessions)

          return (
            <div key={date}
              className={`bg-gray-900 rounded-xl p-4 border ${isToday ? 'border-[#1D9E75]/40' : 'border-transparent'}`}>

              {/* Day header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${isToday ? 'text-[#1D9E75]' : 'text-gray-200'}`}>{dayName}</span>
                  <span className="text-xs text-gray-600">{dayNum}</span>
                  {dayType && (
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-800 ${DAY_TYPE_COLORS[dayType as keyof typeof DAY_TYPE_COLORS] ?? 'text-gray-400'}`}>
                      {DAY_TYPE_LABELS[dayType]}
                    </span>
                  )}
                  {daySessions.length > 1 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-purple-400">
                      Double
                    </span>
                  )}
                </div>
                <button onClick={() => setEditing(isEditing ? null : date)}
                  className="text-xs text-gray-600 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors">
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  {daySessions.map((session, idx) => (
                    <div key={idx} className="bg-gray-800/50 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Session {idx + 1}</span>
                        {daySessions.length > 1 && (
                          <button onClick={() => removeSession(date, idx)}
                            className="text-xs text-red-400 hover:text-red-300">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Activity</label>
                          <select value={session.activity_type ?? ''} onChange={(e) => updateSession(date, idx, 'activity_type', e.target.value)} className="input">
                            <option value="">—</option>
                            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Day type</label>
                          <select value={session.day_type ?? ''} onChange={(e) => updateSession(date, idx, 'day_type', e.target.value)} className="input">
                            <option value="">—</option>
                            {DAY_TYPES.map((t) => <option key={t} value={t}>{DAY_TYPE_LABELS[t]}</option>)}
                          </select>
                          {session.day_type && DAY_TYPE_TARGETS[session.day_type as keyof typeof DAY_TYPE_TARGETS] && (
                            <p className="text-xs text-gray-600 mt-1">
                              {DAY_TYPE_TARGETS[session.day_type as keyof typeof DAY_TYPE_TARGETS].calories} kcal · {DAY_TYPE_TARGETS[session.day_type as keyof typeof DAY_TYPE_TARGETS].protein}g P · {DAY_TYPE_TARGETS[session.day_type as keyof typeof DAY_TYPE_TARGETS].carbs}g C
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
                          <input type="number" value={session.planned_duration_min ?? ''} onChange={(e) => updateSession(date, idx, 'planned_duration_min', e.target.value)} className="input" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Distance (km)</label>
                          <input type="number" step="0.1" value={session.planned_distance_km ?? ''} onChange={(e) => updateSession(date, idx, 'planned_distance_km', e.target.value)} className="input" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Planned TSS</label>
                          <input type="number" value={session.planned_tss ?? ''} onChange={(e) => updateSession(date, idx, 'planned_tss', e.target.value)} className="input" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                          <input type="text" value={session.notes ?? ''} onChange={(e) => updateSession(date, idx, 'notes', e.target.value)} className="input" placeholder="e.g. Zone 2 spin" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button onClick={() => addSession(date)}
                    className="w-full py-2 rounded-lg border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 text-sm transition-colors">
                    + Add session
                  </button>

                  <button onClick={() => saveDay(date)} disabled={saving}
                    className="w-full py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-medium hover:bg-[#18896a] disabled:opacity-50 transition-colors">
                    {saving ? 'Saving…' : 'Save day'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  {/* Planned sessions */}
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1.5">Planned</p>
                    {daySessions.length > 0 ? (
                      <div className="space-y-1.5">
                        {daySessions.map((s, i) => (
                          <div key={i} className="text-sm">
                            {daySessions.length > 1 && <span className="text-xs text-gray-600 mr-1">S{i + 1}</span>}
                            <span className="text-gray-300 capitalize">{s.activity_type ?? '—'}</span>
                            {s.planned_duration_min && <span className="text-gray-500"> · {s.planned_duration_min}min</span>}
                            {s.planned_distance_km && <span className="text-gray-500"> · {s.planned_distance_km}km</span>}
                            {s.planned_tss && <span className="text-gray-500"> · TSS {s.planned_tss}</span>}
                            {s.notes && <span className="text-gray-600 text-xs"> — {s.notes}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700">Not planned</p>
                    )}
                  </div>

                  {/* Actuals */}
                  {(isPast || isToday) && (
                    <div className="flex-1 border-l border-gray-800 pl-4">
                      <p className="text-xs text-gray-600 uppercase tracking-wide mb-1.5">Actual</p>
                      {dayActuals.filter(a => a.activity_type).length > 0 ? (
                        <div className="space-y-1.5">
                          {dayActuals.filter(a => a.activity_type).map((a, i) => (
                            <div key={i} className="text-sm text-[#1D9E75]">
                              <span className="capitalize">{a.activity_type}</span>
                              {a.duration_min && <span className="text-gray-500"> · {a.duration_min}min</span>}
                              {a.distance_km && <span className="text-gray-500"> · {a.distance_km}km</span>}
                              {a.tss && <span className="text-gray-500"> · TSS {a.tss}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700">Not logged</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
