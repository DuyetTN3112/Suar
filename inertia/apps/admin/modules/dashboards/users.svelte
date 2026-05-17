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
  const pageTitle = $derived(t('task.admin_dashboard.users.page_title', {}, 'Admin - User dashboard'))

  const otherUsers = $derived(Math.max(0, stats.users.total - stats.users.active - stats.users.suspended))

  const userStatus = $derived([
    { label: 'Active', value: stats.users.active, role: 'actual' as const },
    { label: 'Suspended', value: stats.users.suspended, role: 'risk' as const },
    { label: 'New Month', value: stats.users.new_this_month, role: 'highlight' as const },
  ])

  const populationMix = $derived([
    { label: 'Active', value: stats.users.active, role: 'actual' as const },
    { label: 'Suspended', value: stats.users.suspended, role: 'risk' as const },
    { label: 'Other', value: otherUsers, role: 'plan' as const },
  ])

  const behaviorSignals = $derived([
    { label: 'Organizations', value: stats.organizations.total, role: 'plan' as const },
    { label: 'Projects Active', value: stats.projects.active, role: 'highlight' as const },
    { label: 'Moderation', value: stats.moderation.pending_flagged_reviews, role: 'risk' as const },
  ])
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="space-y-1">
      <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('task.admin_dashboard.users.eyebrow', {}, 'Admin / User Dashboard')}</p>
      <h1 class="text-4xl font-bold tracking-tight">{t('task.admin_dashboard.users.title', {}, 'User dashboard')}</h1>
    </div>

    <Card class="min-w-[220px]">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">New this month</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold text-orange">+{stats.users.new_this_month}</div>
      </CardContent>
    </Card>
  </div>

  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Total users</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.users.total}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Active</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.users.active}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Organizations</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.organizations.total}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Moderation</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.moderation.pending_flagged_reviews}</div></CardContent>
    </Card>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title="User status"
      subtitle={t('task.admin_dashboard.users.status_subtitle', {}, 'Account status')}
      data={userStatus}
    />
    <IBCSColumnChart
      title="Behavior signals"
      subtitle={t('task.admin_dashboard.users.behavior_subtitle', {}, 'Organization, project, and moderation signals')}
      data={behaviorSignals}
    />
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSCompositionBar
      title="Population mix"
      subtitle={t('task.admin_dashboard.users.population_subtitle', {}, 'User base ratio')}
      segments={populationMix}
    />
    <Card>
      <CardHeader>
        <CardTitle>{t('task.admin_dashboard.users.quick_metrics', {}, 'Quick metrics')}</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-border bg-muted/20 p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Projects active</div>
          <div class="mt-2 text-2xl font-bold">{stats.projects.active}</div>
        </div>
        <div class="rounded-lg border border-border bg-muted/20 p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Projects done</div>
          <div class="mt-2 text-2xl font-bold">{stats.projects.completed}</div>
        </div>
        <div class="rounded-lg border border-border bg-muted/20 p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Tasks in progress</div>
          <div class="mt-2 text-2xl font-bold">{stats.tasks.in_progress}</div>
        </div>
        <div class="rounded-lg border border-border bg-muted/20 p-3">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Tasks done</div>
          <div class="mt-2 text-2xl font-bold">{stats.tasks.completed}</div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
