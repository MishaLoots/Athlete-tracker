'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { DailyLog } from '@/lib/types'

type Props = {
  weekLogs: DailyLog[]
}

export default function DashboardCharts({ weekLogs }: Props) {
  const data = weekLogs.map((l) => ({
    date: new Date(l.date).toLocaleDateString('en-ZA', { weekday: 'short' }),
    protein: l.protein_g ?? 0,
  }))

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Protein This Week (g)</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
            itemStyle={{ color: '#1D9E75' }}
          />
          <ReferenceLine y={200} stroke="#f59e0b" strokeDasharray="4 2" />
          <Bar dataKey="protein" fill="#1D9E75" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
