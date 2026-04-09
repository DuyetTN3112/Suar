export interface SpiderChartPoint {
  skill_id: string
  skill_name: string
  skill_code: string
  category_code: string
  avg_percentage: number
  level_code: string | null
  total_reviews: number
}

export interface ChartAxis extends SpiderChartPoint {
  axis_id: string
  isSynthetic?: boolean
}

export interface SpiderChartProps {
  softSkills?: SpiderChartPoint[]
  delivery?: SpiderChartPoint[]
  size?: number
  softSkillsLabel?: string
  deliveryLabel?: string
  class?: string
}
