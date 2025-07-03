<script lang="ts">
  type IBCSRole = 'actual' | 'plan' | 'highlight' | 'risk' | 'positive' | 'neutral'

  interface Segment {
    label: string
    value: number
    role?: IBCSRole
  }

  interface Props {
    title: string
    subtitle?: string
    segments: Segment[]
  }

  const { title, subtitle = '', segments }: Props = $props()

  const total = $derived(Math.max(1, segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)))

  function widthPercent(value: number): number {
    return (Math.max(0, value) / total) * 100
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

  <div class="h-6 w-full overflow-hidden rounded bg-slate-100">
    <div class="flex h-full w-full">
      {#each segments as segment}
        <div
          style={`width:${widthPercent(segment.value)}%;background:${fillForRole(segment.role)}`}
          title={`${segment.label}: ${segment.value}`}
        ></div>
      {/each}
    </div>
  </div>

  <div class="mt-3 space-y-1">
    {#each segments as segment}
      <div class="flex items-center justify-between text-xs text-slate-600">
        <div class="flex items-center gap-2">
            <span class="inline-block h-2.5 w-2.5 rounded-sm" style={`background:${fillForRole(segment.role)}`}></span>
          <span>{segment.label}</span>
        </div>
        <span>{segment.value} ({Math.round(widthPercent(segment.value))}%)</span>
      </div>
    {/each}
  </div>
</div>
