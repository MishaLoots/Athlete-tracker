'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { DailyLog } from '@/lib/types'

const COLORS = ['#1D9E75', '#3b82f6', '#f59e0b', '#818cf8', '#f87171', '#34d399', '#fb923c']

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export default function TrainingCharts({ logs }: { logs: DailyLog[] }) {
  // Weekly TSS & distance — last 8 weeks
  const weekMap: Record<string, { tss: number; distance: number; label: string }> = {}
  logs.forEach((l) => {
    const key = getWeekKey(l.date)
    if (!weekMap[key]) {
      weekMap[key] = { tss: 0, distance: 0, label: new Date(key).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) }
    }
    weekMap[key].tss += l.tss ?? 0
    weekMap[key].distance += l.distance_km ?? 0
  })
  const weeklyData = Object.values(weekMap).slice(-8)

  // Activity breakdown last 30 days
  const last30 = logs.slice(-30)
  const activityMap: Record<string, number> = {}
  last30.forEach((l) => {
    if (l.activity_type) activityMap[l.activity_type] = (activityMap[l.activity_type] ?? 0) + 1
  })
  const pieData = Object.entries(activityMap).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Weekly TSS (8 weeks)</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#3b82f6' }} />
            <Bar dataKey="tss" fill="#3b82f6" radius={[3, 3, 0, 0]} name="TSS" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Weekly Distance km (8 weeks)</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#1D9E75' }} />
            <Bar dataKey="distance" fill="#1D9E75" radius={[3, 3, 0, 0]} name="km" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {pieData.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Activity Breakdown (30 days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
