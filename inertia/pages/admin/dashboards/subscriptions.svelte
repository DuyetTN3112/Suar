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

  interface SubscriptionStats {
    total: number
    active: number
    expiringSoon: number
    cancelled: number
    byPlan: Record<string, number>
  }

  interface SubscriptionItem {
    id: string
    user_id: string
    username: string
    email: string | null
    system_role: string
    plan: string
    status: string
    started_at: string | null
    expires_at: string | null
    auto_renew: boolean
    created_at: string | null
    updated_at: string | null
  }

  interface Props {
    stats: Stats
    subscriptionStats: SubscriptionStats
    subscriptions: SubscriptionItem[]
  }

  const { stats, subscriptionStats, subscriptions }: Props = $props()

  const proCount = $derived(subscriptionStats.byPlan.pro)
  const promaxCount = $derived(subscriptionStats.byPlan.promax)
  const freeCount = $derived(subscriptionStats.byPlan.free)

  const subscriptionStatus = $derived([
    { label: 'Active', value: subscriptionStats.active, role: 'actual' as const },
    { label: 'Expiring', value: subscriptionStats.expiringSoon, role: 'risk' as const },
    { label: 'Cancelled', value: subscriptionStats.cancelled, role: 'plan' as const },
  ])

  const planDistribution = $derived([
    { label: 'Free', value: freeCount, role: 'plan' as const },
    { label: 'Pro', value: proCount, role: 'highlight' as const },
    { label: 'ProMax', value: promaxCount, role: 'actual' as const },
  ])

  const adminSignals = $derived([
    { label: 'Flagged Reviews', value: stats.moderation.pending_flagged_reviews, role: 'risk' as const },
    { label: 'Users Active', value: stats.users.active, role: 'neutral' as const },
    { label: 'Projects Active', value: stats.projects.active, role: 'highlight' as const },
  ])
</script>

<svelte:head>
  <title>Admin Dashboard - Gói đăng ký</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-end justify-between gap-4">
    <div>
      <p class="neo-kicker">Admin / Subscription Dashboard</p>
      <h1 class="text-4xl font-bold tracking-tight">Dashboard gói đăng ký</h1>
      <p class="mt-2 text-sm text-muted-foreground">Theo dõi adoption của gói theo user account để phát hiện rủi ro churn và cơ hội upsell.</p>
    </div>
    <a href="/admin/packages" class="neo-surface-soft px-4 py-2 text-sm font-bold">
      Mở màn quản lý gói
    </a>
  </div>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title="Subscription status"
      subtitle="Theo doi suc khoe lifecycle cua subscription"
      data={subscriptionStatus}
    />
    <IBCSColumnChart
      title="Admin signals"
      subtitle="Tac dong cheo giua su dung goi va van hanh"
      data={adminSignals}
    />
  </section>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSCompositionBar
      title="Plan distribution"
      subtitle="Phan bo subscription theo plan"
      segments={planDistribution}
    />
    <div class="neo-surface-soft p-5">
      <h2 class="neo-kicker">Core KPIs</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="neo-surface-soft p-3 shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Total</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{subscriptionStats.total}</dd>
        </div>
        <div class="neo-surface-soft p-3 shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Active</dt>
          <dd class="mt-1 text-2xl font-bold neo-text-blue">{subscriptionStats.active}</dd>
        </div>
        <div class="neo-surface-soft p-3 shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Expiring soon</dt>
          <dd class="mt-1 text-2xl font-bold neo-text-orange">{subscriptionStats.expiringSoon}</dd>
        </div>
        <div class="neo-surface-soft p-3 shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Cancelled</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{subscriptionStats.cancelled}</dd>
        </div>
      </dl>
    </div>
  </section>

  <section class="neo-surface-soft p-5">
    <h2 class="neo-kicker">Recent subscription accounts</h2>
    <div class="mt-3 overflow-x-auto">
      <table class="neo-data-table text-sm">
        <thead>
          <tr>
            <th>User</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Expire at</th>
          </tr>
        </thead>
        <tbody>
          {#each subscriptions.slice(0, 8) as item}
            <tr>
              <td>
                <p class="font-medium text-foreground">{item.username}</p>
                <p class="text-xs text-muted-foreground">{item.email ?? 'No email'}</p>
              </td>
              <td>{item.plan}</td>
              <td>{item.status}</td>
              <td>{item.expires_at ? new Date(item.expires_at).toLocaleDateString('vi-VN') : 'N/A'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>
