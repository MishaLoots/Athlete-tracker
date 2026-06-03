export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import NutritionCharts from '@/components/NutritionCharts'
import { DailyLog, Goals } from '@/lib/types'
import { DAY_TYPE_TARGETS, DAY_TYPE_LABELS, DayType } from '@/lib/dayTypes'

function getTargets(dayType: string | null) {
  if (!dayType || !(dayType in DAY_TYPE_TARGETS)) return DAY_TYPE_TARGETS['rest']
  return DAY_TYPE_TARGETS[dayType as DayType]
}

function ProgressBar({ label, actual, target, color }: { label: string; actual: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((actual / target) * 100))
  const over = actual > target
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={over ? 'text-amber-400' : 'text-gray-300'}>
          {actual}<span className="text-gray-600"> / {target}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${over ? 'bg-amber-400' : color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-600">{pct}% of target</p>
    </div>
  )
}

async function getData() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [logsRes, goalsRes, planRes] = await Promise.all([
    supabase
      .from('daily_log')
      .select('date, protein_g, carbs_g, fat_g, calories_kcal, sugar_notes, activity_type')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false }),
    supabase.from('goals').select('*').limit(1).single(),
    supabase.from('weekly_plan').select('date, day_type, activity_type').eq('date', today).maybeSingle(),
  ])

  return {
    logs: (logsRes.data as DailyLog[]) ?? [],
    goals: goalsRes.data as Goals | null,
    today,
    todayPlan: planRes.data as { day_type: string | null; activity_type: string | null } | null,
  }
}

export default async function NutritionPage() {
  const { logs, goals, today, todayPlan } = await getData()

  const todayLog = logs.find((l) => l.date === today)
  // Priority: daily log day_type > plan day_type > default rest
  const dayType = todayLog?.day_type ?? todayPlan?.day_type ?? 'rest'
  const targets = getTargets(dayType)

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekLogs = logs.filter((l) => new Date(l.date) >= weekAgo)
  const last7 = logs.slice(0, 7)
  const weekLogsCount = weekLogs.length  // actual days logged this week, not assumed 7

  const last7WithProtein = last7.filter((l) => l.protein_g !== null)
  const last7WithCalories = last7.filter((l) => l.calories_kcal !== null)

  const avgProtein7d = last7WithProtein.length
    ? Math.round(last7WithProtein.reduce((s, l) => s + (l.protein_g ?? 0), 0) / last7WithProtein.length)
    : null
  const avgCalories7d = last7WithCalories.length
    ? Math.round(last7WithCalories.reduce((s, l) => s + (l.calories_kcal ?? 0), 0) / last7WithCalories.length)
    : null

  const sugarFlags = weekLogs.filter((l) => l.sugar_notes && l.sugar_notes.trim() !== '')
  // Clean days = logged days with no sugar flag (not "days in week with no flag")
  const cleanDays = weekLogs.filter((l) => !l.sugar_notes || l.sugar_notes.trim() === '').length

  const logged = logs.filter((l) => l.protein_g !== null)
  const proteinCompliance = logged.length
    ? Math.round((logged.filter((l) => (l.protein_g ?? 0) >= 200).length / logged.length) * 100)
    : null

  const allSugarFlags = logs.filter((l) => l.sugar_notes && l.sugar_notes.trim() !== '')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Nutrition</h1>

      {/* Today's targets */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Today's Targets</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
            {DAY_TYPE_LABELS[dayType as DayType] ?? dayType}
          </span>
        </div>
        {todayLog ? (
          <div className="space-y-4">
            <ProgressBar label="Calories" actual={todayLog.calories_kcal ?? 0} target={targets.calories} color="bg-blue-400" />
            <ProgressBar label="Protein (g)" actual={todayLog.protein_g ?? 0} target={targets.protein} color="bg-[#1D9E75]" />
            <ProgressBar label="Carbs (g)" actual={todayLog.carbs_g ?? 0} target={targets.carbs} color="bg-purple-400" />
            <ProgressBar label="Fat (g)" actual={todayLog.fat_g ?? 0} target={targets.fat} color="bg-amber-400" />
          </div>
        ) : (
          <p className="text-sm text-gray-600">No entry logged for today yet.</p>
        )}
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Protein</p>
          <p className={`text-2xl font-semibold ${avgProtein7d && avgProtein7d >= (goals?.protein_target ?? 200) ? 'text-[#1D9E75]' : 'text-amber-400'}`}>
            {avgProtein7d ?? '—'}<span className="text-sm text-gray-500 ml-1">g</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">{last7WithProtein.length} day{last7WithProtein.length !== 1 ? 's' : ''} logged</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Calories</p>
          <p className="text-2xl font-semibold text-gray-100">{avgCalories7d ?? '—'}<span className="text-sm text-gray-500 ml-1">kcal</span></p>
          <p className="text-xs text-gray-600 mt-1">{last7WithCalories.length} day{last7WithCalories.length !== 1 ? 's' : ''} logged</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sugar Flags</p>
          <p className={`text-2xl font-semibold ${sugarFlags.length > 0 ? 'text-red-400' : 'text-[#1D9E75]'}`}>{sugarFlags.length}</p>
          <p className="text-xs text-gray-600 mt-1">of {weekLogsCount} logged</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Clean Days</p>
          <p className="text-2xl font-semibold text-[#1D9E75]">{cleanDays}</p>
          <p className="text-xs text-gray-600 mt-1">of {weekLogsCount} logged</p>
        </div>
      </div>

      {/* Protein compliance */}
      {proteinCompliance !== null && (
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Protein Compliance (30d)</p>
            <p className="text-[#1D9E75] font-semibold">{proteinCompliance}%</p>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${proteinCompliance}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">Days hitting {goals?.protein_target ?? 200}g target out of {logged.length} logged days</p>
        </div>
      )}

      <NutritionCharts logs={last7.reverse()} goals={goals} />

      {/* Sugar audit */}
      <div>
        <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Sugar Audit Log</h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {allSugarFlags.length === 0 ? (
            <p className="p-4 text-gray-600 text-sm">No sugar flags — clean run! 🎉</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-3 text-gray-500 font-normal">Date</th>
                  <th className="text-left p-3 text-gray-500 font-normal">Notes</th>
                </tr>
              </thead>
              <tbody>
                {allSugarFlags.map((log) => (
                  <tr key={log.date} className="border-b border-gray-800/50 last:border-0">
                    <td className="p-3 text-gray-400 whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="p-3 text-red-300">{log.sugar_notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
