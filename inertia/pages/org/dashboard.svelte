<script lang="ts">
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

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

  let { stats }: Props = $props()
</script>

<OrganizationLayout title="Organization Dashboard">
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-slate-600 mt-1">Organization overview and team performance</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Total Members -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Team Members</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.members.total.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            {stats.members.pending_invitations} pending invitations
          </p>
        </CardContent>
      </Card>

      <!-- Active Projects -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Active Projects</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.projects.active.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            {stats.projects.total.toLocaleString()} total projects
          </p>
        </CardContent>
      </Card>

      <!-- Tasks In Progress -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Tasks In Progress</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.tasks.in_progress.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            {stats.tasks.total.toLocaleString()} total tasks
          </p>
        </CardContent>
      </Card>

      <!-- Overdue Tasks -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Overdue Tasks</CardTitle>
          <svg class="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-red-600">{stats.tasks.overdue.toLocaleString()}</div>
          <p class="text-xs text-red-600 mt-1">Requires attention</p>
        </CardContent>
      </Card>
    </div>

    <!-- Team Breakdown -->
    <Card>
      <CardHeader>
        <CardTitle>Team Structure</CardTitle>
        <CardDescription>Members by role</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Owners</p>
            <p class="text-2xl font-bold">{stats.members.by_role.org_owner}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Admins</p>
            <p class="text-2xl font-bold">{stats.members.by_role.org_admin}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Members</p>
            <p class="text-2xl font-bold">{stats.members.by_role.org_member}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Task & Project Details -->
    <div class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Task Progress</CardTitle>
          <CardDescription>Team task completion status</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Total Tasks</span>
            <span class="font-semibold">{stats.tasks.total.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">In Progress</span>
            <span class="font-semibold text-blue-600">{stats.tasks.in_progress.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Completed</span>
            <span class="font-semibold text-green-600">{stats.tasks.completed.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Overdue</span>
            <span class="font-semibold text-red-600">{stats.tasks.overdue.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
          <CardDescription>Organization projects</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Total Projects</span>
            <span class="font-semibold">{stats.projects.total.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Active</span>
            <span class="font-semibold text-blue-600">{stats.projects.active.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">Completed</span>
            <span class="font-semibold text-green-600">{stats.projects.completed.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</OrganizationLayout>
