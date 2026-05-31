import { supabase } from '@/lib/supabase'
import TrendsCharts from '@/components/TrendsCharts'
import { DailyLog } from '@/lib/types'
import { formatSleep } from '@/lib/format'

async function getData() {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data } = await supabase
    .from('daily_log')
    .select('date, weight_kg, hrv_ms, rhr_bpm, sleep_hrs, fatigue, mood, soreness')
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  return (data as DailyLog[]) ?? []
}

export default async function TrendsPage() {
  const logs = await getData()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Trends</h1>
      <TrendsCharts logs={logs} />

      {/* Full NRS table */}
      <div>
        <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-3">NRS Log (90 days)</h2>
        <div className="bg-gray-900 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-800">
                {['Date', 'Sleep', 'HRV', 'RHR', 'Weight', 'Fatigue', 'Mood', 'Soreness'].map((h) => (
                  <th key={h} className="text-left p-3 text-gray-500 font-normal text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...logs].reverse().map((log) => (
                <tr key={log.date} className="border-b border-gray-800/50 last:border-0">
                  <td className="p-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(log.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-3 text-gray-300">{formatSleep(log.sleep_hrs)}</td>
                  <td className="p-3 text-blue-400">{log.hrv_ms ?? '—'}</td>
                  <td className="p-3 text-blue-400">{log.rhr_bpm ?? '—'}</td>
                  <td className="p-3 text-gray-300">{log.weight_kg ?? '—'}</td>
                  <td className="p-3">
                    <span className={log.fatigue && log.fatigue >= 7 ? 'text-red-400' : 'text-gray-300'}>{log.fatigue ?? '—'}</span>
                  </td>
                  <td className="p-3">
                    <span className={log.mood && log.mood >= 7 ? 'text-[#1D9E75]' : 'text-gray-300'}>{log.mood ?? '—'}</span>
                  </td>
                  <td className="p-3 text-gray-300">{log.soreness ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
