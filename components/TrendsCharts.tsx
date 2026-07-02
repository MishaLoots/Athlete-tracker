'use client'

import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts'
import { DailyLog } from '@/lib/types'
import { DAY_TYPE_TARGETS, DayType } from '@/lib/dayTypes'

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 },
  labelStyle: { color: '#9ca3af' },
}

export default function TrendsCharts({ logs }: { logs: DailyLog[] }) {
  const weightData = logs.filter((l) => l.weight_kg).map((l) => ({ date: fmt(l.date), value: l.weight_kg }))
  const waistData = logs.filter((l) => l.waist_cm).map((l) => ({ date: fmt(l.date), value: l.waist_cm }))
  const hrvData = logs.filter((l) => l.hrv_ms).map((l) => ({ date: fmt(l.date), value: l.hrv_ms }))
  const rhrData = logs.filter((l) => l.rhr_bpm).map((l) => ({ date: fmt(l.date), value: l.rhr_bpm }))
  const last30 = logs.slice(-30)
  const sleepData = last30.map((l) => ({ date: fmt(l.date), value: l.sleep_hrs ?? 0 }))

  // Water intake — last 30 days with data
  const waterData = last30
    .filter((l) => l.water_litres !== null && l.water_litres !== undefined)
    .map((l) => ({ date: fmt(l.date), value: l.water_litres }))

  // Calorie deficit: target - eaten only. Burned is context, not part of the formula.
  const deficitData = last30
    .filter((l) => l.calories_kcal !== null && l.calories_kcal !== undefined)
    .map((l) => {
      const target = DAY_TYPE_TARGETS[(l.day_type as DayType) ?? 'rest']?.calories ?? DAY_TYPE_TARGETS.rest.calories
      const deficit = target - (l.calories_kcal ?? 0)
      const burned = l.calories_burned ?? null
      // Flag: burned calories seem low for the stated day type
      const expectedBurnFloor: Record<string, number> = { hard: 600, long: 700, race: 800, moderate: 400 }
      const floor = expectedBurnFloor[l.day_type ?? '']
      const mislabelFlag = burned !== null && floor !== undefined && burned < floor
      return { date: fmt(l.date), deficit, target, actual: l.calories_kcal, burned, mislabelFlag }
    })

  const last7DeficitData = deficitData.slice(-7)
  const avg7Deficit = last7DeficitData.length
    ? Math.round(last7DeficitData.reduce((s, d) => s + d.deficit, 0) / last7DeficitData.length)
    : null

  const daysOnTarget = deficitData.filter((d) => d.deficit >= 0).length

  return (
    <div className="space-y-4">

      {/* Calorie deficit */}
      {deficitData.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Hit Day-Type Target — last 30 days</p>
            {avg7Deficit !== null && (
              <span className={`text-xs font-medium ${avg7Deficit >= 0 ? 'text-[#1D9E75]' : 'text-red-400'}`}>
                7d avg: {avg7Deficit >= 0 ? '-' : '+'}{Math.abs(avg7Deficit)} kcal/day
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mb-3">Green = under target · Red = over target · {daysOnTarget}/{deficitData.length} days on target (30d)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deficitData} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [`${value >= 0 ? '-' : '+'}${Math.abs(value)} kcal`, value >= 0 ? 'Deficit' : 'Surplus']}
                labelFormatter={(label, payload) => {
                  const d = payload?.[0]?.payload
                  if (!d) return label
                  const burnNote = d.burned ? ` · burned ${d.burned} kcal` : ''
                  const flag = d.mislabelFlag ? ' ⚠ low burn for day type' : ''
                  return `${label} · ate ${d.actual} kcal · target ${d.target} kcal${burnNote}${flag}`
                }}
              />
              <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
              <Bar dataKey="deficit" radius={[3, 3, 0, 0]}>
                {deficitData.map((entry, i) => (
                  <Cell key={i} fill={entry.deficit >= 0 ? '#1D9E75' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Water intake */}
      {waterData.length > 0 && (
        <ChartBox title="Water intake (L) — last 30 days" color="#60a5fa">
          <BarChart data={waterData}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 5]} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} L`, 'Water']} itemStyle={{ color: '#60a5fa' }} />
            <ReferenceLine y={3} stroke="#1D9E75" strokeDasharray="4 2" label={{ value: '3L min', fill: '#1D9E75', fontSize: 10 }} />
            <ReferenceLine y={3.5} stroke="#60a5fa" strokeDasharray="4 2" label={{ value: '3.5L target', fill: '#60a5fa', fontSize: 10 }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {waterData.map((entry, i) => (
                <Cell key={i} fill={(entry.value ?? 0) >= 3 ? '#1D9E75' : (entry.value ?? 0) >= 2 ? '#f59e0b' : '#f87171'} />
              ))}
            </Bar>
          </BarChart>
        </ChartBox>
      )}

      <ChartBox title="Weight (kg)" color="#1D9E75">
        <LineChart data={weightData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
          <Tooltip {...tooltipStyle} itemStyle={{ color: '#1D9E75' }} />
          <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '95kg target', fill: '#f59e0b', fontSize: 10 }} />
          <Line type="monotone" dataKey="value" stroke="#1D9E75" dot={false} strokeWidth={2} />
        </LineChart>
      </ChartBox>

      {waistData.length > 0 && (
        <ChartBox title="Waist (cm) — weekly" color="#a78bfa">
          <LineChart data={waistData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} cm`, 'Waist']} itemStyle={{ color: '#a78bfa' }} />
            <Line type="monotone" dataKey="value" stroke="#a78bfa" dot={{ fill: '#a78bfa', r: 4 }} strokeWidth={2} />
          </LineChart>
        </ChartBox>
      )}

      <ChartBox title="HRV (ms)" color="#3b82f6">
        <LineChart data={hrvData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
          <Tooltip {...tooltipStyle} itemStyle={{ color: '#3b82f6' }} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} strokeWidth={2} />
        </LineChart>
      </ChartBox>

      <ChartBox title="Resting HR (bpm)" color="#818cf8">
        <LineChart data={rhrData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
          <Tooltip {...tooltipStyle} itemStyle={{ color: '#818cf8' }} />
          <Line type="monotone" dataKey="value" stroke="#818cf8" dot={false} strokeWidth={2} />
        </LineChart>
      </ChartBox>

      <ChartBox title="Sleep (hrs) — last 30 days" color="#f59e0b">
        <BarChart data={sleepData}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 12]} />
          <Tooltip {...tooltipStyle} itemStyle={{ color: '#f59e0b' }} />
          <ReferenceLine y={7} stroke="#1D9E75" strokeDasharray="4 2" label={{ value: '7hr target', fill: '#1D9E75', fontSize: 10 }} />
          <Bar dataKey="value" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartBox>
    </div>
  )
}

function ChartBox({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
