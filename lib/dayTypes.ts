export const DAY_TYPES = ['rest', 'recovery', 'easy', 'moderate', 'hard', 'long', 'race'] as const
export type DayType = typeof DAY_TYPES[number]

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  rest:     'Rest',
  recovery: 'Recovery',
  easy:     'Easy',
  moderate: 'Moderate',
  hard:     'Hard',
  long:     'Long',
  race:     'Race',
}

export const DAY_TYPE_COLORS: Record<DayType, string> = {
  rest:     'text-gray-500',
  recovery: 'text-teal-400',
  easy:     'text-blue-400',
  moderate: 'text-indigo-400',
  hard:     'text-amber-400',
  long:     'text-orange-400',
  race:     'text-[#1D9E75]',
}

// Default macro targets per day type
export const DAY_TYPE_TARGETS: Record<DayType, { calories: number; protein: number; carbs: number; fat: number }> = {
  rest:     { calories: 1900, protein: 200, carbs: 120, fat: 70 },
  recovery: { calories: 2000, protein: 200, carbs: 130, fat: 75 },
  easy:     { calories: 2200, protein: 200, carbs: 150, fat: 80 },
  moderate: { calories: 2400, protein: 200, carbs: 180, fat: 80 },
  hard:     { calories: 2700, protein: 200, carbs: 230, fat: 85 },
  long:     { calories: 3000, protein: 200, carbs: 280, fat: 85 },
  race:     { calories: 3500, protein: 200, carbs: 350, fat: 90 },
}
