<script lang="ts">
  /**
   * SpiderChart — SVG radar chart for skill visualization.
   * Uses the shared brand palette:
   * technical = magenta, soft_skill = blue, delivery = orange.
   */

  interface SpiderChartPoint {
    skill_id: string
    skill_name: string
    skill_code: string
    category_code: string
    avg_percentage: number
    level_code: string | null
    total_reviews: number
  }

  interface ChartAxis extends SpiderChartPoint {
    axis_id: string
    isSynthetic?: boolean
  }

  interface Props {
    softSkills?: SpiderChartPoint[]
    delivery?: SpiderChartPoint[]
    size?: number
    softSkillsLabel?: string
    deliveryLabel?: string
    class?: string
  }

  const {
    softSkills = [],
    delivery = [],
    size = 300,
    softSkillsLabel = 'Kỹ năng mềm',
    deliveryLabel = 'Kỹ năng thực thi',
    class: className = '',
  }: Props = $props()

  // Combine all data points for the chart axes
  const allPoints = $derived([...softSkills, ...delivery])

  function withSyntheticAxes(points: SpiderChartPoint[]): ChartAxis[] {
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

  const axes = $derived(withSyntheticAxes(allPoints))
  const count = $derived(axes.length)

  // Chart geometry
  const center = $derived(size / 2)
  const radius = $derived(size / 2 - 40) // leave room for labels
  const levels = 5 // concentric rings at 20%, 40%, 60%, 80%, 100%

  let hoveredIndex = $state<number | null>(null)

  function polarToCartesian(angle: number, r: number): { x: number; y: number } {
    // Start from top (−π/2), go clockwise
    const a = angle - Math.PI / 2
    return {
      x: center + r * Math.cos(a),
      y: center + r * Math.sin(a),
    }
  }

  function getAngle(index: number): number {
    if (count === 0) return 0
    return (2 * Math.PI * index) / count
  }

  // Grid ring paths (concentric pentagons/polygons)
  const gridRings = $derived(
    Array.from({ length: levels }, (_, i) => {
      const ringRadius = (radius * (i + 1)) / levels
      const points = Array.from({ length: count }, (_, j) => {
        const pos = polarToCartesian(getAngle(j), ringRadius)
        return `${pos.x},${pos.y}`
      })
      return points.join(' ')
    })
  )

  // Axis lines
  const axisLines = $derived(
    Array.from({ length: count }, (_, i) => {
      const pos = polarToCartesian(getAngle(i), radius)
      return { x1: center, y1: center, x2: pos.x, y2: pos.y }
    })
  )

  // Label positions (slightly outside the chart)
  const labelPositions = $derived(
    axes.map((point, i) => {
      const pos = polarToCartesian(getAngle(i), radius + 18)
      return {
        ...pos,
        name: point.skill_name,
        percentage: point.avg_percentage,
        isSynthetic: Boolean(point.isSynthetic),
      }
    })
  )

  // Data polygon for a set of points, mapped onto the allPoints axes
  function getDataPolygon(data: SpiderChartPoint[]): string {
    if (count === 0) return ''
    const dataMap = new Map(data.map((d) => [d.skill_id, d.avg_percentage]))
    const avg = data.reduce((sum, point) => sum + point.avg_percentage, 0) / Math.max(data.length, 1)
    const points = axes.map((pt, i) => {
      const pct = dataMap.get(pt.axis_id) ?? (pt.isSynthetic ? avg : 0)
      const r = (pct / 100) * radius
      const pos = polarToCartesian(getAngle(i), r)
      return `${pos.x},${pos.y}`
    })
    return points.join(' ')
  }

  const softSkillsPolygon = $derived(getDataPolygon(softSkills))
  const deliveryPolygon = $derived(getDataPolygon(delivery))
  const softSkillsColors = $derived(getSeriesColors(softSkills))
  const deliveryColors = $derived(getSeriesColors(delivery))

  // Data dots for hover
  const dataDots = $derived(
    axes
      .filter((point) => !point.isSynthetic)
      .map((pt, i) => {
      const r = (pt.avg_percentage / 100) * radius
      const pos = polarToCartesian(getAngle(i), r)
      return { ...pos, ...pt, index: i }
      })
  )

  function getSeriesColors(points: SpiderChartPoint[]) {
    const categoryCode = points[0]?.category_code

    if (categoryCode === 'technical') {
      return {
        fill: 'rgba(192, 38, 211, 0.18)',
        stroke: 'rgb(192, 38, 211)',
      }
    }

    if (categoryCode === 'delivery') {
      return {
        fill: 'rgba(244, 93, 45, 0.18)',
        stroke: 'rgb(244, 93, 45)',
      }
    }

    return {
      fill: 'rgba(37, 99, 235, 0.18)',
      stroke: 'rgb(37, 99, 235)',
    }
  }

  function getPointColor(categoryCode: string): string {
    if (categoryCode === 'technical') return 'rgb(192, 38, 211)'
    if (categoryCode === 'delivery') return 'rgb(244, 93, 45)'
    return 'rgb(37, 99, 235)'
  }

  function formatPercentage(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '0.0%'
    }
    return `${value.toFixed(1)}%`
  }
</script>

{#if count === 0}
  <div class="flex items-center justify-center text-muted-foreground text-sm py-8 {className}">
    Chưa có dữ liệu kỹ năng để hiển thị biểu đồ
  </div>
{:else}
  <div class="relative inline-block {className}">
    <svg
      viewBox="0 0 {size} {size}"
      width={size}
      height={size}
      class="max-w-full h-auto"
    >
      <!-- Grid rings -->
      {#each gridRings as ring, i}
        <polygon
          points={ring}
          fill="none"
          stroke="currentColor"
          stroke-width="0.5"
          class="text-border"
          opacity={0.3 + (i * 0.15)}
        />
      {/each}

      <!-- Axis lines -->
      {#each axisLines as axis}
        <line
          x1={axis.x1}
          y1={axis.y1}
          x2={axis.x2}
          y2={axis.y2}
          stroke="currentColor"
          stroke-width="0.5"
          class="text-border"
          opacity="0.4"
        />
      {/each}

      <!-- Soft skills polygon -->
      {#if softSkills.length > 0}
        <polygon
          points={softSkillsPolygon}
          fill={softSkillsColors.fill}
          stroke={softSkillsColors.stroke}
          stroke-width="2"
        />
      {/if}

      <!-- Delivery polygon -->
      {#if delivery.length > 0}
        <polygon
          points={deliveryPolygon}
          fill={deliveryColors.fill}
          stroke={deliveryColors.stroke}
          stroke-width="2"
        />
      {/if}

      <!-- Data dots -->
      {#each dataDots as dot, i}
        <circle
          cx={dot.x}
          cy={dot.y}
          r={hoveredIndex === i ? 5 : 3.5}
          fill={getPointColor(dot.category_code)}
          stroke="white"
          stroke-width="1.5"
          class="cursor-pointer transition-all"
          role="img"
          aria-label="{dot.skill_name}: {dot.avg_percentage}%"
          onmouseenter={() => { hoveredIndex = i }}
          onmouseleave={() => { hoveredIndex = null }}
        />
      {/each}

      <!-- Labels -->
      {#each labelPositions as label}
        {#if !label.isSynthetic && label.name}
          <text
            x={label.x}
            y={label.y}
            text-anchor={
              label.x < center - 10 ? 'end' : label.x > center + 10 ? 'start' : 'middle'
            }
            dominant-baseline={
              label.y < center - 10 ? 'auto' : label.y > center + 10 ? 'hanging' : 'middle'
            }
            class="fill-muted-foreground text-[11px]"
          >
            {label.name}
          </text>
        {/if}
      {/each}

      <!-- Level percentages on first axis -->
      {#each Array.from({ length: levels }, (_, i) => (i + 1) * 20) as pct, i}
        {@const pos = polarToCartesian(getAngle(0), (radius * (i + 1)) / levels)}
        <text
          x={pos.x + 4}
          y={pos.y - 4}
          class="fill-muted-foreground text-[8px]"
          text-anchor="start"
        >
          {pct}%
        </text>
      {/each}
    </svg>

    <!-- Hover tooltip -->
    {#if hoveredIndex !== null}
      {@const dot = dataDots[hoveredIndex]}
      <div
        class="absolute z-50 bg-popover text-popover-foreground text-xs rounded-md border shadow-md px-3 py-2 pointer-events-none"
        style="left: {dot.x}px; top: {dot.y - 40}px; transform: translateX(-50%)"
      >
        <div class="font-medium">{dot.skill_name}</div>
        <div class="text-muted-foreground">
          {formatPercentage(dot.avg_percentage)} · {dot.total_reviews} đánh giá
        </div>
        {#if dot.level_code}
          <div class="text-muted-foreground capitalize">Level: {dot.level_code}</div>
        {/if}
      </div>
    {/if}

    <!-- Legend -->
    <div class="flex items-center gap-4 justify-center mt-2 text-xs text-muted-foreground">
      {#if softSkills.length > 0}
        <div class="flex items-center gap-1.5">
          <span
            class="inline-block h-3 w-3 rounded-sm"
            style="background-color: {softSkillsColors.stroke}"
          ></span>
          {softSkillsLabel}
        </div>
      {/if}
      {#if delivery.length > 0}
        <div class="flex items-center gap-1.5">
          <span
            class="inline-block h-3 w-3 rounded-sm"
            style="background-color: {deliveryColors.stroke}"
          ></span>
          {deliveryLabel}
        </div>
      {/if}
    </div>
  </div>
{/if}
