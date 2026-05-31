type Props = {
  label: string
  value: string | number | null | undefined
  unit?: string
  color?: 'green' | 'blue' | 'amber' | 'red' | 'default'
}

const colorMap = {
  green: 'text-[#1D9E75]',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  default: 'text-gray-100',
}

export default function MetricCard({ label, value, unit, color = 'default' }: Props) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-semibold ${colorMap[color]}`}>
          {value ?? '—'}
        </span>
        {unit && value != null && (
          <span className="text-sm text-gray-500">{unit}</span>
        )}
      </div>
    </div>
  )
}
