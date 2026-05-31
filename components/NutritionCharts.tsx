'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { DailyLog } from '@/lib/types'

export default function NutritionCharts({ logs }: { logs: DailyLog[] }) {
  const data = logs.map((l) => ({
    date: new Date(l.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' }),
    protein: l.protein_g ?? 0,
    carbs: l.carbs_g ?? 0,
    fat: l.fat_g ?? 0,
  }))

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Macros (7 days)</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          <ReferenceLine y={200} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '200g', fill: '#f59e0b', fontSize: 10 }} />
          <Bar dataKey="protein" stackId="a" fill="#1D9E75" name="Protein" />
          <Bar dataKey="carbs" stackId="a" fill="#3b82f6" name="Carbs" />
          <Bar dataKey="fat" stackId="a" fill="#f59e0b" name="Fat" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
