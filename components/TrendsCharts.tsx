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
  const hrvData = logs.filter((l) => l.hrv_ms).map((l) => ({ date: fmt(l.date), value: l.hrv_ms }))
  const rhrData = logs.filter((l) => l.rhr_bpm).map((l) => ({ date: fmt(l.date), value: l.rhr_bpm }))
  const last30 = logs.slice(-30)
  const sleepData = last30.map((l) => ({ date: fmt(l.date), value: l.sleep_hrs ?? 0 }))

  // Calorie deficit: target - actual (positive = under target = deficit = good for weight loss)
  const deficitData = last30
    .filter((l) => l.calories_kcal !== null && l.calories_kcal !== undefined)
    .map((l) => {
      const target = DAY_TYPE_TARGETS[(l.day_type as DayType) ?? 'rest']?.calories ?? DAY_TYPE_TARGETS.rest.calories
      const deficit = target - (l.calories_kcal ?? 0)
      return { date: fmt(l.date), deficit, target, actual: l.calories_kcal }
    })

  const avgDeficit = deficitData.length
    ? Math.round(deficitData.reduce((s, d) => s + d.deficit, 0) / deficitData.length)
    : null

  return (
    <div className="space-y-4">

      {/* Calorie deficit */}
      {deficitData.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Calorie Deficit — last 30 days</p>
            {avgDeficit !== null && (
              <span className={`text-xs font-medium ${avgDeficit >= 0 ? 'text-[#1D9E75]' : 'text-red-400'}`}>
                avg {avgDeficit >= 0 ? '-' : '+'}{Math.abs(avgDeficit)} kcal/day
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deficitData} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, name: string) => {
                  if (name === 'deficit') return [`${value > 0 ? '-' : '+'}${Math.abs(value)} kcal`, value >= 0 ? 'Deficit' : 'Surplus']
                  return [value, name]
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
          <p className="text-xs text-gray-600 mt-2">Green = under target (deficit) · Red = over target (surplus)</p>
        </div>
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
