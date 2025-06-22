<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'

  interface Stats {
    members: {
      total: number
      by_role: {
        org_owner: number
        org_admin: number
        org_member: number
      }
      pending_invitations: number
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
      overdue: number
    }
  }

  interface Props {
    stats: Stats
  }

  const { stats }: Props = $props()
</script>

<OrganizationLayout title="Điều phối tổ chức">
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Điều phối tổ chức</h1>
      <p class="mt-1 text-slate-600">Tổng quan nhanh về team, dự án, task và các flow quản trị đang hoạt động trong tổ chức hiện tại.</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Thành viên</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.members.total.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            {stats.members.pending_invitations} lời mời đang chờ
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
            {stats.projects.total.toLocaleString()} dự án tổng cộng
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Task đang làm</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.tasks.in_progress.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            {stats.tasks.total.toLocaleString()} task tổng cộng
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Task quá hạn</CardTitle>
          <svg class="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-red-600">{stats.tasks.overdue.toLocaleString()}</div>
          <p class="text-xs text-red-600 mt-1">Cần ưu tiên xử lý</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Cấu trúc đội ngũ</CardTitle>
        <CardDescription>Phân bổ thành viên theo vai trò</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Owners</p>
            <p class="text-xs text-slate-500">Chủ tổ chức</p>
            <p class="text-2xl font-bold">{stats.members.by_role.org_owner}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Admins</p>
            <p class="text-xs text-slate-500">Quản trị viên</p>
            <p class="text-2xl font-bold">{stats.members.by_role.org_admin}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Members</p>
            <p class="text-xs text-slate-500">Thành viên</p>
            <p class="text-2xl font-bold">{stats.members.by_role.org_member}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tiến độ task</CardTitle>
          <CardDescription>Phân bố task theo trạng thái xử lý</CardDescription>
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
            <span class="text-sm text-slate-600">Hoàn thành</span>
            <span class="font-semibold text-green-600">{stats.tasks.completed.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Quá hạn</span>
            <span class="font-semibold text-red-600">{stats.tasks.overdue.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tổng quan dự án</CardTitle>
          <CardDescription>Các chỉ số chính của dự án trong tổ chức</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Tổng dự án</span>
            <span class="font-semibold">{stats.projects.total.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Đang chạy</span>
            <span class="font-semibold text-blue-600">{stats.projects.active.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Hoàn thành</span>
            <span class="font-semibold text-green-600">{stats.projects.completed.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Đi tắt quản trị</CardTitle>
        <CardDescription>Mở nhanh các flow admin quan trọng thay vì đi vòng qua namespace legacy.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-3">
        <Link href="/org/members">
          <Button variant="outline">Quản lý thành viên</Button>
        </Link>
        <Link href="/org/invitations/invitations">
          <Button variant="outline">Mời thành viên</Button>
        </Link>
        <Link href="/org/invitations/requests">
          <Button variant="outline">Duyệt yêu cầu tham gia</Button>
        </Link>
        <Link href="/org/workflow/statuses">
          <Button variant="outline">Tùy biến workflow</Button>
        </Link>
        <Link href="/org/projects">
          <Button variant="outline">Mở danh sách dự án</Button>
        </Link>
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
