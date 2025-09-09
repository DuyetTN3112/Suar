<script lang="ts">
  interface Stats {
    users: {
      total: number
      active: number
      suspended: number
      new_this_month: number
    }
    organizations: {
      total: number
      new_this_month: number
    }
    projects: {
      total: number
      active: number
      completed: number
    }
    tasks: {
      total: number
      in_progress: number
      completed: number
    }
    subscriptions: {
      total: number
      active: number
      expiring_soon: number
      pro: number
      promax: number
    }
    moderation: {
      pending_flagged_reviews: number
    }
  }

  interface Props {
    stats: Stats
  }

  const { stats }: Props = $props()

  const otherUsers = $derived(Math.max(0, stats.users.total - stats.users.active - stats.users.suspended))
  const activePercent = $derived(stats.users.total > 0 ? Math.round((stats.users.active / stats.users.total) * 100) : 0)
  const suspendedPercent = $derived(stats.users.total > 0 ? Math.round((stats.users.suspended / stats.users.total) * 100) : 0)
  const otherPercent = $derived(Math.max(0, 100 - activePercent - suspendedPercent))
  const chartMax = $derived(Math.max(1, stats.users.active, stats.users.suspended, stats.users.new_this_month, stats.organizations.total, stats.projects.active, stats.moderation.pending_flagged_reviews))

  function barHeight(value: number) {
    return `calc(${Math.max(0, value)} / ${chartMax} * 10.5rem)`
  }
</script>

<svelte:head>
  <title>SUAR ADMIN - Dashboard người dùng</title>
</svelte:head>

<section class="content">
  <div class="page-head">
    <div>
      <div class="eyebrow">Admin / User dashboard</div>
      <h1>Dashboard người dùng</h1>
      <p class="subtitle">
        Theo dõi chất lượng user base theo chuẩn IBSC: trạng thái tài khoản, hành vi liên đới tổ chức, dự án active và backlog moderation.
      </p>
    </div>
    <div class="month">
      <span>New this month</span>
      <strong>+{stats.users.new_this_month}</strong>
    </div>
  </div>

  <div class="dash">
    <div>
      <div class="metrics">
        <article class="metric" style="--tint: rgba(54, 66, 95, .12)">
          <span>Total users</span>
          <strong>{stats.users.total}</strong>
          <small>{activePercent}% active</small>
        </article>
        <article class="metric" style="--tint: rgba(255, 61, 22, .12)">
          <span>Organizations</span>
          <strong>{stats.organizations.total}</strong>
          <small>linked entities</small>
        </article>
        <article class="metric" style="--tint: rgba(90, 25, 255, .12)">
          <span>Projects active</span>
          <strong>{stats.projects.active}</strong>
          <small>highest signal</small>
        </article>
        <article class="metric" style="--tint: rgba(240, 4, 31, .12)">
          <span>Moderation</span>
          <strong>{stats.moderation.pending_flagged_reviews}</strong>
          <small>needs attention</small>
        </article>
      </div>

      <article class="panel chart">
        <div class="panel-head">
          <div>
            <div class="kicker">Account status</div>
            <h2 class="panel-title">Tình trạng tài khoản</h2>
            <p class="panel-desc">Biểu đồ trạng thái tài khoản theo chuẩn ký hiệu IBSC</p>
          </div>
        </div>
        <div class="chart-wrap">
          <div class="bars">
            <div class="bar-item">
              <div class="bar steel" style:height={barHeight(stats.users.active)}><span>{stats.users.active}</span></div>
              <div class="bar-label">Active</div>
            </div>
            <div class="bar-item">
              <div class="bar danger" style:height={barHeight(stats.users.suspended)}><span>{stats.users.suspended}</span></div>
              <div class="bar-label">Suspended</div>
            </div>
            <div class="bar-item">
              <div class="bar blue" style:height={barHeight(stats.users.new_this_month)}><span>{stats.users.new_this_month}</span></div>
              <div class="bar-label">New</div>
            </div>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="kicker">User population mix</div>
            <h2 class="panel-title">Tỷ lệ user base</h2>
            <p class="panel-desc">Tách nhóm user để nhìn rõ profile vận hành</p>
          </div>
        </div>
        <div class="stack">
          <div class="stack-active" style:width={`${activePercent}%`}></div>
          <div class="stack-risk" style:width={`${suspendedPercent}%`}></div>
          <div class="stack-other" style:width={`${otherPercent}%`}></div>
        </div>
        <div class="legend">
          <div class="legend-row"><span class="dot steel-dot"></span><span>Active</span><strong>{stats.users.active} · {activePercent}%</strong></div>
          <div class="legend-row"><span class="dot risk-dot"></span><span>Suspended</span><strong>{stats.users.suspended} · {suspendedPercent}%</strong></div>
          <div class="legend-row"><span class="dot other-dot"></span><span>Other</span><strong>{otherUsers} · {otherPercent}%</strong></div>
        </div>
      </article>
    </div>

    <div class="side-stack">
      <article class="panel chart">
        <div class="panel-head">
          <div>
            <div class="kicker">Behavior signals</div>
            <h2 class="panel-title">Tín hiệu hành vi</h2>
            <p class="panel-desc">User liên đới sang tổ chức, dự án và moderation</p>
          </div>
        </div>
        <div class="chart-wrap">
          <div class="bars">
            <div class="bar-item">
              <div class="bar plan" style:height={barHeight(stats.organizations.total)}><span>{stats.organizations.total}</span></div>
              <div class="bar-label">Organizations</div>
            </div>
            <div class="bar-item">
              <div class="bar purple" style:height={barHeight(stats.projects.active)}><span>{stats.projects.active}</span></div>
              <div class="bar-label">Projects Active</div>
            </div>
            <div class="bar-item">
              <div class="bar danger" style:height={barHeight(stats.moderation.pending_flagged_reviews)}><span>{stats.moderation.pending_flagged_reviews}</span></div>
              <div class="bar-label">Moderation</div>
            </div>
          </div>
        </div>
      </article>

      <article class="panel kpi-panel">
        <div class="panel-head">
          <div>
            <div class="kicker">Reference KPIs</div>
            <h2 class="panel-title">Chỉ số tham chiếu</h2>
            <p class="panel-desc">Các số liệu nền cho admin decision loop</p>
          </div>
        </div>
        <div class="kpi-grid">
          <div class="kpi" style="--tint: rgba(54, 66, 95, .1)"><span>Total users</span><strong>{stats.users.total}</strong></div>
          <div class="kpi" style="--tint: rgba(255, 61, 22, .1)"><span>Organizations</span><strong>{stats.organizations.total}</strong></div>
          <div class="kpi" style="--tint: rgba(90, 25, 255, .11); --value: var(--suar-black)"><span>Projects active</span><strong>{stats.projects.active}</strong></div>
          <div class="kpi" style="--tint: rgba(240, 4, 31, .11); --value: var(--suar-orange)"><span>Moderation backlog</span><strong>{stats.moderation.pending_flagged_reviews}</strong></div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="kicker">System pulse</div>
            <h2 class="panel-title">Bản đồ tín hiệu nhanh</h2>
          </div>
        </div>
        <div class="pulse-map">
          <div class="node one">{stats.users.total}</div>
          <div class="node two">{stats.projects.active}</div>
          <div class="node three">{stats.moderation.pending_flagged_reviews}</div>
        </div>
      </article>
    </div>
  </div>

  <div class="footer">System admin panel · SUAR platform</div>
</section>

<style>
  .content {
    position: relative;
    overflow: hidden;
    min-height: calc(100vh - 60px);
    border: 2px solid var(--suar-black);
    border-radius: 38px;
    background: linear-gradient(180deg, rgba(255, 253, 248, .86), rgba(255, 246, 232, .76)), var(--suar-white);
    box-shadow: 10px 10px 0 rgba(22, 19, 15, .1);
    padding: clamp(24px, 4vw, 52px);
  }

  .content::before {
    content: "USERS";
    position: absolute;
    right: -18px;
    top: 14px;
    color: rgba(22, 19, 15, .035);
    font-size: clamp(78px, 13vw, 190px);
    font-weight: 950;
    letter-spacing: -.09em;
    line-height: .8;
    pointer-events: none;
  }

  .content::after {
    content: "";
    position: absolute;
    inset: 18px;
    border: 1px dashed rgba(22, 19, 15, .09);
    border-radius: 28px;
    pointer-events: none;
  }

  .page-head,
  .dash,
  .footer {
    position: relative;
    z-index: 1;
  }

  .page-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 24px;
    align-items: start;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 14px;
    color: color-mix(in srgb, var(--suar-orange) 80%, var(--suar-black));
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .eyebrow::before,
  .eyebrow::after {
    content: "";
    display: inline-block;
    background: var(--suar-orange);
  }

  .eyebrow::before {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    box-shadow: 0 0 0 6px rgba(255, 61, 22, .12);
  }

  .eyebrow::after {
    width: 44px;
    height: 2px;
  }

  h1 {
    max-width: 960px;
    margin: 0;
    font-size: clamp(50px, 7.4vw, 116px);
    font-weight: 950;
    letter-spacing: -.09em;
    line-height: .82;
  }

  .subtitle {
    max-width: 760px;
    margin: 18px 0 0;
    color: var(--suar-ink-56);
    font-size: 16px;
    font-weight: 640;
    line-height: 1.7;
  }

  .month {
    position: relative;
    min-width: 220px;
    overflow: hidden;
    border: 2px solid var(--suar-black);
    border-radius: 24px;
    background: var(--suar-white);
    padding: 17px 18px;
    box-shadow: 6px 6px 0 var(--suar-black);
  }

  .month::before {
    content: "";
    position: absolute;
    right: -24px;
    top: -26px;
    width: 90px;
    height: 90px;
    border-radius: 999px;
    background: rgba(255, 61, 22, .12);
  }

  .month span,
  .metric span,
  .kpi span {
    display: block;
    color: var(--suar-ink-56);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: .1em;
    text-transform: uppercase;
  }

  .month strong {
    position: relative;
    z-index: 1;
    display: block;
    margin-top: 9px;
    color: var(--suar-orange);
    font-size: 40px;
    font-weight: 950;
    letter-spacing: -.08em;
    line-height: .85;
    text-align: right;
  }

  .dash {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(340px, .78fr);
    gap: 18px;
    margin-top: clamp(28px, 4vw, 44px);
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 18px;
  }

  .metric,
  .panel,
  .kpi {
    position: relative;
    overflow: hidden;
    border: 2px solid var(--suar-black);
    background: rgba(255, 253, 248, .88);
  }

  .metric {
    border-radius: 24px;
    padding: 16px;
    box-shadow: 5px 5px 0 rgba(22, 19, 15, .1);
  }

  .metric::after,
  .kpi::before {
    content: "";
    position: absolute;
    right: -28px;
    bottom: -34px;
    width: 90px;
    height: 90px;
    border-radius: 999px;
    background: var(--tint, rgba(255, 61, 22, .1));
  }

  .metric strong {
    display: block;
    margin-top: 12px;
    font-size: 42px;
    font-weight: 950;
    letter-spacing: -.09em;
    line-height: .82;
  }

  .metric small {
    display: block;
    margin-top: 8px;
    color: var(--suar-ink-56);
    font-size: 12px;
    font-weight: 720;
  }

  .panel {
    border-radius: 30px;
    background: radial-gradient(circle at 12% 0%, rgba(255, 61, 22, .08), transparent 15rem), rgba(255, 253, 248, .86);
    padding: 18px;
    box-shadow: 8px 8px 0 rgba(22, 19, 15, .1);
  }

  .panel + .panel {
    margin-top: 18px;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .kicker {
    color: color-mix(in srgb, var(--suar-orange) 80%, var(--suar-black));
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .panel-title {
    margin: 4px 0 0;
    font-size: 18px;
    font-weight: 950;
    letter-spacing: -.04em;
  }

  .panel-desc {
    margin: 6px 0 0;
    color: var(--suar-ink-56);
    font-size: 12px;
    font-weight: 650;
  }

  .chart-wrap {
    position: relative;
    height: 250px;
    margin-top: 8px;
    border-left: 2px solid rgba(22, 19, 15, .18);
    border-bottom: 2px solid rgba(22, 19, 15, .18);
    background: linear-gradient(rgba(22, 19, 15, .08) 1px, transparent 1px);
    background-size: 100% 25%;
    padding: 0 34px;
  }

  .bars {
    position: absolute;
    inset: 0 22px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: end;
    gap: 38px;
    padding: 0 24px 0 40px;
  }

  .bar-item {
    display: grid;
    justify-items: center;
    gap: 10px;
  }

  .bar {
    position: relative;
    width: min(76px, 55%);
    min-height: 4px;
    border: 2px solid var(--suar-black);
    border-radius: 14px 14px 7px 7px;
    box-shadow: 5px 5px 0 rgba(22, 19, 15, .1);
    transform-origin: bottom;
    animation: grow .8s var(--ease-suar) both;
  }

  .bar span {
    position: absolute;
    top: -28px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 18px;
    font-weight: 950;
  }

  .steel { background: var(--suar-ink-56); }
  .danger { background: var(--suar-orange); }
  .blue { background: var(--suar-ink-56); }
  .purple { background: var(--suar-black); }
  .plan { background: #9aa7c0; }

  .bar-label {
    min-height: 32px;
    color: var(--suar-ink-56);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    font-weight: 900;
    text-align: center;
  }

  .stack {
    display: flex;
    height: 38px;
    overflow: hidden;
    border: 2px solid var(--suar-black);
    border-radius: 999px;
    background: rgba(22, 19, 15, .06);
    box-shadow: 4px 4px 0 rgba(22, 19, 15, .1);
  }

  .stack-active,
  .stack-risk,
  .stack-other {
    height: 100%;
    animation: reveal 1s var(--ease-suar) both;
  }

  .stack-active { background: linear-gradient(90deg, var(--suar-ink-56), #4d5d87); }
  .stack-risk { background: var(--suar-orange); }
  .stack-other { background: #9aa7c0; }

  .legend {
    display: grid;
    gap: 10px;
    margin-top: 18px;
  }

  .legend-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;
    color: var(--suar-ink-56);
    font-size: 13px;
    font-weight: 800;
  }

  .dot {
    width: 12px;
    height: 12px;
    border: 1.5px solid rgba(22, 19, 15, .18);
    border-radius: 999px;
  }

  .steel-dot { background: var(--suar-ink-56); }
  .risk-dot { background: var(--suar-orange); }
  .other-dot { background: #9aa7c0; }

  .side-stack {
    display: grid;
    gap: 18px;
  }

  .kpi-panel {
    min-height: 360px;
    background: radial-gradient(circle at 88% 0%, rgba(90, 25, 255, .12), transparent 12rem), rgba(255, 253, 248, .88);
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .kpi {
    min-height: 110px;
    border-radius: 20px;
    padding: 14px;
    box-shadow: 4px 4px 0 rgba(22, 19, 15, .12);
  }

  .kpi::before {
    top: -28px;
    bottom: auto;
    width: 78px;
    height: 78px;
  }

  .kpi strong {
    position: relative;
    z-index: 1;
    display: block;
    margin-top: 16px;
    color: var(--value, var(--suar-black));
    font-size: 36px;
    font-weight: 950;
    letter-spacing: -.08em;
    line-height: .9;
  }

  .pulse-map {
    position: relative;
    min-height: 168px;
    overflow: hidden;
    border: 1.5px dashed rgba(22, 19, 15, .14);
    border-radius: 28px;
    background:
      radial-gradient(circle at 50% 50%, rgba(255, 61, 22, .12), transparent 8rem),
      linear-gradient(rgba(22, 19, 15, .035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(22, 19, 15, .035) 1px, transparent 1px);
    background-size: auto, 26px 26px, 26px 26px;
  }

  .node {
    position: absolute;
    display: grid;
    width: 68px;
    height: 68px;
    place-items: center;
    border: 2px solid var(--suar-black);
    border-radius: 22px;
    background: var(--suar-white);
    color: var(--node);
    font-weight: 950;
    box-shadow: 5px 5px 0 rgba(22, 19, 15, .12);
    animation: bob 3.8s var(--ease-suar) infinite alternate;
  }

  .node.one {
    left: 11%;
    top: 28%;
    --node: var(--suar-ink-56);
    --tilt: -5deg;
  }

  .node.two {
    left: 43%;
    top: 14%;
    --node: var(--suar-black);
    --tilt: 4deg;
    animation-delay: -1s;
  }

  .node.three {
    right: 12%;
    bottom: 20%;
    --node: var(--suar-orange);
    --tilt: -3deg;
    animation-delay: -1.8s;
  }

  .footer {
    margin-top: 24px;
    color: rgba(22, 19, 15, .46);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .22em;
    text-align: center;
    text-transform: uppercase;
  }

  @keyframes grow {
    from { transform: scaleY(0); }
  }

  @keyframes reveal {
    from { width: 0; }
  }

  @keyframes bob {
    to { transform: translateY(-12px) rotate(calc(var(--tilt, 0deg) + 2deg)); }
  }

  @media (max-width: 1280px) {
    .dash {
      grid-template-columns: 1fr;
    }

    .side-stack {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 1120px) {
    .page-head {
      grid-template-columns: 1fr;
    }

    .month {
      width: 100%;
    }

    .metrics {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 900px) {
    .side-stack {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 680px) {
    .content {
      min-height: calc(100vh - 150px);
      border-radius: 26px;
      padding: 22px;
      box-shadow: 6px 6px 0 rgba(22, 19, 15, .1);
    }

    h1 {
      font-size: 50px;
    }

    .metrics,
    .kpi-grid {
      grid-template-columns: 1fr;
    }

    .bars {
      gap: 18px;
      padding: 0 12px 0 18px;
    }

    .bar {
      width: min(54px, 65%);
    }

    .bar-label {
      font-size: 11px;
    }
  }
</style>
