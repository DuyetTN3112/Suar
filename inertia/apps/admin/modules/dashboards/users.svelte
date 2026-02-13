<script lang="ts">
  import IBCSColumnChart from '@/apps/admin/shared/components/charts/ibcs_column_chart.svelte'
  import IBCSCompositionBar from '@/apps/admin/shared/components/charts/ibcs_composition_bar.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
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
  const pageTitle = $derived(t('admin_ui.dashboards.users.page_title', {}, 'Admin - User dashboard'))

  const otherUsers = $derived(Math.max(0, stats.users.total - stats.users.active - stats.users.suspended))

  const userStatus = $derived([
    { label: t('admin_ui.dashboards.labels.active', {}, 'Active'), value: stats.users.active, role: 'actual' as const },
    { label: t('admin_ui.dashboards.labels.suspended', {}, 'Suspended'), value: stats.users.suspended, role: 'risk' as const },
    { label: t('admin_ui.dashboards.labels.new_this_month', {}, 'New This Month'), value: stats.users.new_this_month, role: 'highlight' as const },
  ])

  const populationMix = $derived([
    { label: t('admin_ui.dashboards.labels.active', {}, 'Active'), value: stats.users.active, role: 'actual' as const },
    { label: t('admin_ui.dashboards.labels.suspended', {}, 'Suspended'), value: stats.users.suspended, role: 'risk' as const },
    { label: t('admin_ui.dashboards.labels.other', {}, 'Other'), value: otherUsers, role: 'plan' as const },
  ])

  const behaviorSignals = $derived([
    { label: t('admin_ui.dashboards.labels.organizations', {}, 'Organizations'), value: stats.organizations.total, role: 'plan' as const },
    { label: t('admin_ui.dashboards.labels.projects_active', {}, 'Projects Active'), value: stats.projects.active, role: 'highlight' as const },
    { label: t('admin_ui.dashboards.labels.moderation', {}, 'Moderation'), value: stats.moderation.pending_flagged_reviews, role: 'risk' as const },
  ])
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="space-y-1">
      <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('admin_ui.dashboards.users.eyebrow', {}, 'Admin / User Dashboard')}</p>
      <h1 class="text-4xl font-bold tracking-tight">{t('admin_ui.dashboards.users.title', {}, 'User dashboard')}</h1>
    </div>

    <Card class="min-w-[220px]">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('admin_ui.dashboards.labels.new_this_month', {}, 'New this month')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold text-orange">+{stats.users.new_this_month}</div>
      </CardContent>
    </Card>
  </div>

  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('admin_ui.dashboards.labels.total_users', {}, 'Total users')}</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.users.total}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('admin_ui.dashboards.labels.active', {}, 'Active')}</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.users.active}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('admin_ui.dashboards.labels.organizations', {}, 'Organizations')}</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.organizations.total}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('admin_ui.dashboards.labels.moderation', {}, 'Moderation')}</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.moderation.pending_flagged_reviews}</div></CardContent>
    </Card>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title={t('admin_ui.dashboards.users.status_title', {}, 'User status')}
      subtitle={t('admin_ui.dashboards.users.status_subtitle', {}, 'Account status')}
      data={userStatus}
    />
    <IBCSColumnChart
      title={t('admin_ui.dashboards.users.behavior_title', {}, 'Behavior signals')}
      subtitle={t('admin_ui.dashboards.users.behavior_subtitle', {}, 'Organization, project, and moderation signals')}
      data={behaviorSignals}
    />
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSCompositionBar
      title={t('admin_ui.dashboards.users.population_title', {}, 'Population mix')}
      subtitle={t('admin_ui.dashboards.users.population_subtitle', {}, 'User base ratio')}
      segments={populationMix}
    />
    <Card>
      <CardHeader>
        <CardTitle>{t('admin_ui.dashboards.users.quick_metrics', {}, 'Quick metrics')}</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-border bg-muted/20 p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">{t('admin_ui.dashboards.labels.projects_active', {}, 'Projects active')}</div>
          <div class="mt-2 text-2xl font-bold">{stats.projects.active}</div>
        </div>
        <div class="rounded-lg border border-border bg-muted/20 p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">{t('admin_ui.dashboards.labels.projects_done', {}, 'Projects done')}</div>
          <div class="mt-2 text-2xl font-bold">{stats.projects.completed}</div>
        </div>
        <div class="rounded-lg border border-border bg-muted/20 p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">{t('admin_ui.dashboards.labels.tasks_in_progress', {}, 'Tasks in progress')}</div>
          <div class="mt-2 text-2xl font-bold">{stats.tasks.in_progress}</div>
        </div>
        <div class="rounded-lg border border-border bg-muted/20 p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">{t('admin_ui.dashboards.labels.tasks_done', {}, 'Tasks done')}</div>
          <div class="mt-2 text-2xl font-bold">{stats.tasks.completed}</div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
