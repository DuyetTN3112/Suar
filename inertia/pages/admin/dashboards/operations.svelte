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

  const projectExecution = $derived([
    { label: 'Completed', value: stats.projects.completed, role: 'actual' as const },
    { label: 'Active', value: stats.projects.active, role: 'highlight' as const },
    {
      label: 'Other',
      value: Math.max(0, stats.projects.total - stats.projects.completed - stats.projects.active),
      role: 'plan' as const,
    },
  ])

  const taskExecution = $derived([
    { label: 'Completed', value: stats.tasks.completed, role: 'positive' as const },
    { label: 'In Progress', value: stats.tasks.in_progress, role: 'risk' as const },
    {
      label: 'Other',
      value: Math.max(0, stats.tasks.total - stats.tasks.completed - stats.tasks.in_progress),
      role: 'plan' as const,
    },
  ])

  const operationsLoad = $derived([
    { label: 'Organizations', value: stats.organizations.total, role: 'actual' as const },
    { label: 'New Orgs', value: stats.organizations.new_this_month, role: 'highlight' as const },
    { label: 'Active Projects', value: stats.projects.active, role: 'neutral' as const },
    { label: 'Tasks WIP', value: stats.tasks.in_progress, role: 'risk' as const },
  ])
</script>

<svelte:head>
  <title>Admin Dashboard - Vận hành</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <p class="neo-kicker">Admin / Operations Dashboard</p>
    <h1 class="text-4xl font-bold tracking-tight">Dashboard vận hành</h1>
    <p class="mt-2 text-sm text-muted-foreground">Theo dõi trạng thái tổ chức, dự án và task theo góc nhìn execution.</p>
  </div>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title="Project execution"
      subtitle="So sanh output da hoan thanh voi khoi luong dang xu ly"
      data={projectExecution}
    />
    <IBCSColumnChart
      title="Task execution"
      subtitle="Do do nghen van hanh theo task status"
      data={taskExecution}
    />
  </section>

  <section class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title="Operational load"
      subtitle="Bo canh tong hop de soat tai trong van hanh"
      data={operationsLoad}
    />
    <IBCSCompositionBar
      title="Task portfolio"
      subtitle="Co cau khoi luong task theo trang thai"
      segments={taskExecution}
    />
  </section>
</div>
