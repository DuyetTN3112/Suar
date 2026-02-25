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
  const pageTitle = $derived(t('admin_ui.dashboards.overview.page_title', {}, 'Admin Dashboard - Overview'))

  const systemScale = $derived([
    { label: t('admin_ui.dashboards.labels.users', {}, 'Users'), value: stats.users.total, role: 'actual' as const },
    { label: t('admin_ui.dashboards.labels.organizations', {}, 'Organizations'), value: stats.organizations.total, role: 'plan' as const },
    { label: t('admin_ui.dashboards.labels.projects', {}, 'Projects'), value: stats.projects.total, role: 'highlight' as const },
    { label: t('admin_ui.dashboards.labels.tasks', {}, 'Tasks'), value: stats.tasks.total, role: 'neutral' as const },
  ])

  const executionFlow = $derived([
    { label: t('admin_ui.dashboards.labels.projects_done', {}, 'Projects Done'), value: stats.projects.completed, role: 'actual' as const },
    { label: t('admin_ui.dashboards.labels.projects_active', {}, 'Projects Active'), value: stats.projects.active, role: 'highlight' as const },
    { label: t('admin_ui.dashboards.labels.tasks_done', {}, 'Tasks Done'), value: stats.tasks.completed, role: 'positive' as const },
    { label: t('admin_ui.dashboards.labels.tasks_wip', {}, 'Tasks WIP'), value: stats.tasks.in_progress, role: 'risk' as const },
  ])

  const userHealth = $derived([
    { label: t('admin_ui.dashboards.labels.active', {}, 'Active'), value: stats.users.active, role: 'actual' as const },
    { label: t('admin_ui.dashboards.labels.suspended', {}, 'Suspended'), value: stats.users.suspended, role: 'risk' as const },
    { label: t('admin_ui.dashboards.labels.new_this_month', {}, 'New This Month'), value: stats.users.new_this_month, role: 'highlight' as const },
  ])

  const subscriptionMix = $derived([
    { label: t('admin_ui.dashboards.labels.pro', {}, 'Pro'), value: stats.subscriptions.pro, role: 'highlight' as const },
    { label: t('admin_ui.dashboards.labels.promax', {}, 'ProMax'), value: stats.subscriptions.promax, role: 'actual' as const },
    {
      label: t('admin_ui.dashboards.labels.other_active', {}, 'Other Active'),
      value: Math.max(0, stats.subscriptions.active - stats.subscriptions.pro - stats.subscriptions.promax),
      role: 'plan' as const,
    },
  ])

  const riskSignals = $derived([
    { label: t('admin_ui.dashboards.labels.flagged_reviews', {}, 'Flagged Reviews'), value: stats.moderation.pending_flagged_reviews, role: 'risk' as const },
    { label: t('admin_ui.dashboards.labels.expiring_subscriptions', {}, 'Expiring Subscriptions'), value: stats.subscriptions.expiring_soon, role: 'neutral' as const },
  ])
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="space-y-6 animate-fade-in max-w-7xl mx-auto">
  <AdminPageHeader 
    title={t('admin_ui.dashboards.overview.title', {}, 'System dashboard')}
    description={t('admin_ui.dashboards.overview.description', {}, 'Overview of platform scale, user health, and key operational signals.')}
  />

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title={t('admin_ui.dashboards.overview.system_scale_title', {}, 'System scale')}
      subtitle={t('admin_ui.dashboards.overview.system_scale_subtitle', {}, 'Platform scale')}
      data={systemScale}
    />
    <IBCSColumnChart
      title={t('admin_ui.dashboards.overview.execution_flow_title', {}, 'Execution flow')}
      subtitle={t('admin_ui.dashboards.overview.execution_flow_subtitle', {}, 'Completed and in-progress workload')}
      data={executionFlow}
    />
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title={t('admin_ui.dashboards.overview.user_health_title', {}, 'User health')}
      subtitle={t('admin_ui.dashboards.overview.user_health_subtitle', {}, 'Dark = actual, red = adverse signal, blue = focus metric')}
      data={userHealth}
    />
    <IBCSColumnChart
      title={t('admin_ui.dashboards.overview.risk_watch_title', {}, 'Risk watch')}
      subtitle={t('admin_ui.dashboards.overview.risk_watch_subtitle', {}, 'Signals needing attention')}
      data={riskSignals}
    />
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSCompositionBar
      title={t('admin_ui.dashboards.overview.subscription_mix_title', {}, 'Subscription mix')}
      subtitle={t('admin_ui.dashboards.overview.subscription_mix_subtitle', {}, 'Active plan mix')}
      segments={subscriptionMix}
    />
    <div class="border border-border rounded-lg p-4 bg-card">
      <h2 class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('admin_ui.dashboards.overview.ibcs_notation', {}, 'IBCS notation')}</h2>
      <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
        <li>{t('admin_ui.dashboards.overview.notation.actual', {}, 'Dark gray: Actual')}</li>
        <li>{t('admin_ui.dashboards.overview.notation.baseline', {}, 'Light gray: Baseline/plan')}</li>
        <li>{t('admin_ui.dashboards.overview.notation.focus', {}, 'Blue: Focus item')}</li>
        <li class="text-primary">{t('admin_ui.dashboards.overview.notation.risk', {}, 'Orange red: Adverse/risk')}</li>
      </ul>
      <a href="/admin/reviews" class="mt-4 inline-flex text-sm font-bold text-foreground hover:underline">{t('admin_ui.dashboards.overview.open_moderation', {}, 'Open moderation queue')}</a>
      <div class="mt-4 flex flex-wrap gap-2">
        <a href="/admin/permissions" class="text-sm font-bold text-foreground hover:underline">{t('admin_ui.dashboards.overview.view_permissions', {}, 'View permission matrix')}</a>
        <a href="/admin/qr-codes" class="text-sm font-bold text-foreground hover:underline">{t('admin_ui.dashboards.overview.open_qr', {}, 'Open personal plan QR')}</a>
      </div>
    </div>
  </div>
</div>
