<script lang="ts">
  import IBCSColumnChart from '@/apps/admin/shared/components/charts/ibcs_column_chart.svelte'
  import IBCSCompositionBar from '@/apps/admin/shared/components/charts/ibcs_composition_bar.svelte'
  import AdminPageHeader from '@/apps/admin/shared/components/admin_page_header.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

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
  const { t } = useTranslation()
  const pageTitle = $derived(t('task.admin_dashboard.main.page_title', {}, 'Admin Dashboard - Overview'))

  const systemScale = $derived([
    { label: t('task.admin_dashboard.main.labels.users', {}, 'Users'), value: stats.users.total, role: 'actual' as const },
    { label: t('task.admin_dashboard.main.labels.orgs', {}, 'Orgs'), value: stats.organizations.total, role: 'plan' as const },
    { label: t('task.admin_dashboard.main.labels.projects', {}, 'Projects'), value: stats.projects.total, role: 'highlight' as const },
    { label: t('task.admin_dashboard.main.labels.tasks', {}, 'Tasks'), value: stats.tasks.total, role: 'neutral' as const },
  ])

  const executionFlow = $derived([
    { label: t('task.admin_dashboard.main.labels.projects_done', {}, 'Projects Done'), value: stats.projects.completed, role: 'actual' as const },
    { label: t('task.admin_dashboard.main.labels.projects_active', {}, 'Projects Active'), value: stats.projects.active, role: 'highlight' as const },
    { label: t('task.admin_dashboard.main.labels.tasks_done', {}, 'Tasks Done'), value: stats.tasks.completed, role: 'positive' as const },
    { label: t('task.admin_dashboard.main.labels.tasks_wip', {}, 'Tasks WIP'), value: stats.tasks.in_progress, role: 'risk' as const },
  ])

  const userHealth = $derived([
    { label: t('task.admin_dashboard.main.labels.active', {}, 'Active'), value: stats.users.active, role: 'actual' as const },
    { label: t('task.admin_dashboard.main.labels.suspended', {}, 'Suspended'), value: stats.users.suspended, role: 'risk' as const },
    { label: t('task.admin_dashboard.main.labels.new_month', {}, 'New Month'), value: stats.users.new_this_month, role: 'highlight' as const },
  ])

  const subscriptionMix = $derived([
    { label: t('task.admin_dashboard.main.labels.pro', {}, 'Pro'), value: stats.subscriptions.pro, role: 'highlight' as const },
    { label: t('task.admin_dashboard.main.labels.promax', {}, 'ProMax'), value: stats.subscriptions.promax, role: 'actual' as const },
    {
      label: t('task.admin_dashboard.main.labels.other_active', {}, 'Other Active'),
      value: Math.max(0, stats.subscriptions.active - stats.subscriptions.pro - stats.subscriptions.promax),
      role: 'plan' as const,
    },
  ])

  const riskSignals = $derived([
    { label: t('task.admin_dashboard.main.labels.flagged_reviews', {}, 'Flagged Reviews'), value: stats.moderation.pending_flagged_reviews, role: 'risk' as const },
    { label: t('task.admin_dashboard.main.labels.expiring_subs', {}, 'Expiring Subs'), value: stats.subscriptions.expiring_soon, role: 'neutral' as const },
  ])
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="space-y-6 animate-fade-in max-w-7xl mx-auto">
  <AdminPageHeader 
    title={t('task.admin_dashboard.main.title', {}, 'System dashboard')}
    description={t('task.admin_dashboard.main.description', {}, 'Overview of platform scale, user health, and key operational signals.')}
  />

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title="System scale"
      subtitle={t('task.admin_dashboard.main.system_scale_subtitle', {}, 'Platform scale')}
      data={systemScale}
    />
    <IBCSColumnChart
      title="Execution flow"
      subtitle={t('task.admin_dashboard.main.execution_flow_subtitle', {}, 'Completed and in-progress workload')}
      data={executionFlow}
    />
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title="User health"
      subtitle="Dark = actual, red = adverse signal, blue = focus metric"
      data={userHealth}
    />
    <IBCSColumnChart
      title="Risk watch"
      subtitle={t('task.admin_dashboard.main.risk_watch_subtitle', {}, 'Signals needing attention')}
      data={riskSignals}
    />
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSCompositionBar
      title="Subscription mix"
      subtitle={t('task.admin_dashboard.main.subscription_mix_subtitle', {}, 'Active plan mix')}
      segments={subscriptionMix}
    />
    <div class="border border-border rounded-lg p-4 bg-card">
      <h2 class="font-medium uppercase tracking-wider text-xs text-muted-foreground">IBCS notation</h2>
      <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
        <li><span class="font-semibold text-foreground">Dark gray</span>: Actual</li>
        <li><span class="font-semibold text-foreground">Light gray</span>: Baseline/plan</li>
        <li><span class="font-semibold text-foreground">Blue</span>: Focus item</li>
        <li><span class="font-semibold text-primary">Orange red</span>: Adverse/risk</li>
      </ul>
      <a href="/admin/reviews" class="mt-4 inline-flex text-sm font-bold text-foreground hover:underline">{t('task.admin_dashboard.main.open_moderation', {}, 'Open moderation queue')}</a>
      <div class="mt-4 flex flex-wrap gap-2">
        <a href="/admin/permissions" class="text-sm font-bold text-foreground hover:underline">{t('task.admin_dashboard.main.view_permissions', {}, 'View permission matrix')}</a>
        <a href="/admin/qr-codes" class="text-sm font-bold text-foreground hover:underline">{t('task.admin_dashboard.main.open_qr', {}, 'Open personal plan QR')}</a>
      </div>
    </div>
  </div>
</div>
