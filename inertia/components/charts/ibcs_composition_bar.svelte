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
    if (role === 'actual') return 'var(--suar-ink-56)'
    if (role === 'plan') return '#9aa7c0'
    if (role === 'highlight') return 'var(--suar-black)'
    if (role === 'risk') return 'var(--suar-orange)'
    if (role === 'positive') return '#2fbf71'
    return 'var(--suar-ink-36)'
  }
</script>

<article class="admin-composition-panel">
  <div class="admin-composition-head">
    <div class="admin-composition-kicker">{title}</div>
    {#if subtitle}
      <p>{subtitle}</p>
    {/if}
  </div>

  <div class="admin-stack">
    {#each segments as segment}
      <div
        class="admin-stack-segment"
        style={`width: ${widthPercent(segment.value)}%; --segment-color: ${fillForRole(segment.role)}`}
        title={`${segment.label}: ${segment.value}`}
      ></div>
    {/each}
  </div>

  <div class="admin-legend">
    {#each segments as segment}
      <div class="admin-legend-row">
        <span class="admin-dot" style={`--dot-color: ${fillForRole(segment.role)}`}></span>
        <span>{segment.label}</span>
        <strong>{segment.value} · {Math.round(widthPercent(segment.value))}%</strong>
      </div>
    {/each}
  </div>
</article>

<style>
  .admin-composition-panel {
    position: relative;
    overflow: hidden;
    border: 2px solid var(--suar-black);
    border-radius: 30px;
    background:
      radial-gradient(circle at 12% 0%, rgba(255, 61, 22, .08), transparent 15rem),
      rgba(255, 253, 248, .86);
    padding: 18px;
    box-shadow: 8px 8px 0 rgba(22, 19, 15, .1);
  }

  .admin-composition-head {
    margin-bottom: 18px;
  }

  .admin-composition-kicker {
    color: color-mix(in srgb, var(--suar-orange) 80%, var(--suar-black));
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .admin-composition-head p {
    margin: 6px 0 0;
    color: var(--suar-ink-56);
    font-size: 12px;
    font-weight: 650;
  }

  .admin-stack {
    display: flex;
    height: 38px;
    overflow: hidden;
    border: 2px solid var(--suar-black);
    border-radius: 999px;
    background: rgba(22, 19, 15, .06);
    box-shadow: 4px 4px 0 rgba(22, 19, 15, .1);
  }

  .admin-stack-segment {
    height: 100%;
    min-width: 0;
    background: var(--segment-color);
    animation: admin-reveal 1s var(--ease-suar) both;
  }

  .admin-stack-segment:first-child {
    border-radius: 999px 0 0 999px;
  }

  .admin-stack-segment:last-child {
    border-radius: 0 999px 999px 0;
  }

  .admin-legend {
    display: grid;
    gap: 10px;
    margin-top: 18px;
  }

  .admin-legend-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    color: var(--suar-ink-56);
    font-size: 13px;
    font-weight: 800;
  }

  .admin-legend-row span:nth-child(2) {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .admin-legend-row strong {
    color: var(--suar-black);
    white-space: nowrap;
  }

  .admin-dot {
    width: 12px;
    height: 12px;
    border: 1.5px solid rgba(22, 19, 15, .18);
    border-radius: 999px;
    background: var(--dot-color);
  }

  @keyframes admin-reveal {
    from {
      transform: scaleX(0);
    }
  }
</style>
