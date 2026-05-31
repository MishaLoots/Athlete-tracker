export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import TrainingCharts from '@/components/TrainingCharts'
import { DailyLog } from '@/lib/types'

async function getData() {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data } = await supabase
    .from('daily_log')
    .select('date, activity_type, duration_min, tss, distance_km, training_notes')
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  return (data as DailyLog[]) ?? []
}

export default async function TrainingPage() {
  const logs = await getData()
  const activeLogs = logs.filter((l) => l.activity_type && l.activity_type !== 'rest')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Training</h1>

      <TrainingCharts logs={[...logs].reverse()} />

      {/* Recent training log */}
      <div>
        <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Recent Sessions</h2>
        <div className="bg-gray-900 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-800">
                {['Date', 'Type', 'Duration', 'Distance', 'TSS', 'Notes'].map((h) => (
                  <th key={h} className="text-left p-3 text-gray-500 font-normal text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeLogs.slice(0, 20).map((log) => (
                <tr key={log.date} className="border-b border-gray-800/50 last:border-0">
                  <td className="p-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(log.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300">
                      {log.activity_type}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300">{log.duration_min ? `${log.duration_min}m` : '—'}</td>
                  <td className="p-3 text-gray-300">{log.distance_km ? `${log.distance_km}km` : '—'}</td>
                  <td className="p-3 text-blue-400">{log.tss ?? '—'}</td>
                  <td className="p-3 text-gray-500 text-xs max-w-[160px] truncate">{log.training_notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
