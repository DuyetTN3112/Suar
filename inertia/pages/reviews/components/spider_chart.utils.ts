import type { ChartAxis, SpiderChartPoint } from './spider_chart.types'

export function withSyntheticAxes(points: SpiderChartPoint[]): ChartAxis[] {
  if (points.length === 0) return []

  const axes: ChartAxis[] = points.map((point) => ({
    ...point,
    axis_id: point.skill_id,
  }))

  if (axes.length >= 3) return axes

  const avg =
    points.reduce((sum, point) => sum + point.avg_percentage, 0) / Math.max(points.length, 1)
  const seed = points[0]
  const missing = 3 - axes.length

  for (let i = 0; i < missing; i++) {
    axes.push({
      skill_id: `synthetic-${i}`,
      skill_name: '',
      skill_code: `synthetic-${i}`,
      category_code: seed.category_code,
      avg_percentage: avg,
      level_code: null,
      total_reviews: 0,
      axis_id: `synthetic-${i}`,
      isSynthetic: true,
    })
  }

  return axes
}

export function getSeriesColors(points: SpiderChartPoint[]): { fill: string; stroke: string } {
  const categoryCode = points[0]?.category_code
  if (categoryCode === 'technical') {
    return { fill: 'rgba(192, 38, 211, 0.18)', stroke: 'rgb(192, 38, 211)' }
  }
  if (categoryCode === 'delivery') {
    return { fill: 'rgba(244, 93, 45, 0.18)', stroke: 'rgb(244, 93, 45)' }
  }
  return { fill: 'rgba(37, 99, 235, 0.18)', stroke: 'rgb(37, 99, 235)' }
}

export function getPointColor(categoryCode: string): string {
  if (categoryCode === 'technical') return 'rgb(192, 38, 211)'
  if (categoryCode === 'delivery') return 'rgb(244, 93, 45)'
  return 'rgb(37, 99, 235)'
}

export function formatPercentage(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '0.0%'
  }
  return `${value.toFixed(1)}%`
}

export function polarToCartesian(
  angle: number,
  r: number,
  center: number
): { x: number; y: number } {
  const adjusted = angle - Math.PI / 2
  return {
    x: center + r * Math.cos(adjusted),
    y: center + r * Math.sin(adjusted),
  }
}

export function getAngle(index: number, count: number): number {
  if (count === 0) return 0
  return (2 * Math.PI * index) / count
}
