<script lang="ts">
  import { getProfileGroupStyle } from '../profile_theme'
  import { formatPercent } from '../profile_view_helpers'
  import type { SpiderChartPoint } from '../types.svelte'

  interface Props {
    categoryCode: 'technical' | 'soft_skill' | 'delivery'
    points: SpiderChartPoint[]
  }

  const { categoryCode, points }: Props = $props()

  const style = $derived(getProfileGroupStyle(categoryCode))
  const normalizedPoints = $derived(
    points.map((point) => {
      const raw = point as unknown as Record<string, unknown>

      return {
        ...point,
        avg_percentage: Number(raw.avg_percentage ?? raw.avgPercentage ?? 0),
        total_reviews: Number(raw.total_reviews ?? raw.totalReviews ?? 0),
      }
    })
  )
  const sortedPoints = $derived(
    [...normalizedPoints].sort(
      (a, b) =>
        (b.total_reviews - a.total_reviews) || (b.avg_percentage - a.avg_percentage)
    )
  )
  const chartPoints = $derived(sortedPoints.slice(0, 6))
  const averageScore = $derived.by(() => {
    if (chartPoints.length === 0) return null
    return chartPoints.reduce((sum, point) => sum + point.avg_percentage, 0) / chartPoints.length
  })
  const totalReviews = $derived(
    chartPoints.reduce((sum, point) => sum + point.total_reviews, 0)
  )
  const strongestSkill = $derived(chartPoints[0] ?? null)
  const axisPoints = $derived.by(() => {
    if (chartPoints.length === 0) return []

    if (chartPoints.length >= 3) return chartPoints

    const fillerCount = 3 - chartPoints.length
    const avg = averageScore ?? 0

    return [
      ...chartPoints,
      ...Array.from({ length: fillerCount }, (_, index) => ({
        skill_id: `filler-${categoryCode}-${index}`,
        skill_name: '',
        skill_code: `filler-${index}`,
        category_code: categoryCode,
        avg_percentage: avg,
        level_code: null,
        total_reviews: 0,
      })),
    ]
  })

  const size = 280
  const center = size / 2
  const radius = 96
  const levels = [20, 40, 60, 80, 100]

  function angleFor(index: number, count: number): number {
    return (2 * Math.PI * index) / count - Math.PI / 2
  }

  function polarToCartesian(angle: number, radial: number) {
    return {
      x: center + Math.cos(angle) * radial,
      y: center + Math.sin(angle) * radial,
    }
  }

  function polygonPoints(scale: number): string {
    return axisPoints
      .map((_point, index) => {
        const position = polarToCartesian(angleFor(index, axisPoints.length), radius * scale)
        return `${position.x},${position.y}`
      })
      .join(' ')
  }

  const ringPolygons = $derived(levels.map((level) => polygonPoints(level / 100)))

  const dataPolygon = $derived(
    axisPoints
      .map((point, index) => {
        const scale = Math.max(0, Math.min(point.avg_percentage, 100)) / 100
        const position = polarToCartesian(angleFor(index, axisPoints.length), radius * scale)
        return `${position.x},${position.y}`
      })
      .join(' ')
  )
  const dataPolyline = $derived.by(() => {
    if (axisPoints.length === 0) return ''

    const pointsList = axisPoints.map((point, index) => {
      const scale = Math.max(0, Math.min(point.avg_percentage, 100)) / 100
      const position = polarToCartesian(angleFor(index, axisPoints.length), radius * scale)
      return `${position.x},${position.y}`
    })

    return [...pointsList, pointsList[0]].join(' ')
  })

  const axisLabels = $derived(
    axisPoints.map((point, index) => {
      const position = polarToCartesian(angleFor(index, axisPoints.length), radius + 26)
      return {
        x: position.x,
        y: position.y,
        label: point.skill_name.length > 14 ? `${point.skill_name.slice(0, 14)}…` : point.skill_name,
      }
    })
  )
</script>

<article class={`rounded-[26px] border p-4 shadow-[0_16px_45px_rgba(15,23,42,0.08)] ${style.borderClass} ${style.surfaceClass}`}>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p class={`text-[11px] font-bold uppercase tracking-[0.18em] ${style.textClass}`}>{style.title}</p>
      <h3 class="mt-2 text-lg font-black text-foreground">Spider chart nhóm tín hiệu chính</h3>
      <p class="mt-1 text-sm text-muted-foreground">Chart lấy top {Math.min(chartPoints.length || 0, 6)} kỹ năng theo độ tin cậy review để tránh nhiễu nhãn.</p>
    </div>

    <div class="rounded-2xl border border-background/80 bg-white/80 px-3 py-2 text-right shadow-sm dark:bg-black/10">
      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Average</p>
      <p class={`mt-1 text-2xl font-black ${style.textClass}`}>{formatPercent(averageScore, 1)}</p>
    </div>
  </div>

  {#if chartPoints.length === 0}
    <div class="mt-4 rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-12 text-center text-sm font-medium text-muted-foreground">
      Chưa có dữ liệu reviewed cho nhóm này.
    </div>
  {:else}
    <div class="mt-4 space-y-4">
      <div class="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-black/10">
        <svg viewBox={`0 0 ${size} ${size}`} class="mx-auto h-auto w-full max-w-[18rem] overflow-visible">
          {#each ringPolygons as ring}
            <polygon points={ring} fill="none" stroke="currentColor" stroke-width="1" class="text-border/70" />
          {/each}

          {#each axisPoints as _point, index}
            {@const axisEnd = polarToCartesian(angleFor(index, axisPoints.length), radius)}
            <line
              x1={center}
              y1={center}
              x2={axisEnd.x}
              y2={axisEnd.y}
              stroke="currentColor"
              stroke-width="1"
              class="text-border/70"
            />
          {/each}

          <polygon points={dataPolygon} fill={style.fillColor} stroke="none" />
          <polyline
            points={dataPolyline}
            fill="none"
            stroke={style.strokeColor}
            stroke-width="3"
            stroke-linejoin="round"
            stroke-linecap="round"
          />

          {#each axisPoints as point, index}
            {@const dot = polarToCartesian(angleFor(index, axisPoints.length), radius * (Math.max(0, Math.min(point.avg_percentage, 100)) / 100))}
            <circle cx={dot.x} cy={dot.y} r="4" fill={style.strokeColor} />
          {/each}

          {#each axisLabels as label}
            {#if label.label}
              <text
                x={label.x}
                y={label.y}
                text-anchor={label.x < center - 8 ? 'end' : label.x > center + 8 ? 'start' : 'middle'}
                dominant-baseline={label.y > center + 8 ? 'hanging' : label.y < center - 8 ? 'auto' : 'middle'}
                class="fill-muted-foreground text-[10px] font-semibold"
              >
                {label.label}
              </text>
            {/if}
          {/each}
        </svg>

        <div class="mt-4 grid gap-2 sm:grid-cols-3">
          <div class="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Reviewed points</p>
            <p class="mt-1 text-lg font-black text-foreground">{chartPoints.length}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Review volume</p>
            <p class="mt-1 text-lg font-black text-foreground">{totalReviews}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Strongest</p>
            <p class="mt-1 truncate text-lg font-black text-foreground">{strongestSkill.skill_name}</p>
          </div>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        {#each chartPoints as point (point.skill_id)}
          <div class="rounded-2xl border border-border/60 bg-white/78 px-3 py-3 shadow-sm dark:bg-black/10">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-foreground">{point.skill_name}</p>
                <p class="mt-1 text-[11px] font-semibold text-muted-foreground">{point.total_reviews} review{point.total_reviews === 1 ? '' : 's'}</p>
              </div>
              <span class={`rounded-full px-2.5 py-1 text-xs font-black ${style.badgeClass}`}>
                {formatPercent(point.avg_percentage, 0)}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</article>
