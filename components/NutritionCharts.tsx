'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { DailyLog, Goals } from '@/lib/types'

const tooltipStyle = {
  contentStyle: { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 },
  labelStyle: { color: '#9ca3af' },
}

type Props = {
  logs: DailyLog[]
  goals?: Goals | null
}

export default function NutritionCharts({ logs, goals }: Props) {
  const macroData = logs.map((l) => ({
    date: new Date(l.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' }),
    protein: l.protein_g ?? 0,
    carbs: l.carbs_g ?? 0,
    fat: l.fat_g ?? 0,
  }))

  const calData = logs.map((l) => ({
    date: new Date(l.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' }),
    calories: l.calories_kcal ?? 0,
  }))

  // Use rest-day calorie target as the reference line (most conservative)
  const calTarget = goals?.cal_rest ?? 2000

  return (
    <div className="space-y-4">
      {/* Macros — grams only, no reference line */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Macros (g) — 7 days</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={macroData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Bar dataKey="protein" stackId="a" fill="#1D9E75" name="Protein" />
            <Bar dataKey="carbs" stackId="a" fill="#3b82f6" name="Carbs" />
            <Bar dataKey="fat" stackId="a" fill="#f59e0b" name="Fat" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Calories — separate chart with target line */}
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Calories — 7 days</p>
          <p className="text-xs text-gray-600">dotted = rest day target ({calTarget} kcal)</p>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={calData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} itemStyle={{ color: '#818cf8' }} />
            <ReferenceLine y={calTarget} stroke="#f59e0b" strokeDasharray="4 2" />
            <Bar dataKey="calories" fill="#818cf8" radius={[3, 3, 0, 0]} name="kcal" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
