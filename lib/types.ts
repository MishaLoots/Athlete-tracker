export type DailyLog = {
  id: string
  date: string
  sleep_hrs: number | null
  hrv_ms: number | null
  rhr_bpm: number | null
  weight_kg: number | null
  fatigue: number | null
  mood: number | null
  soreness: number | null
  nrs_notes: string | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  calories_kcal: number | null
  sugar_notes: string | null
  activity_type: string | null
  duration_min: number | null
  tss: number | null
  distance_km: number | null
  training_notes: string | null
}

export type Goals = {
  id: string
  annual_km_offset: number
  weight_start: number
  weight_target: number
  ftp_watts: number
  cal_rest: number
  cal_easy: number
  cal_hard: number
  cal_race: number
  carbs_rest: number
  carbs_easy: number
  carbs_hard: number
  carbs_race: number
  fat_target: number
  protein_target: number
}

export type Race = {
  id: string
  name: string
  date: string
  distance_km: number
  elevation_m: number
  completed: boolean
}
