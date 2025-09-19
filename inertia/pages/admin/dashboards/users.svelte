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
