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

  const systemScale = $derived([
    { label: 'Users', value: stats.users.total, role: 'actual' as const },
    { label: 'Orgs', value: stats.organizations.total, role: 'plan' as const },
    { label: 'Projects', value: stats.projects.total, role: 'highlight' as const },
    { label: 'Tasks', value: stats.tasks.total, role: 'neutral' as const },
  ])

  const executionFlow = $derived([
    { label: 'Projects Done', value: stats.projects.completed, role: 'actual' as const },
    { label: 'Projects Active', value: stats.projects.active, role: 'highlight' as const },
    { label: 'Tasks Done', value: stats.tasks.completed, role: 'positive' as const },
    { label: 'Tasks WIP', value: stats.tasks.in_progress, role: 'risk' as const },
  ])

  const userHealth = $derived([
    { label: 'Active', value: stats.users.active, role: 'actual' as const },
    { label: 'Suspended', value: stats.users.suspended, role: 'risk' as const },
    { label: 'New Month', value: stats.users.new_this_month, role: 'highlight' as const },
  ])

  const subscriptionMix = $derived([
    { label: 'Pro', value: stats.subscriptions.pro, role: 'highlight' as const },
    { label: 'ProMax', value: stats.subscriptions.promax, role: 'actual' as const },
    {
      label: 'Other Active',
      value: Math.max(0, stats.subscriptions.active - stats.subscriptions.pro - stats.subscriptions.promax),
      role: 'plan' as const,
    },
  ])

  const riskSignals = $derived([
    { label: 'Flagged Reviews', value: stats.moderation.pending_flagged_reviews, role: 'risk' as const },
    { label: 'Expiring Subs', value: stats.subscriptions.expiring_soon, role: 'neutral' as const },
  ])
</script>

<svelte:head>
  <title>Admin Dashboard - Tổng quan</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="neo-kicker">Admin / Overview</p>
      <h1 class="text-4xl font-bold tracking-tight">Bảng điều khiển hệ thống</h1>
      <p class="mt-2 max-w-3xl text-sm text-muted-foreground">Tổng quan nhanh toàn nền tảng với biểu đồ ngắn gọn để nhận diện tín hiệu vận hành.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <a href="/admin/dashboards/users" class="neo-surface-soft px-3 py-2 text-sm font-bold">Dashboard người dùng</a>
      <a href="/admin/dashboards/operations" class="neo-surface-soft px-3 py-2 text-sm font-bold">Dashboard vận hành</a>
      <a href="/admin/dashboards/subscriptions" class="neo-surface-soft px-3 py-2 text-sm font-bold">Dashboard gói đăng ký</a>
      <a href="/admin/permissions" class="neo-surface-soft px-3 py-2 text-sm font-bold">Vai trò và quyền</a>
      <a href="/admin/qr-codes" class="neo-surface-soft px-3 py-2 text-sm font-bold">QR gói cá nhân</a>
      <a href="/admin/audit-logs" class="neo-surface-soft px-3 py-2 text-sm font-bold">Audit log</a>
    </div>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSColumnChart
      title="System scale"
      subtitle="Cung thang đo chung để so tổng quy mô nền tảng"
      data={systemScale}
    />
    <IBCSColumnChart
      title="Execution flow"
      subtitle="So sánh khối lượng hoàn thành và đang xử lý"
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
      subtitle="Biểu đồ cảnh báo cần xử lý ngay trong vận hành"
      data={riskSignals}
    />
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <IBCSCompositionBar
      title="Subscription mix"
      subtitle="Cơ cấu active subscriptions theo plan"
      segments={subscriptionMix}
    />
    <div class="neo-surface-soft p-4">
      <h3 class="neo-kicker">IBCS notation</h3>
      <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
        <li><span class="font-semibold text-foreground">Dark gray</span>: Actual</li>
        <li><span class="font-semibold text-foreground">Light gray</span>: Baseline/plan</li>
        <li><span class="font-semibold neo-text-blue">Blue</span>: Focus item</li>
        <li><span class="font-semibold neo-text-orange">Orange red</span>: Adverse/risk</li>
      </ul>
      <a href="/admin/reviews" class="mt-4 inline-flex text-sm font-bold neo-text-blue hover:underline">Mở moderation queue</a>
      <div class="mt-4 flex flex-wrap gap-2">
        <a href="/admin/permissions" class="text-sm font-bold neo-text-blue hover:underline">Xem permission matrix</a>
        <a href="/admin/qr-codes" class="text-sm font-bold neo-text-blue hover:underline">Mở QR gói cá nhân</a>
      </div>
    </div>
  </div>
</div>
