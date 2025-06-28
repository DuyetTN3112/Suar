<script lang="ts">
  import IBCSColumnChart from '@/components/charts/ibcs_column_chart.svelte'
  import IBCSCompositionBar from '@/components/charts/ibcs_composition_bar.svelte'

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

  const accountStatus = $derived([
    { label: 'Active', value: stats.users.active, role: 'actual' as const },
    { label: 'Suspended', value: stats.users.suspended, role: 'risk' as const },
    { label: 'New', value: stats.users.new_this_month, role: 'highlight' as const },
  ])

  const behaviorSignals = $derived([
    { label: 'Organizations', value: stats.organizations.total, role: 'plan' as const },
    { label: 'Projects Active', value: stats.projects.active, role: 'highlight' as const },
    { label: 'Moderation', value: stats.moderation.pending_flagged_reviews, role: 'risk' as const },
  ])

  const userMix = $derived([
    { label: 'Active', value: stats.users.active, role: 'actual' as const },
    { label: 'Suspended', value: stats.users.suspended, role: 'risk' as const },
    {
      label: 'Other',
      value: Math.max(0, stats.users.total - stats.users.active - stats.users.suspended),
      role: 'plan' as const,
    },
  ])
</script>

<svelte:head>
  <title>Admin Dashboard - Người dùng</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-end justify-between gap-4">
    <div>
      <p class="neo-kicker">Admin / User Dashboard</p>
      <h1 class="text-4xl font-bold tracking-tight">Dashboard người dùng</h1>
      <p class="mt-2 text-sm text-muted-foreground">Theo dõi chất lượng user base theo chuẩn IBCS: chỉ số rõ, màu nhất quán, so sánh trực quan.</p>
    </div>
    <div class="neo-surface-soft px-4 py-3 text-right">
      <p class="neo-kicker">New this month</p>
      <p class="text-2xl font-bold neo-text-orange">+{stats.users.new_this_month}</p>
    </div>
  </div>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title="Account status"
      subtitle="Biểu đồ trạng thái tài khoản theo chuẩn ký hiệu IBCS"
      data={accountStatus}
    />
    <IBCSColumnChart
      title="Behavior signals"
      subtitle="Các chỉ báo user liên đới sang tổ chức và moderation"
      data={behaviorSignals}
    />
  </section>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSCompositionBar
      title="User population mix"
      subtitle="Tach nhom user de nhin ro profile van hanh"
      segments={userMix}
    />
    <div class="neo-surface-soft p-5">
      <h2 class="neo-kicker">Reference KPIs</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="neo-surface-soft p-3 shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Total users</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{stats.users.total}</dd>
        </div>
        <div class="neo-surface-soft p-3 shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Organizations</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{stats.organizations.total}</dd>
        </div>
        <div class="neo-surface-soft p-3 shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Projects active</dt>
          <dd class="mt-1 text-2xl font-bold neo-text-blue">{stats.projects.active}</dd>
        </div>
        <div class="neo-surface-soft p-3 shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Moderation backlog</dt>
          <dd class="mt-1 text-2xl font-bold neo-text-orange">{stats.moderation.pending_flagged_reviews}</dd>
        </div>
      </dl>
    </div>
  </section>
</div>
