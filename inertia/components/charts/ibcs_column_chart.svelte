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

  const { title, subtitle = '', unit = '', data, height = 250 }: Props = $props()

  const maxValue = $derived(Math.max(1, ...data.map((item) => Math.max(0, item.value))))
  const barMaxHeight = $derived(Math.max(120, height - 72))

  function fillForRole(role: IBCSRole = 'neutral'): string {
    if (role === 'actual') return 'var(--suar-ink-56)'
    if (role === 'plan') return '#9aa7c0'
    if (role === 'highlight') return 'var(--suar-black)'
    if (role === 'risk') return 'var(--suar-orange)'
    if (role === 'positive') return '#2fbf71'
    return 'var(--suar-ink-36)'
  }

  function barHeight(value: number): string {
    const normalized = Math.max(0, value) / maxValue
    const pixels = normalized * barMaxHeight

    return `${Math.max(value > 0 ? 12 : 4, Math.round(pixels))}px`
  }
</script>

<article class="admin-chart-panel">
  <div class="admin-chart-head">
    <div class="admin-chart-kicker">{title}</div>
    {#if subtitle}
      <p>{subtitle}</p>
    {/if}
  </div>

  <div class="admin-chart-wrap" style={`height: ${height}px`} role="img" aria-label={title}>
    <div class="admin-bars" style={`--count: ${Math.max(1, data.length)}`}>
      {#each data as item}
        <div class="admin-bar-item">
          <div
            class="admin-bar"
            style={`height: ${barHeight(item.value)}; --bar-color: ${fillForRole(item.role)}`}
            title={`${item.label}: ${item.value}${unit}`}
          >
            <span>{item.value}{unit}</span>
          </div>
          <div class="admin-bar-label">{item.label}</div>
        </div>
      {/each}
    </div>
  </div>
</article>

<style>
  .admin-chart-panel {
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

  .admin-chart-head {
    margin-bottom: 18px;
  }

  .admin-chart-kicker {
    color: color-mix(in srgb, var(--suar-orange) 80%, var(--suar-black));
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .admin-chart-head p {
    margin: 6px 0 0;
    color: var(--suar-ink-56);
    font-size: 12px;
    font-weight: 650;
  }

  .admin-chart-wrap {
    position: relative;
    margin-top: 8px;
    border-left: 2px solid rgba(22, 19, 15, .18);
    border-bottom: 2px solid rgba(22, 19, 15, .18);
    background: linear-gradient(rgba(22, 19, 15, .08) 1px, transparent 1px);
    background-size: 100% 25%;
    padding: 0 34px;
  }

  .admin-bars {
    position: absolute;
    inset: 0 22px;
    display: grid;
    grid-template-columns: repeat(var(--count), minmax(0, 1fr));
    align-items: end;
    gap: clamp(16px, 4vw, 38px);
    padding: 0 24px 0 40px;
  }

  .admin-bar-item {
    display: grid;
    justify-items: center;
    gap: 10px;
    min-width: 0;
  }

  .admin-bar {
    position: relative;
    width: min(76px, 55%);
    min-height: 4px;
    border: 2px solid var(--suar-black);
    border-radius: 14px 14px 7px 7px;
    background: var(--bar-color);
    box-shadow: 5px 5px 0 rgba(22, 19, 15, .1);
    transform-origin: bottom;
    animation: admin-grow .8s var(--ease-suar) both;
  }

  .admin-bar span {
    position: absolute;
    top: -28px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--suar-black);
    font-size: 18px;
    font-weight: 950;
    white-space: nowrap;
  }

  .admin-bar-label {
    min-height: 32px;
    color: var(--suar-ink-56);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    font-weight: 900;
    line-height: 1.2;
    text-align: center;
    overflow-wrap: anywhere;
  }

  @keyframes admin-grow {
    from {
      transform: scaleY(0);
    }
  }

  @media (max-width: 680px) {
    .admin-chart-wrap {
      padding: 0 18px;
    }

    .admin-bars {
      gap: 18px;
      padding: 0 12px 0 18px;
    }

    .admin-bar {
      width: min(54px, 65%);
    }

    .admin-bar-label {
      font-size: 11px;
    }
  }
</style>
