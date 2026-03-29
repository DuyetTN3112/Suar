<script lang="ts">
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

  interface Stats {
    users: {
      total: number
      active: number
      suspended: number
      new_this_month: number
    }
    organizations: {
      total: number
      by_plan: {
        free: number
        starter: number
        professional: number
        enterprise: number
      }
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
</script>

<AdminLayout title="System Admin Dashboard">
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Bảng điều khiển hệ thống</h1>
      <p class="text-slate-600 mt-1">Tổng quan nhanh về người dùng, tổ chức, dự án và task trên toàn nền tảng.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Tổng người dùng</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            {stats.users.active.toLocaleString()} đang hoạt động, {stats.users.suspended.toLocaleString()} tạm khóa
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Người dùng mới tháng này</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">+{stats.users.new_this_month.toLocaleString()}</div>
          <p class="text-xs text-green-600 mt-1">Đăng ký mới trong tháng hiện tại</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Tổ chức</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.organizations.total.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            +{stats.organizations.new_this_month} tổ chức mới trong tháng
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Dự án đang chạy</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.projects.active.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            {stats.projects.total.toLocaleString()} dự án toàn hệ thống
          </p>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Thống kê task</CardTitle>
          <CardDescription>Các chỉ số chính của toàn bộ task trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Tổng task</span>
            <span class="font-semibold">{stats.tasks.total.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Đang thực hiện</span>
            <span class="font-semibold text-blue-600">{stats.tasks.in_progress.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Đã hoàn thành</span>
            <span class="font-semibold text-green-600">{stats.tasks.completed.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription & Package</CardTitle>
          <CardDescription>Dữ liệu gói user-level để test màn package management</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Active subscriptions</span>
            <span class="font-semibold text-slate-900">{stats.subscriptions.active}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Pro</span>
            <span class="font-semibold text-slate-900">{stats.subscriptions.pro}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">ProMax</span>
            <span class="font-semibold text-slate-900">{stats.subscriptions.promax}</span>
          </div>
          <div class="rounded-lg border border-dashed p-3 text-sm text-slate-600">
            Sắp hết hạn: <span class="font-semibold text-slate-900">{stats.subscriptions.expiring_soon}</span><br />
            Tổng subscription: <span class="font-semibold text-slate-900">{stats.subscriptions.total}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
          <CardDescription>Những điểm admin cần chú ý ngay</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Flagged reviews pending</span>
            <span class="font-semibold text-red-600">{stats.moderation.pending_flagged_reviews}</span>
          </div>
          <p class="text-sm text-slate-700">
            Subscription công khai hiện đang thuộc về <span class="font-semibold">user account</span>, không phải gói public cho organization.
          </p>
          <div class="rounded-lg border border-dashed p-3 text-sm text-slate-600">
            Tổ chức mới trong tháng: <span class="font-semibold text-slate-900">{stats.organizations.new_this_month}</span><br />
            Dự án hoàn thành: <span class="font-semibold text-slate-900">{stats.projects.completed.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</AdminLayout>
