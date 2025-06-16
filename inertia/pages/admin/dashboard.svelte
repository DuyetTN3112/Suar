<script lang="ts">
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
  }

  interface Props {
    stats: Stats
  }

  let { stats }: Props = $props()
</script>

<AdminLayout title="System Admin Dashboard">
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-slate-600 mt-1">System-wide overview and statistics</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Total Users -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Users</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            {stats.users.active.toLocaleString()} active, {stats.users.suspended.toLocaleString()} suspended
          </p>
        </CardContent>
      </Card>

      <!-- New Users This Month -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">New This Month</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">+{stats.users.new_this_month.toLocaleString()}</div>
          <p class="text-xs text-green-600 mt-1">New user registrations</p>
        </CardContent>
      </Card>

      <!-- Total Organizations -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Organizations</CardTitle>
          <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{stats.organizations.total.toLocaleString()}</div>
          <p class="text-xs text-slate-600 mt-1">
            +{stats.organizations.new_this_month} this month
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
            {stats.projects.total.toLocaleString()} total
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Organization Plans Breakdown -->
    <Card>
      <CardHeader>
        <CardTitle>Organizations by Plan</CardTitle>
        <CardDescription>Distribution across subscription tiers</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 md:grid-cols-4">
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Free</p>
            <p class="text-2xl font-bold">{stats.organizations.by_plan.free}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Starter</p>
            <p class="text-2xl font-bold">{stats.organizations.by_plan.starter}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Professional</p>
            <p class="text-2xl font-bold">{stats.organizations.by_plan.professional}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-slate-600">Enterprise</p>
            <p class="text-2xl font-bold">{stats.organizations.by_plan.enterprise}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Tasks & Projects Overview -->
    <div class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Task Statistics</CardTitle>
          <CardDescription>Platform-wide task metrics</CardDescription>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Statistics</CardTitle>
          <CardDescription>Platform-wide project metrics</CardDescription>
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
</AdminLayout>
