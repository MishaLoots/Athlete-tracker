'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts'
import { DailyLog } from '@/lib/types'

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

  return (
    <div className="space-y-4">
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
