'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ACTIVITY_TYPES = ['road', 'gravel', 'mtb', 'zwift', 'gym', 'karate', 'rest']

const DAY_TYPE_MAP: Record<string, string> = {
  road: 'easy', gravel: 'easy', mtb: 'easy', zwift: 'easy',
  gym: 'easy', karate: 'easy', rest: 'rest',
}

const DAY_TYPE_LABELS: Record<string, string> = {
  rest: 'Rest', easy: 'Easy', hard: 'Hard', race: 'Race',
}

const DAY_TYPE_COLORS: Record<string, string> = {
  rest: 'text-gray-500', easy: 'text-blue-400', hard: 'text-amber-400', race: 'text-[#1D9E75]',
}

type Plan = {
  id?: string
  date: string
  activity_type: string | null
  planned_duration_min: number | null
  planned_tss: number | null
  planned_distance_km: number | null
  day_type: string | null
  notes: string | null
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

function emptyPlan(date: string): Plan {
  return { date, activity_type: null, planned_duration_min: null, planned_tss: null, planned_distance_km: null, day_type: null, notes: null }
}

export default function PlanPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [dates, setDates] = useState<string[]>(getWeekDates(0))
  const [plans, setPlans] = useState<Record<string, Plan>>({})
  const [actuals, setActuals] = useState<Record<string, Actual>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const d = getWeekDates(weekOffset)
    setDates(d)
    loadData(d)
  }, [weekOffset])

  async function loadData(d: string[]) {
    const [planRes, actualRes] = await Promise.all([
      supabase.from('weekly_plan').select('*').in('date', d),
      supabase.from('daily_log').select('date, activity_type, duration_min, tss, distance_km').in('date', d),
    ])

    const planMap: Record<string, Plan> = {}
    d.forEach((date) => { planMap[date] = emptyPlan(date) })
    ;(planRes.data ?? []).forEach((p: Plan) => { planMap[p.date] = p })
    setPlans(planMap)

    const actualMap: Record<string, Actual> = {}
    ;(actualRes.data ?? []).forEach((a: Actual) => { actualMap[a.date] = a })
    setActuals(actualMap)
  }

  function updatePlan(date: string, field: keyof Plan, value: string) {
    setPlans((prev) => {
      const updated = { ...prev[date], [field]: value || null }
      // Auto-set day_type from activity
      if (field === 'activity_type') {
        updated.day_type = DAY_TYPE_MAP[value] ?? 'rest'
      }
      return { ...prev, [date]: updated }
    })
  }

  async function savePlan(date: string) {
    setSaving(date)
    const plan = plans[date]
    const { id, ...data } = plan
    if (id) {
      await supabase.from('weekly_plan').update(data).eq('id', id)
    } else {
      const { data: inserted } = await supabase.from('weekly_plan').insert(data).select().single()
      if (inserted) setPlans((prev) => ({ ...prev, [date]: inserted as Plan }))
    }
    setSaving(null)
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
          const plan = plans[date] ?? emptyPlan(date)
          const actual = actuals[date]
          const isToday = date === today
          const isPast = date < today
          const isEditing = editing === date
          const dayName = new Date(date).toLocaleDateString('en-ZA', { weekday: 'long' })
          const dayNum = new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })

          return (
            <div key={date}
              className={`bg-gray-900 rounded-xl p-4 border ${isToday ? 'border-[#1D9E75]/40' : 'border-transparent'}`}>
              {/* Day header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div>
                    <span className={`font-semibold text-sm ${isToday ? 'text-[#1D9E75]' : 'text-gray-200'}`}>{dayName}</span>
                    <span className="text-xs text-gray-600 ml-2">{dayNum}</span>
                  </div>
                  {plan.day_type && (
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-800 ${DAY_TYPE_COLORS[plan.day_type]}`}>
                      {DAY_TYPE_LABELS[plan.day_type]}
                    </span>
                  )}
                </div>
                <button onClick={() => setEditing(isEditing ? null : date)}
                  className="text-xs text-gray-600 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors">
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {isEditing ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Activity</label>
                      <select value={plan.activity_type ?? ''} onChange={(e) => updatePlan(date, 'activity_type', e.target.value)} className="input">
                        <option value="">—</option>
                        {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Day type</label>
                      <select value={plan.day_type ?? ''} onChange={(e) => updatePlan(date, 'day_type', e.target.value)} className="input">
                        <option value="">—</option>
                        {['rest', 'easy', 'hard', 'race'].map((t) => <option key={t} value={t}>{DAY_TYPE_LABELS[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
                      <input type="number" value={plan.planned_duration_min ?? ''} onChange={(e) => updatePlan(date, 'planned_duration_min', e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Distance (km)</label>
                      <input type="number" step="0.1" value={plan.planned_distance_km ?? ''} onChange={(e) => updatePlan(date, 'planned_distance_km', e.target.value)} className="input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Planned TSS</label>
                      <input type="number" value={plan.planned_tss ?? ''} onChange={(e) => updatePlan(date, 'planned_tss', e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                      <input type="text" value={plan.notes ?? ''} onChange={(e) => updatePlan(date, 'notes', e.target.value)} className="input" placeholder="e.g. Zone 2 easy spin" />
                    </div>
                  </div>
                  <button onClick={() => savePlan(date)} disabled={saving === date}
                    className="w-full py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-medium hover:bg-[#18896a] disabled:opacity-50 transition-colors">
                    {saving === date ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : (
                /* View mode */
                <div className="flex gap-4">
                  {/* Planned */}
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Planned</p>
                    {plan.activity_type ? (
                      <div className="space-y-0.5">
                        <p className="text-sm text-gray-300">
                          <span className="capitalize">{plan.activity_type}</span>
                          {plan.planned_duration_min && <span className="text-gray-500"> · {plan.planned_duration_min}min</span>}
                          {plan.planned_distance_km && <span className="text-gray-500"> · {plan.planned_distance_km}km</span>}
                          {plan.planned_tss && <span className="text-gray-500"> · TSS {plan.planned_tss}</span>}
                        </p>
                        {plan.notes && <p className="text-xs text-gray-600">{plan.notes}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700">Not planned</p>
                    )}
                  </div>

                  {/* Actual (only show for today or past) */}
                  {(isPast || isToday) && (
                    <div className="flex-1 border-l border-gray-800 pl-4">
                      <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Actual</p>
                      {actual?.activity_type ? (
                        <div className="space-y-0.5">
                          <p className="text-sm text-[#1D9E75]">
                            <span className="capitalize">{actual.activity_type}</span>
                            {actual.duration_min && <span className="text-gray-500"> · {actual.duration_min}min</span>}
                            {actual.distance_km && <span className="text-gray-500"> · {actual.distance_km}km</span>}
                            {actual.tss && <span className="text-gray-500"> · TSS {actual.tss}</span>}
                          </p>
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
