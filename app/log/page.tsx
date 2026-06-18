'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DailyLog } from '@/lib/types'
import { DAY_TYPES, DAY_TYPE_LABELS, DAY_TYPE_TARGETS } from '@/lib/dayTypes'

const ACTIVITY_TYPES = ['road', 'gravel', 'mtb', 'zwift', 'gym', 'karate', 'rest']

function today() {
  return new Date().toISOString().split('T')[0]
}

type FormData = Omit<DailyLog, 'id'>

function emptyForm(): FormData {
  return {
    date: today(),
    sleep_hrs: null, hrv_ms: null, rhr_bpm: null, weight_kg: null,
    fatigue: null, mood: null, soreness: null, nrs_notes: null,
    protein_g: null, carbs_g: null, fat_g: null, calories_kcal: null, sugar_notes: null,
    activity_type: null, duration_min: null, tss: null, distance_km: null, training_notes: null, calories_burned: null,
    day_type: null,
  }
}

function sleepToDecimal(h: string, m: string): number | null {
  const hrs = parseInt(h) || 0
  const mins = parseInt(m) || 0
  if (!h && !m) return null
  return Math.round((hrs + mins / 60) * 100) / 100
}

function decimalToSleep(val: number | null): { h: string; m: string } {
  if (val === null) return { h: '', m: '' }
  const h = Math.floor(val)
  const m = Math.round((val - h) * 60)
  return { h: String(h), m: m === 0 ? '00' : String(m).padStart(2, '0') }
}

function num(val: string) {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}
function int(val: string) {
  const n = parseInt(val)
  return isNaN(n) ? null : n
}

function LogPageInner() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState<FormData>(emptyForm())
  const [sleepH, setSleepH] = useState('')
  const [sleepM, setSleepM] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [stravaStatus, setStravaStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const [stravaConnected, setStravaConnected] = useState(false)
  const [stravaMsg, setStravaMsg] = useState('')

  useEffect(() => {
    loadEntry(form.date)
    // Check Strava connection
    supabase.from('strava_tokens').select('id').limit(1).then(({ data }) => {
      setStravaConnected(!!(data && data.length > 0))
    })
    // Show connection result from OAuth redirect
    const stravaParam = searchParams.get('strava')
    if (stravaParam === 'connected') setStravaMsg('✓ Strava connected!')
    if (stravaParam === 'error') setStravaMsg('Strava connection failed — try again')
  }, [])

  async function loadEntry(date: string) {
    const { data } = await supabase.from('daily_log').select('*').eq('date', date).maybeSingle()
    if (data) {
      const { id, ...rest } = data as DailyLog
      setForm(rest)
      const { h, m } = decimalToSleep(rest.sleep_hrs)
      setSleepH(h); setSleepM(m)
    } else {
      setForm({ ...emptyForm(), date })
      setSleepH(''); setSleepM('')
    }
  }

  function handleDate(e: React.ChangeEvent<HTMLInputElement>) {
    loadEntry(e.target.value)
  }

  function set(field: keyof FormData, value: string | null) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const { error } = await supabase.from('daily_log').upsert({ ...form }, { onConflict: 'date' })
    if (error) { setStatus('error'); setErrorMsg(error.message) }
    else { setStatus('saved'); setTimeout(() => setStatus('idle'), 2000) }
  }

  async function syncStrava() {
    setStravaStatus('syncing')
    const res = await fetch(`/api/strava/sync?date=${form.date}`)
    const data = await res.json()
    if (res.ok) {
      setStravaStatus('synced')
      setStravaMsg(`✓ Synced ${data.sessions > 1 ? `${data.sessions} sessions` : data.activity} · ${data.duration_min}min${data.distance_km ? ` · ${data.distance_km}km` : ""}${data.tss ? ` · TSS ${data.tss}` : ""}`)
      loadEntry(form.date)
      setTimeout(() => setStravaStatus('idle'), 3000)
    } else {
      setStravaStatus('error')
      setStravaMsg(data.error ?? 'Sync failed')
      setTimeout(() => setStravaStatus('idle'), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Daily Log</h1>
        {stravaConnected ? (
          <button type="button" onClick={syncStrava} disabled={stravaStatus === 'syncing'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-sm hover:bg-orange-500/20 disabled:opacity-50 transition-colors">
            <span>🔄</span>
            {stravaStatus === 'syncing' ? 'Syncing…' : 'Sync Strava'}
          </button>
        ) : (
          <a href="/api/strava/auth"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-sm hover:bg-orange-500/20 transition-colors">
            <span>🔗</span> Connect Strava
          </a>
        )}
      </div>

      {stravaMsg && (
        <p className={`text-sm ${stravaMsg.startsWith('✓') ? 'text-[#1D9E75]' : 'text-red-400'}`}>{stravaMsg}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div>
          <label className="label">Date</label>
          <input type="date" value={form.date} onChange={handleDate}
            className="input" />
        </div>

        {/* Morning NRS */}
        <section className="bg-gray-900 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-[#1D9E75] uppercase tracking-wide">Morning NRS</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Sleep (h : mm)">
              <div className="flex gap-1 items-center">
                <input type="number" min="0" max="24" placeholder="h" value={sleepH}
                  onChange={(e) => { setSleepH(e.target.value); setForm((f) => ({ ...f, sleep_hrs: sleepToDecimal(e.target.value, sleepM) })) }}
                  className="input w-14 text-center" />
                <span className="text-gray-500">:</span>
                <input type="number" min="0" max="59" placeholder="mm" value={sleepM}
                  onChange={(e) => { setSleepM(e.target.value); setForm((f) => ({ ...f, sleep_hrs: sleepToDecimal(sleepH, e.target.value) })) }}
                  className="input w-16 text-center" />
              </div>
            </Field>
            <Field label="HRV (ms)">
              <input type="number" value={form.hrv_ms ?? ''} onChange={(e) => set('hrv_ms', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="RHR (bpm)">
              <input type="number" value={form.rhr_bpm ?? ''} onChange={(e) => set('rhr_bpm', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" step="0.1" value={form.weight_kg ?? ''} onChange={(e) => set('weight_kg', e.target.value ? String(num(e.target.value)) : null)} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Fatigue (1-10)">
              <input type="number" min="1" max="10" value={form.fatigue ?? ''} onChange={(e) => set('fatigue', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="Mood (1-10)">
              <input type="number" min="1" max="10" value={form.mood ?? ''} onChange={(e) => set('mood', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="Soreness (1-10)">
              <input type="number" min="1" max="10" value={form.soreness ?? ''} onChange={(e) => set('soreness', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
          </div>
          <Field label="Day Type">
            <select value={form.day_type ?? ''} onChange={(e) => set('day_type', e.target.value || null)} className="input">
              <option value="">Select…</option>
              {DAY_TYPES.map((t) => (
                <option key={t} value={t}>{DAY_TYPE_LABELS[t]}</option>
              ))}
            </select>
            {form.day_type && DAY_TYPE_TARGETS[form.day_type as keyof typeof DAY_TYPE_TARGETS] && (
              <p className="text-xs text-gray-600 mt-1">
                Targets: {DAY_TYPE_TARGETS[form.day_type as keyof typeof DAY_TYPE_TARGETS].calories} kcal ·{' '}
                {DAY_TYPE_TARGETS[form.day_type as keyof typeof DAY_TYPE_TARGETS].protein}g protein ·{' '}
                {DAY_TYPE_TARGETS[form.day_type as keyof typeof DAY_TYPE_TARGETS].carbs}g carbs ·{' '}
                {DAY_TYPE_TARGETS[form.day_type as keyof typeof DAY_TYPE_TARGETS].fat}g fat
              </p>
            )}
          </Field>
          <Field label="Notes">
            <textarea value={form.nrs_notes ?? ''} onChange={(e) => set('nrs_notes', e.target.value || null)} className="input resize-none" rows={2} />
          </Field>
        </section>

        {/* Nutrition */}
        <section className="bg-gray-900 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Nutrition</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Protein (g)">
              <input type="number" value={form.protein_g ?? ''} onChange={(e) => set('protein_g', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="Carbs (g)">
              <input type="number" value={form.carbs_g ?? ''} onChange={(e) => set('carbs_g', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="Fat (g)">
              <input type="number" value={form.fat_g ?? ''} onChange={(e) => set('fat_g', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="Calories (kcal)">
              <input type="number" value={form.calories_kcal ?? ''} onChange={(e) => set('calories_kcal', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
          </div>
          <Field label="Sugar notes (blank = clean day)">
            <input type="text" value={form.sugar_notes ?? ''} onChange={(e) => set('sugar_notes', e.target.value || null)} className="input" placeholder="e.g. afternoon biscuits" />
          </Field>
        </section>

        {/* Training */}
        <section className="bg-gray-900 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">Training</h2>
          <Field label="Activity type">
            <select value={form.activity_type ?? ''} onChange={(e) => set('activity_type', e.target.value || null)} className="input">
              <option value="">Select…</option>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Duration (min)">
              <input type="number" value={form.duration_min ?? ''} onChange={(e) => set('duration_min', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="TSS">
              <input type="number" value={form.tss ?? ''} onChange={(e) => set('tss', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="Distance (km)">
              <input type="number" step="0.1" value={form.distance_km ?? ''} onChange={(e) => set('distance_km', e.target.value ? String(num(e.target.value)) : null)} className="input" />
            </Field>
            <Field label="Calories burned">
              <input type="number" value={form.calories_burned ?? ''} onChange={(e) => set('calories_burned', e.target.value ? String(int(e.target.value)) : null)} className="input" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.training_notes ?? ''} onChange={(e) => set('training_notes', e.target.value || null)} className="input resize-none" rows={2} />
          </Field>
        </section>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-3 rounded-xl font-semibold bg-[#1D9E75] text-white hover:bg-[#18896a] disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Save Entry'}
        </button>

        {status === 'error' && <p className="text-red-400 text-sm">{errorMsg}</p>}
      </form>
    </div>
  )
}

export default function LogPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading…</div>}>
      <LogPageInner />
    </Suspense>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      {children}
    </div>
  )
}
