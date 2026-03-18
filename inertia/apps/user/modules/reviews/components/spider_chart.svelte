<script lang="ts">
  /**
   * SpiderChart — SVG radar chart for skill visualization.
   * Uses the shared brand palette:
   * technology = teal, engineering = violet, soft_skill = blue, delivery = orange.
   */

  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { SpiderChartProps as Props, SpiderChartPoint } from './spider_chart.types'
  import {
    formatPercentage,
    getAngle,
    getPointColor,
    getSeriesColors,
    polarToCartesian,
    withSyntheticAxes,
  } from './spider_chart.utils'

  const {
    softSkills = [],
    delivery = [],
    size = 300,
    softSkillsLabel = 'Soft skills',
    deliveryLabel = 'Delivery',
    class: className = '',
  }: Props = $props()
  const { t } = useTranslation()

  // Combine all data points for the chart axes
  const allPoints = $derived([...softSkills, ...delivery])

  const axes = $derived(withSyntheticAxes(allPoints))
  const count = $derived(axes.length)

  // Chart geometry
  const center = $derived(size / 2)
  const radius = $derived(size / 2 - 40) // leave room for labels
  const levels = 5 // concentric rings at 20%, 40%, 60%, 80%, 100%

  let hoveredIndex = $state<number | null>(null)

  // Grid ring paths (concentric pentagons/polygons)
  const gridRings = $derived(
    Array.from({ length: levels }, (_ring, i) => {
      const ringRadius = (radius * (i + 1)) / levels
      const points = Array.from({ length: count }, (_axis, j) => {
        const pos = polarToCartesian(getAngle(j, count), ringRadius, center)
        return `${pos.x},${pos.y}`
      })
      return points.join(' ')
    })
  )

  // Axis lines
  const axisLines = $derived(
    Array.from({ length: count }, (_, i) => {
      const pos = polarToCartesian(getAngle(i, count), radius, center)
      return { x1: center, y1: center, x2: pos.x, y2: pos.y }
    })
  )

  // Label positions (slightly outside the chart)
  const labelPositions = $derived(
    axes.map((point, i) => {
      const pos = polarToCartesian(getAngle(i, count), radius + 18, center)
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
      const pos = polarToCartesian(getAngle(i, count), r, center)
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
      const pos = polarToCartesian(getAngle(i, count), r, center)
	      return { ...pos, ...pt, index: i }
      })
  )
  const hoveredDot = $derived(hoveredIndex === null ? null : (dataDots[hoveredIndex] ?? null))
</script>

{#if count === 0}
  <div class="flex items-center justify-center text-muted-foreground text-sm py-8 {className}">
    {t('task.reviews.spider.empty', {}, 'No skill data available for chart display')}
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

      <!-- Category polygon -->
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
          stroke="currentColor"
          stroke-width="1.5"
          class="cursor-pointer text-background transition-all"
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
        {@const pos = polarToCartesian(getAngle(0, count), (radius * (i + 1)) / levels, center)}
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
    {#if hoveredDot}
      <div
        class="absolute z-50 bg-popover text-popover-foreground text-xs rounded-md border shadow-md px-3 py-2 pointer-events-none"
        style="left: {hoveredDot.x}px; top: {hoveredDot.y - 40}px; transform: translateX(-50%)"
      >
        <div class="font-medium">{hoveredDot.skill_name}</div>
        <div class="text-muted-foreground">
          {formatPercentage(hoveredDot.avg_percentage)} · {t('task.reviews.spider.review_count', { count: hoveredDot.total_reviews }, ':count reviews')}
        </div>
        {#if hoveredDot.verified_public_proficiency_code}
          <div class="text-muted-foreground capitalize">
            {t('ui_misc.reviews.spider_chart.level', {}, 'Level')}:
            {hoveredDot.verified_public_proficiency_code}
          </div>
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
          {t('task.reviews.spider.soft_skills', {}, softSkillsLabel)}
        </div>
      {/if}
      {#if delivery.length > 0}
        <div class="flex items-center gap-1.5">
          <span
            class="inline-block h-3 w-3 rounded-sm"
            style="background-color: {deliveryColors.stroke}"
          ></span>
          {t('task.reviews.spider.delivery', {}, deliveryLabel)}
        </div>
      {/if}
    </div>
  </div>
{/if}
