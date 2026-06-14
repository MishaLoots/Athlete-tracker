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

type RaceForm = { name: string; date: string; distance_km: string; elevation_m: string }
function emptyRace(): RaceForm { return { name: '', date: '', distance_km: '', elevation_m: '' } }

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goals | null>(null)
  const [races, setRaces] = useState<Race[]>([])
  const [totalKm, setTotalKm] = useState<number>(0)
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingGoals, setEditingGoals] = useState(false)
  const [showRaceForm, setShowRaceForm] = useState(false)
  const [raceForm, setRaceForm] = useState<RaceForm>(emptyRace())
  const [savingRace, setSavingRace] = useState(false)

  // Goals edit state
  const [gForm, setGForm] = useState({ weight_start: '', weight_target: '', ftp_watts: '', annual_km_offset: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const [goalsRes, raceRes, logsRes] = await Promise.all([
      supabase.from('goals').select('*').limit(1).single(),
      supabase.from('races').select('*').order('date'),
      supabase.from('daily_log').select('distance_km, weight_kg').order('date', { ascending: false }).limit(365),
    ])
    const g = goalsRes.data as Goals
    setGoals(g)
    setGForm({
      weight_start: String(g?.weight_start ?? ''),
      weight_target: String(g?.weight_target ?? ''),
      ftp_watts: String(g?.ftp_watts ?? ''),
      annual_km_offset: String(g?.annual_km_offset ?? 0),
    })
    setRaces((raceRes.data as Race[]) ?? [])

    const logs = (logsRes.data as DailyLog[]) ?? []
    const sumKm = logs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
    setTotalKm(sumKm + (g?.annual_km_offset ?? 0))
    setCurrentWeight(logs.find((l) => l.weight_kg)?.weight_kg ?? null)
  }

  async function saveGoals() {
    if (!goals) return
    setSaving(true)
    await supabase.from('goals').update({
      weight_start: parseFloat(gForm.weight_start) || goals.weight_start,
      weight_target: parseFloat(gForm.weight_target) || goals.weight_target,
      ftp_watts: parseInt(gForm.ftp_watts) || goals.ftp_watts,
      annual_km_offset: parseFloat(gForm.annual_km_offset) || 0,
    }).eq('id', goals.id)
    await load()
    setSaving(false)
    setEditingGoals(false)
  }

  async function saveRace() {
    setSavingRace(true)
    await supabase.from('races').insert({
      name: raceForm.name,
      date: raceForm.date,
      distance_km: parseFloat(raceForm.distance_km) || 0,
      elevation_m: parseInt(raceForm.elevation_m) || 0,
      completed: false,
    })
    setRaceForm(emptyRace())
    setShowRaceForm(false)
    await load()
    setSavingRace(false)
  }

  async function toggleRaceComplete(race: Race) {
    await supabase.from('races').update({ completed: !race.completed }).eq('id', race.id)
    await load()
  }

  async function deleteRace(id: string) {
    await supabase.from('races').delete().eq('id', id)
    await load()
  }

  const weightTarget = goals?.weight_target ?? 95
  const weightStart = goals?.weight_start ?? 100
  const weightProgress = currentWeight
    ? Math.min(100, Math.max(0, ((weightStart - currentWeight) / (weightStart - weightTarget)) * 100))
    : 0
  const kmProgress = Math.min(100, (totalKm / 10000) * 100)
  const nextRace = races.find((r) => !r.completed && new Date(r.date) >= new Date())

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
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Weight Goal</p>
          <button onClick={() => setEditingGoals(!editingGoals)}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800">
            {editingGoals ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingGoals ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Start weight (kg)</label>
                <input type="number" step="0.1" value={gForm.weight_start}
                  onChange={(e) => setGForm(f => ({ ...f, weight_start: e.target.value }))}
                  className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Target weight (kg)</label>
                <input type="number" step="0.1" value={gForm.weight_target}
                  onChange={(e) => setGForm(f => ({ ...f, weight_target: e.target.value }))}
                  className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">FTP (watts)</label>
                <input type="number" value={gForm.ftp_watts}
                  onChange={(e) => setGForm(f => ({ ...f, ftp_watts: e.target.value }))}
                  className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Distance offset (km)</label>
                <input type="number" value={gForm.annual_km_offset}
                  onChange={(e) => setGForm(f => ({ ...f, annual_km_offset: e.target.value }))}
                  className="input" placeholder="Rides before app" />
              </div>
            </div>
            <button onClick={saveGoals} disabled={saving}
              className="w-full py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-medium hover:bg-[#18896a] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Goals'}
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
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
      </div>

      {/* Races */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Races</p>
          <button onClick={() => setShowRaceForm(!showRaceForm)}
            className="text-xs text-[#1D9E75] hover:text-[#18896a] px-2 py-1 rounded hover:bg-gray-800">
            {showRaceForm ? 'Cancel' : '+ Add race'}
          </button>
        </div>

        {showRaceForm && (
          <div className="bg-gray-900 rounded-xl p-4 space-y-3 mb-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Race name</label>
                <input type="text" value={raceForm.name} onChange={(e) => setRaceForm(f => ({ ...f, name: e.target.value }))}
                  className="input" placeholder="e.g. Cape Town Cycle Tour" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Date</label>
                <input type="date" value={raceForm.date} onChange={(e) => setRaceForm(f => ({ ...f, date: e.target.value }))}
                  className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Distance (km)</label>
                <input type="number" step="0.1" value={raceForm.distance_km} onChange={(e) => setRaceForm(f => ({ ...f, distance_km: e.target.value }))}
                  className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Elevation (m)</label>
                <input type="number" value={raceForm.elevation_m} onChange={(e) => setRaceForm(f => ({ ...f, elevation_m: e.target.value }))}
                  className="input" />
              </div>
            </div>
            <button onClick={saveRace} disabled={savingRace || !raceForm.name || !raceForm.date}
              className="w-full py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-medium hover:bg-[#18896a] disabled:opacity-50">
              {savingRace ? 'Saving…' : 'Add Race'}
            </button>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {races.length === 0 ? (
            <p className="p-4 text-sm text-gray-600">No races added yet.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {races.map((race) => (
                <div key={race.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${race.completed ? 'text-gray-600 line-through' : 'text-gray-200'}`}>{race.name}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(race.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{race.distance_km}km · {race.elevation_m}m
                      {!race.completed && new Date(race.date) >= new Date() && (
                        <span className="text-[#1D9E75] ml-1">· {daysUntil(race.date)}d</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggleRaceComplete(race)}
                      className={`text-xs px-2 py-1 rounded ${race.completed ? 'text-gray-500 hover:text-gray-300' : 'text-[#1D9E75] hover:text-[#18896a]'}`}>
                      {race.completed ? 'Undo' : '✓'}
                    </button>
                    <button onClick={() => deleteRace(race.id)}
                      className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
