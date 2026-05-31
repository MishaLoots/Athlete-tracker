import { supabase } from '@/lib/supabase'
import MetricCard from '@/components/MetricCard'
import DashboardCharts from '@/components/DashboardCharts'
import { DailyLog, Race, Goals } from '@/lib/types'

async function getData() {
  const today = new Date().toISOString().split('T')[0]

  const [logsRes, racesRes, goalsRes] = await Promise.all([
    supabase
      .from('daily_log')
      .select('*')
      .order('date', { ascending: false })
      .limit(30),
    supabase
      .from('races')
      .select('*')
      .eq('completed', false)
      .order('date', { ascending: true })
      .limit(1),
    supabase
      .from('goals')
      .select('*')
      .limit(1),
  ])

  return {
    todayLog: (logsRes.data as DailyLog[])?.find((l) => l.date === today) ?? null,
    recentLogs: (logsRes.data as DailyLog[]) ?? [],
    nextRace: (racesRes.data as Race[])?.[0] ?? null,
    goals: (goalsRes.data as Goals[])?.[0] ?? null,
  }
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default async function Dashboard() {
  const { todayLog, recentLogs, nextRace, goals } = await getData()

  // Weight progress
  const weightStart = goals?.weight_start ?? 100
  const weightTarget = goals?.weight_target ?? 95
  const currentWeight = todayLog?.weight_kg ?? recentLogs.find((l) => l.weight_kg)?.weight_kg
  const weightProgress = currentWeight
    ? Math.min(100, Math.max(0, ((weightStart - currentWeight) / (weightStart - weightTarget)) * 100))
    : 0

  // Sugar flags this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeekLogs = recentLogs.filter((l) => new Date(l.date) >= weekAgo)
  const sugarFlags = thisWeekLogs.filter((l) => l.sugar_notes && l.sugar_notes.trim() !== '').length
  const last7Protein = thisWeekLogs.slice(0, 7).reverse()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      </div>

      {/* Today metrics */}
      <div>
        <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Today</h2>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          <MetricCard label="Weight" value={todayLog?.weight_kg ?? currentWeight} unit="kg" />
          <MetricCard label="HRV" value={todayLog?.hrv_ms} unit="ms" color="blue" />
          <MetricCard label="RHR" value={todayLog?.rhr_bpm} unit="bpm" color="blue" />
          <MetricCard label="Sleep" value={todayLog?.sleep_hrs} unit="hrs" />
          <MetricCard label="Protein" value={todayLog?.protein_g} unit="g" color={todayLog?.protein_g && todayLog.protein_g >= 200 ? 'green' : 'amber'} />
          <MetricCard label="Calories" value={todayLog?.calories_kcal} unit="kcal" />
        </div>
      </div>

      {/* Race countdown */}
      {nextRace && (
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Next Race</p>
              <p className="font-semibold text-[#1D9E75]">{nextRace.name}</p>
              <p className="text-sm text-gray-400">{nextRace.distance_km}km · {nextRace.elevation_m}m elevation</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[#1D9E75]">{daysUntil(nextRace.date)}</p>
              <p className="text-xs text-gray-500">days away</p>
            </div>
          </div>
        </div>
      )}

      {/* Weight progress */}
      {currentWeight && (
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Weight Goal</p>
            <p className="text-sm text-gray-400">{currentWeight}kg → {weightTarget}kg</p>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1D9E75] rounded-full transition-all"
              style={{ width: `${weightProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{weightProgress.toFixed(0)}% of goal ({(currentWeight - weightTarget).toFixed(1)}kg to go)</p>
        </div>
      )}

      {/* Charts */}
      <DashboardCharts weekLogs={last7Protein} />

      {/* Sugar flags */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sugar Flags This Week</p>
        <p className={`text-2xl font-bold ${sugarFlags > 0 ? 'text-red-400' : 'text-[#1D9E75]'}`}>{sugarFlags}</p>
      </div>

      {/* Recent NRS */}
      <div>
        <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Recent NRS</h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-3 text-gray-500 font-normal">Date</th>
                <th className="text-center p-3 text-gray-500 font-normal">Sleep</th>
                <th className="text-center p-3 text-gray-500 font-normal">HRV</th>
                <th className="text-center p-3 text-gray-500 font-normal">Fatigue</th>
                <th className="text-center p-3 text-gray-500 font-normal">Mood</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.slice(0, 5).map((log) => (
                <tr key={log.id} className="border-b border-gray-800/50 last:border-0">
                  <td className="p-3 text-gray-300">{new Date(log.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-3 text-center text-gray-300">{log.sleep_hrs ?? '—'}</td>
                  <td className="p-3 text-center text-blue-400">{log.hrv_ms ?? '—'}</td>
                  <td className="p-3 text-center">
                    <span className={log.fatigue && log.fatigue >= 7 ? 'text-red-400' : 'text-gray-300'}>
                      {log.fatigue ?? '—'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={log.mood && log.mood >= 7 ? 'text-[#1D9E75]' : 'text-gray-300'}>
                      {log.mood ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-600">No data yet — start logging!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
