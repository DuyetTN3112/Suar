<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'

  interface DisputeQueueItem {
    id: string
    task_title: string | null
    reviewee_username: string | null
    status: string
    latest_case_version: number | null
    ai_evaluations_count: number
    created_at: string
  }

  interface ProviderMetric {
    provider: string
    total: number
    active: number
    completed: number
    failed: number
  }

  interface Props {
    disputes: DisputeQueueItem[]
    filters: {
      search: string | null
      status: string | null
    }
    aiMetrics: {
      totalEvaluations: number
      activeEvaluations: number
      completedEvaluations: number
      failedEvaluations: number
      queuedDisputes: number
      providers: ProviderMetric[]
    }
  }

  const { disputes, filters, aiMetrics }: Props = $props()

  let search = $state('')
  let status = $state('all')

  $effect(() => {
    search = filters.search ?? ''
    status = filters.status ?? 'all'
  })

  function applyFilters() {
    router.get(
      '/admin/disputes/ai-operator',
      {
        search: search.trim() || undefined,
        status: status === 'all' ? undefined : status,
      },
      { preserveState: true }
    )
  }
</script>

<svelte:head>
  <title>AI Dispute Operator Console</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between gap-3">
    <div>
      <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Admin / Disputes / AI</p>
      <h1 class="text-4xl font-bold tracking-tight">AI Dispute Operator Console</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Màn riêng cho queue AI, tình trạng provider, và điều hướng nhanh về dispute detail.
      </p>
    </div>
    <div class="flex gap-2">
      <Link href="/admin/disputes">
        <Button variant="outline">Dispute list</Button>
      </Link>
      <Link href="/admin">
        <Button variant="outline">Dashboard</Button>
      </Link>
    </div>
  </div>

  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
    <Card>
      <CardHeader>
        <CardDescription>Queue cần thao tác</CardDescription>
        <CardTitle>{aiMetrics.queuedDisputes}</CardTitle>
      </CardHeader>
    </Card>
    <Card>
      <CardHeader>
        <CardDescription>Total AI runs</CardDescription>
        <CardTitle>{aiMetrics.totalEvaluations}</CardTitle>
      </CardHeader>
    </Card>
    <Card>
      <CardHeader>
        <CardDescription>Active</CardDescription>
        <CardTitle>{aiMetrics.activeEvaluations}</CardTitle>
      </CardHeader>
    </Card>
    <Card>
      <CardHeader>
        <CardDescription>Completed</CardDescription>
        <CardTitle>{aiMetrics.completedEvaluations}</CardTitle>
      </CardHeader>
    </Card>
    <Card>
      <CardHeader>
        <CardDescription>Failed / Cancelled</CardDescription>
        <CardTitle>{aiMetrics.failedEvaluations}</CardTitle>
      </CardHeader>
    </Card>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Bộ lọc queue</CardTitle>
      <CardDescription>Lọc nhanh theo dispute status hoặc keyword.</CardDescription>
    </CardHeader>
    <CardContent>
      <form onsubmit={(event) => { event.preventDefault(); applyFilters() }} class="flex flex-wrap items-end gap-4">
        <div class="min-w-[240px] flex-1 space-y-2">
          <Input bind:value={search} placeholder="Task title, user, dispute reason..." />
        </div>
        <div class="w-[220px] space-y-2">
          <select
            bind:value={status}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="admin_reviewing">admin_reviewing</option>
            <option value="ai_reviewing">ai_reviewing</option>
            <option value="pending">pending</option>
            <option value="resolved">resolved</option>
          </select>
        </div>
        <Button type="submit">Áp dụng</Button>
      </form>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Theo provider</CardTitle>
      <CardDescription>Phân bổ AI runs theo provider hiện có trong dispute pipeline.</CardDescription>
    </CardHeader>
    <CardContent>
      {#if aiMetrics.providers.length === 0}
        <p class="text-sm text-muted-foreground">Chưa có AI evaluation nào.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Total</th>
                <th>Active</th>
                <th>Completed</th>
                <th>Failed</th>
              </tr>
            </thead>
            <tbody>
              {#each aiMetrics.providers as provider (provider.provider)}
                <tr>
                  <td class="font-medium">{provider.provider}</td>
                  <td>{provider.total}</td>
                  <td>{provider.active}</td>
                  <td>{provider.completed}</td>
                  <td>{provider.failed}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Queue tranh chấp</CardTitle>
      <CardDescription>
        Các dispute có case file hoặc AI activity để operator drill-down nhanh.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {#if disputes.length === 0}
        <p class="text-sm text-muted-foreground">Không có dispute nào trong queue hiện tại.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th>Task</th>
                <th>User</th>
                <th>Status</th>
                <th>Case file</th>
                <th>AI runs</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each disputes as dispute (dispute.id)}
                <tr>
                  <td class="font-medium">{dispute.task_title ?? 'Unknown task'}</td>
                  <td>{dispute.reviewee_username ?? 'Unknown user'}</td>
                  <td>
                    <Badge variant="outline">{dispute.status}</Badge>
                  </td>
                  <td>v{dispute.latest_case_version ?? 0}</td>
                  <td>{dispute.ai_evaluations_count}</td>
                  <td>{new Date(dispute.created_at).toLocaleDateString('vi-VN')}</td>
                  <td class="text-right">
                    <Link href={`/admin/disputes/${dispute.id}`}>
                      <Button variant="outline" size="sm">Open</Button>
                    </Link>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
