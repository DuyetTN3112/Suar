<script lang="ts">
  type IBCSRole = 'actual' | 'plan' | 'highlight' | 'risk' | 'positive' | 'neutral'

  interface Point {
    label: string
    value: number
    role?: IBCSRole
  }

  interface Props {
    title: string
    subtitle?: string
    unit?: string
    data: Point[]
    height?: number
  }

  const { title, subtitle = '', unit = '', data, height = 220 }: Props = $props()

  const chartPadding = { top: 16, right: 12, bottom: 42, left: 40 }
  const chartWidth = 520
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right
  const innerHeight = $derived(height - chartPadding.top - chartPadding.bottom)

  const maxValue = $derived(Math.max(1, ...data.map((item) => item.value)))
  const columns = $derived(
    data.map((item, index) => {
      const barCount = data.length
      const slotWidth = innerWidth / Math.max(1, barCount)
      const barWidth = Math.min(42, slotWidth * 0.56)
      const x = chartPadding.left + index * slotWidth + (slotWidth - barWidth) / 2
      const barHeight = (Math.max(0, item.value) / maxValue) * innerHeight
      const y = chartPadding.top + (innerHeight - barHeight)

      return {
        ...item,
        x,
        y,
        barWidth,
        barHeight,
      }
    })
  )

  const ticks = $derived([0, 0.25, 0.5, 0.75, 1].map((factor) => Math.round(maxValue * factor)))

  function yForValue(value: number): number {
    const normalized = maxValue === 0 ? 0 : value / maxValue
    return chartPadding.top + (innerHeight - normalized * innerHeight)
  }

  function fillForRole(role: IBCSRole = 'neutral'): string {
    if (role === 'actual') return '#334155'
    if (role === 'plan') return '#94A3B8'
    if (role === 'highlight') return '#2563EB'
    if (role === 'risk') return '#DC2626'
    if (role === 'positive') return '#16A34A'
    return '#64748B'
  }
</script>

<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
  <div class="mb-3">
    <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
    {#if subtitle}
      <p class="text-xs text-slate-500">{subtitle}</p>
    {/if}
  </div>

  <svg viewBox={`0 0 ${chartWidth} ${height}`} class="w-full" role="img" aria-label={title}>
    {#each ticks as tick}
      <line
        x1={chartPadding.left}
        y1={yForValue(tick)}
        x2={chartWidth - chartPadding.right}
        y2={yForValue(tick)}
        stroke="#E2E8F0"
        stroke-width="1"
      />
      <text x={chartPadding.left - 6} y={yForValue(tick) + 4} text-anchor="end" font-size="11" fill="#64748B">
        {tick}{unit}
      </text>
    {/each}

    {#each columns as col}
      <rect
        x={col.x}
        y={col.y}
        width={col.barWidth}
        height={Math.max(0, col.barHeight)}
        rx="4"
        fill={fillForRole(col.role)}
      />
      <text
        x={col.x + col.barWidth / 2}
        y={col.y - 6}
        text-anchor="middle"
        font-size="11"
        fill="#0F172A"
      >
        {col.value}{unit}
      </text>
      <text
        x={col.x + col.barWidth / 2}
        y={height - 18}
        text-anchor="middle"
        font-size="11"
        fill="#475569"
      >
        {col.label}
      </text>
    {/each}

    <line
      x1={chartPadding.left}
      y1={chartPadding.top + innerHeight}
      x2={chartWidth - chartPadding.right}
      y2={chartPadding.top + innerHeight}
      stroke="#94A3B8"
      stroke-width="1.2"
    />
  </svg>
</div>
