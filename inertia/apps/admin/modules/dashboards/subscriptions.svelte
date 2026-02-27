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
    { label: t('admin_ui.dashboards.labels.active', {}, 'Active'), value: subscriptionStats.active, role: 'actual' as const },
    { label: t('admin_ui.dashboards.labels.expiring', {}, 'Expiring'), value: subscriptionStats.expiringSoon, role: 'risk' as const },
    { label: t('admin_ui.dashboards.labels.cancelled', {}, 'Cancelled'), value: subscriptionStats.cancelled, role: 'plan' as const },
  ])

  const planDistribution = $derived([
    { label: t('admin_ui.dashboards.labels.free', {}, 'Free'), value: freeCount, role: 'plan' as const },
    { label: t('admin_ui.dashboards.labels.pro', {}, 'Pro'), value: proCount, role: 'highlight' as const },
    { label: t('admin_ui.dashboards.labels.promax', {}, 'ProMax'), value: promaxCount, role: 'actual' as const },
  ])

  const adminSignals = $derived([
    { label: t('admin_ui.dashboards.labels.flagged_reviews', {}, 'Flagged Reviews'), value: stats.moderation.pending_flagged_reviews, role: 'risk' as const },
    { label: t('admin_ui.dashboards.labels.users_active', {}, 'Users Active'), value: stats.users.active, role: 'neutral' as const },
    { label: t('admin_ui.dashboards.labels.projects_active', {}, 'Projects Active'), value: stats.projects.active, role: 'highlight' as const },
  ])
</script>

<svelte:head>
  <title>{t('admin_ui.dashboards.subscriptions.page_title', {}, 'Admin Dashboard - Subscriptions')}</title>
</svelte:head>

  <div class="space-y-6">
  <div class="flex items-end justify-between gap-4">
    <div>
      <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('admin_ui.dashboards.subscriptions.eyebrow', {}, 'Admin / Subscription Dashboard')}</p>
      <h1 class="text-4xl font-bold tracking-tight">{t('admin_ui.dashboards.subscriptions.title', {}, 'Subscription dashboard')}</h1>
    </div>
    <a href="/admin/packages" class="border border-border rounded-lg px-4 py-2 bg-card text-sm font-medium">
      {t('admin_ui.dashboards.subscriptions.open_packages', {}, 'Open package management')}
    </a>
  </div>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title={t('admin_ui.dashboards.subscriptions.status_title', {}, 'Subscription status')}
      subtitle={t('admin_ui.dashboards.subscriptions.status_subtitle', {}, 'Track subscription lifecycle health')}
      data={subscriptionStatus}
    />
    <IBCSColumnChart
      title={t('admin_ui.dashboards.subscriptions.admin_signals_title', {}, 'Admin signals')}
      subtitle={t('admin_ui.dashboards.subscriptions.admin_signals_subtitle', {}, 'Cross-impact between plan usage and operations')}
      data={adminSignals}
    />
  </section>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSCompositionBar
      title={t('admin_ui.dashboards.subscriptions.plan_distribution_title', {}, 'Plan distribution')}
      subtitle={t('admin_ui.dashboards.subscriptions.plan_distribution_subtitle', {}, 'Subscription distribution by plan')}
      segments={planDistribution}
    />
    <div class="border border-border rounded-lg p-5 bg-card">
      <h2 class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('admin_ui.dashboards.subscriptions.core_kpis', {}, 'Core KPIs')}</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="border border-border rounded-lg p-3 bg-card shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">{t('admin_ui.dashboards.labels.total', {}, 'Total')}</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{subscriptionStats.total}</dd>
        </div>
        <div class="border border-border rounded-lg p-3 bg-card shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">{t('admin_ui.dashboards.labels.active', {}, 'Active')}</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{subscriptionStats.active}</dd>
        </div>
        <div class="border border-border rounded-lg p-3 bg-card shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">{t('admin_ui.dashboards.labels.expiring_soon', {}, 'Expiring soon')}</dt>
          <dd class="mt-1 text-2xl font-bold text-primary">{subscriptionStats.expiringSoon}</dd>
        </div>
        <div class="border border-border rounded-lg p-3 bg-card shadow-none">
          <dt class="text-xs uppercase tracking-wide text-muted-foreground">{t('admin_ui.dashboards.labels.cancelled', {}, 'Cancelled')}</dt>
          <dd class="mt-1 text-2xl font-bold text-foreground">{subscriptionStats.cancelled}</dd>
        </div>
      </dl>
    </div>
  </section>

  <section class="border border-border rounded-lg p-5 bg-card">
    <h2 class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('admin_ui.dashboards.subscriptions.recent_accounts', {}, 'Recent subscription accounts')}</h2>
    <div class="mt-3 overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th>{t('admin_ui.dashboards.labels.user', {}, 'User')}</th>
            <th>{t('admin_ui.dashboards.labels.plan', {}, 'Plan')}</th>
            <th>{t('admin_ui.dashboards.labels.status', {}, 'Status')}</th>
            <th>{t('admin_ui.dashboards.labels.expires_at', {}, 'Expires at')}</th>
          </tr>
        </thead>
        <tbody>
          {#each subscriptions as item}
            <tr>
              <td>
                <p class="font-medium text-foreground">{item.username}</p>
                <p class="text-xs text-muted-foreground">{item.email ?? t('admin_ui.dashboards.subscriptions.no_email', {}, 'No email')}</p>
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
