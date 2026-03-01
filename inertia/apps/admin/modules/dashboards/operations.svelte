<script lang="ts">
  import IBCSColumnChart from '@/apps/admin/shared/components/charts/ibcs_column_chart.svelte'
  import IBCSCompositionBar from '@/apps/admin/shared/components/charts/ibcs_composition_bar.svelte'
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
  const pageTitle = $derived(t('admin_ui.dashboards.operations.page_title', {}, 'Admin Dashboard - Operations'))

  const projectExecution = $derived([
    { label: t('admin_ui.dashboards.labels.completed', {}, 'Completed'), value: stats.projects.completed, role: 'actual' as const },
    { label: t('admin_ui.dashboards.labels.active', {}, 'Active'), value: stats.projects.active, role: 'highlight' as const },
    {
      label: t('admin_ui.dashboards.labels.other', {}, 'Other'),
      value: Math.max(0, stats.projects.total - stats.projects.completed - stats.projects.active),
      role: 'plan' as const,
    },
  ])

  const taskExecution = $derived([
    { label: t('admin_ui.dashboards.labels.completed', {}, 'Completed'), value: stats.tasks.completed, role: 'positive' as const },
    { label: t('admin_ui.dashboards.labels.in_progress', {}, 'In Progress'), value: stats.tasks.in_progress, role: 'risk' as const },
    {
      label: t('admin_ui.dashboards.labels.other', {}, 'Other'),
      value: Math.max(0, stats.tasks.total - stats.tasks.completed - stats.tasks.in_progress),
      role: 'plan' as const,
    },
  ])

  const operationsLoad = $derived([
    { label: t('admin_ui.dashboards.labels.organizations', {}, 'Organizations'), value: stats.organizations.total, role: 'actual' as const },
    { label: t('admin_ui.dashboards.labels.new_organizations', {}, 'New Organizations'), value: stats.organizations.new_this_month, role: 'highlight' as const },
    { label: t('admin_ui.dashboards.labels.projects_active', {}, 'Active Projects'), value: stats.projects.active, role: 'neutral' as const },
    { label: t('admin_ui.dashboards.labels.tasks_wip', {}, 'Tasks WIP'), value: stats.tasks.in_progress, role: 'risk' as const },
  ])
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('admin_ui.dashboards.operations.eyebrow', {}, 'Admin / Operations Dashboard')}</p>
    <h1 class="text-4xl font-bold tracking-tight">{t('admin_ui.dashboards.operations.title', {}, 'Operations dashboard')}</h1>
  </div>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title={t('admin_ui.dashboards.operations.project_execution_title', {}, 'Project execution')}
      subtitle={t('admin_ui.dashboards.operations.project_execution_subtitle', {}, 'Compare completed output with work currently in progress')}
      data={projectExecution}
    />
    <IBCSColumnChart
      title={t('admin_ui.dashboards.operations.task_execution_title', {}, 'Task execution')}
      subtitle={t('admin_ui.dashboards.operations.task_execution_subtitle', {}, 'Track operational bottlenecks by task status')}
      data={taskExecution}
    />
  </section>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title={t('admin_ui.dashboards.operations.operational_load_title', {}, 'Operational load')}
      subtitle={t('admin_ui.dashboards.operations.operational_load_subtitle', {}, 'Combined context for monitoring operational load')}
      data={operationsLoad}
    />
    <IBCSCompositionBar
      title={t('admin_ui.dashboards.operations.task_portfolio_title', {}, 'Task portfolio')}
      subtitle={t('admin_ui.dashboards.operations.task_portfolio_subtitle', {}, 'Task workload distribution by status')}
      segments={taskExecution}
    />
  </section>
</div>
