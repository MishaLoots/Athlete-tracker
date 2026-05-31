'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Goals, Race, DailyLog } from '@/lib/types'

const ZONES = [
  { zone: 'Z1 Recovery', power: '< 160W', hr: '< 104 bpm' },
  { zone: 'Z2 Base', power: '160–216W', hr: '104–128 bpm' },
  { zone: 'Z3 Tempo', power: '217–250W', hr: '129–143 bpm' },
  { zone: 'Z4 Threshold', power: '251–285W', hr: '144–152 bpm' },
  { zone: 'Z5 VO2max', power: '286–342W', hr: '> 152 bpm' },
]

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goals | null>(null)
  const [nextRace, setNextRace] = useState<Race | null>(null)
  const [totalKm, setTotalKm] = useState<number>(0)
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [offsetInput, setOffsetInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [goalsRes, raceRes, logsRes] = await Promise.all([
        supabase.from('goals').select('*').limit(1).single(),
        supabase.from('races').select('*').eq('completed', false).order('date').limit(1),
        supabase.from('daily_log').select('distance_km, weight_kg').order('date', { ascending: false }).limit(365),
      ])
      const g = goalsRes.data as Goals
      setGoals(g)
      setOffsetInput(String(g?.annual_km_offset ?? 0))
      setNextRace((raceRes.data as Race[])?.[0] ?? null)

      const logs = (logsRes.data as DailyLog[]) ?? []
      const sumKm = logs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
      setTotalKm(sumKm + (g?.annual_km_offset ?? 0))
      setCurrentWeight(logs.find((l) => l.weight_kg)?.weight_kg ?? null)
    }
    load()
  }, [])

  async function saveOffset() {
    if (!goals) return
    setSaving(true)
    const offset = parseFloat(offsetInput) || 0
    await supabase.from('goals').update({ annual_km_offset: offset }).eq('id', goals.id)
    setGoals({ ...goals, annual_km_offset: offset })
    setSaving(false)
  }

  const weightTarget = goals?.weight_target ?? 95
  const weightStart = goals?.weight_start ?? 100
  const weightProgress = currentWeight
    ? Math.min(100, Math.max(0, ((weightStart - currentWeight) / (weightStart - weightTarget)) * 100))
    : 0
  const kmProgress = Math.min(100, (totalKm / 10000) * 100)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Goals</h1>

      {/* Next race */}
      {nextRace && (
        <div className="bg-gray-900 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Next Race</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-[#1D9E75]">{nextRace.name}</p>
              <p className="text-sm text-gray-400">
                {new Date(nextRace.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-sm text-gray-500 mt-1">{nextRace.distance_km}km · {nextRace.elevation_m}m elevation</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-[#1D9E75]">{daysUntil(nextRace.date)}</p>
              <p className="text-xs text-gray-500">days away</p>
            </div>
          </div>
        </div>
      )}

      {/* Weight goal */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Weight Goal</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Start: {weightStart}kg</span>
          <span className="text-gray-300">Current: {currentWeight ? `${currentWeight}kg` : '—'}</span>
          <span className="text-[#1D9E75]">Target: {weightTarget}kg</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${weightProgress}%` }} />
        </div>
        <p className="text-xs text-gray-500">
          {weightProgress.toFixed(0)}% complete
          {currentWeight && ` · ${(currentWeight - weightTarget).toFixed(1)}kg to go`}
        </p>
      </div>

      {/* Annual km */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Annual Distance Goal</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{totalKm.toFixed(0)} km</span>
          <span className="text-[#1D9E75]">10,000 km</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${kmProgress}%` }} />
        </div>
        <p className="text-xs text-gray-500">{kmProgress.toFixed(1)}% · {(10000 - totalKm).toFixed(0)}km remaining</p>

        <div className="flex gap-2 items-center pt-2 border-t border-gray-800">
          <label className="text-xs text-gray-500 whitespace-nowrap">Offset km (rides before app)</label>
          <input
            type="number"
            value={offsetInput}
            onChange={(e) => setOffsetInput(e.target.value)}
            className="input flex-1 text-sm"
            placeholder="0"
          />
          <button
            onClick={saveOffset}
            disabled={saving}
            className="px-3 py-1.5 bg-[#1D9E75] text-white text-xs rounded-lg hover:bg-[#18896a] disabled:opacity-50"
          >
            {saving ? '…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Power/HR zones */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Power & HR Zones (FTP {goals?.ftp_watts ?? 285}W)</p>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-3 text-gray-500 font-normal">Zone</th>
                <th className="text-left p-3 text-gray-500 font-normal">Power</th>
                <th className="text-left p-3 text-gray-500 font-normal">HR</th>
              </tr>
            </thead>
            <tbody>
              {ZONES.map((z, i) => (
                <tr key={i} className="border-b border-gray-800/50 last:border-0">
                  <td className="p-3 text-gray-300 font-medium">{z.zone}</td>
                  <td className="p-3 text-blue-400">{z.power}</td>
                  <td className="p-3 text-[#1D9E75]">{z.hr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
