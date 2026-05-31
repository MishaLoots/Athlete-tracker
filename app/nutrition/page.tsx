import { supabase } from '@/lib/supabase'
import NutritionCharts from '@/components/NutritionCharts'
import MetricCard from '@/components/MetricCard'
import { DailyLog } from '@/lib/types'

async function getData() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data } = await supabase
    .from('daily_log')
    .select('date, protein_g, carbs_g, fat_g, calories_kcal, sugar_notes')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  return (data as DailyLog[]) ?? []
}

export default async function NutritionPage() {
  const logs = await getData()

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekLogs = logs.filter((l) => new Date(l.date) >= weekAgo)
  const last7 = logs.slice(0, 7)

  const avgProtein7d = last7.length
    ? Math.round(last7.reduce((s, l) => s + (l.protein_g ?? 0), 0) / last7.length)
    : null
  const avgCalories7d = last7.length
    ? Math.round(last7.reduce((s, l) => s + (l.calories_kcal ?? 0), 0) / last7.length)
    : null

  const sugarFlags = weekLogs.filter((l) => l.sugar_notes && l.sugar_notes.trim() !== '')
  const cleanDays = weekLogs.filter((l) => !l.sugar_notes || l.sugar_notes.trim() === '').length

  // Protein compliance last 30 days
  const logged = logs.filter((l) => l.protein_g !== null)
  const proteinCompliance = logged.length
    ? Math.round((logged.filter((l) => (l.protein_g ?? 0) >= 200).length / logged.length) * 100)
    : null

  // Sugar audit — all time from loaded range
  const allSugarFlags = logs.filter((l) => l.sugar_notes && l.sugar_notes.trim() !== '')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Nutrition</h1>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard label="Avg Protein 7d" value={avgProtein7d} unit="g" color={avgProtein7d && avgProtein7d >= 200 ? 'green' : 'amber'} />
        <MetricCard label="Avg Calories 7d" value={avgCalories7d} unit="kcal" />
        <MetricCard label="Sugar Flags" value={sugarFlags.length} color={sugarFlags.length > 0 ? 'red' : 'green'} />
        <MetricCard label="Clean Days" value={cleanDays} color="green" />
      </div>

      {proteinCompliance !== null && (
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Protein Compliance (30d)</p>
            <p className="text-[#1D9E75] font-semibold">{proteinCompliance}%</p>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${proteinCompliance}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">Days hitting 200g target out of {logged.length} logged days</p>
        </div>
      )}

      <NutritionCharts logs={last7.reverse()} />

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
