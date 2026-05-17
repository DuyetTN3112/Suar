<script lang="ts">
  import IBCSColumnChart from '@/apps/admin/shared/components/charts/ibcs_column_chart.svelte'
  import IBCSCompositionBar from '@/apps/admin/shared/components/charts/ibcs_composition_bar.svelte'
  import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'
  import { format } from 'date-fns'
  import { dateFnsLocale, shortDatePattern } from '@/apps/admin/shared/lib/date_locale'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'
  import type { OffsetPagePagination } from '@/apps/admin/shared/lib/pagination'

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
    pagination: OffsetPagePagination
  }

  const { stats, subscriptionStats, subscriptions, pagination }: Props = $props()
  const { t } = useTranslation()

  function formatShortDate(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return format(date, shortDatePattern(), { locale: dateFnsLocale() })
  }

  const proCount = $derived(subscriptionStats.byPlan.pro ?? 0)
  const promaxCount = $derived(subscriptionStats.byPlan.promax ?? 0)
  const freeCount = $derived(subscriptionStats.byPlan.free ?? 0)

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
  <title>{t('task.admin_subscriptions.title', {}, 'Admin Dashboard - Subscriptions')}</title>
</svelte:head>

  <div class="space-y-6">
  <div class="flex items-end justify-between gap-4">
    <div>
      <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Admin / Subscription Dashboard</p>
      <h1 class="text-4xl font-bold tracking-tight">{t('task.admin_subscriptions.heading', {}, 'Subscription dashboard')}</h1>
    </div>
    <a href="/admin/packages" class="border border-border rounded-lg px-4 py-2 bg-card text-sm font-medium">
      {t('task.admin_subscriptions.open_packages', {}, 'Open package management')}
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
    <div class="border border-border rounded-lg p-5 bg-card">
      <h2 class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Core KPIs</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="border border-border rounded-lg p-3 bg-card shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Total</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{subscriptionStats.total}</dd>
        </div>
        <div class="border border-border rounded-lg p-3 bg-card shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Active</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{subscriptionStats.active}</dd>
        </div>
        <div class="border border-border rounded-lg p-3 bg-card shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Expiring soon</dt>
          <dd class="mt-1 text-2xl font-bold text-primary">{subscriptionStats.expiringSoon}</dd>
        </div>
        <div class="border border-border rounded-lg p-3 bg-card shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">Cancelled</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{subscriptionStats.cancelled}</dd>
        </div>
      </dl>
    </div>
  </section>

  <section class="border border-border rounded-lg p-5 bg-card">
    <h2 class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Recent subscription accounts</h2>
    <div class="mt-3 overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th>User</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Expire at</th>
          </tr>
        </thead>
        <tbody>
          {#each subscriptions as item}
            <tr>
              <td>
                <p class="font-medium text-foreground">{item.username}</p>
                <p class="text-xs text-muted-foreground">{item.email ?? 'No email'}</p>
              </td>
              <td>{item.plan}</td>
              <td>{item.status}</td>
              <td>{item.expires_at ? formatShortDate(item.expires_at) : 'N/A'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <UnifiedOffsetPagination {pagination} baseUrl="/admin/dashboards/subscriptions" />
  </section>
</div>
