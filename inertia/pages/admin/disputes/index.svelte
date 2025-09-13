<script lang="ts">
  import { router, Link } from '@inertiajs/svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'

  interface Dispute {
    id: string
    review_session_id: string
    task_id: string
    task_title: string | null
    reviewee_id: string
    reviewee_username: string | null
    reviewee_email: string | null
    status: string
    dispute_reason: string
    requested_outcome: string
    created_at: string
  }

  interface Props {
    disputes: Dispute[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      status: string | null
      search: string | null
    }
  }

  const { disputes, meta, filters }: Props = $props()

  let search = $state('')
  let status = $state('all')

  $effect(() => {
    search = filters.search ?? ''
    status = filters.status ?? 'all'
  })

  function handleFilter() {
    router.get(
      '/admin/disputes',
      {
        search: search.trim() || undefined,
        status: status === 'all' ? undefined : status,
      },
      { preserveState: true }
    )
  }

  function handlePageChange(page: number) {
    router.get(
      '/admin/disputes',
      {
        page,
        search: search.trim() || undefined,
        status: status === 'all' ? undefined : status,
      },
      { preserveState: true }
    )
  }

  const statusMap: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } | undefined> = {
    pending: { label: 'Chờ xử lý', variant: 'secondary' },
    collecting_evidence: { label: 'Đang thu thập minh chứng', variant: 'outline' },
    admin_reviewing: { label: 'Admin đang xem xét', variant: 'default' },
    ai_reviewing: { label: 'AI đang phân tích', variant: 'outline' },
    resolved: { label: 'Đã giải quyết', variant: 'default' },
    rejected: { label: 'Bị từ chối', variant: 'destructive' },
    cancelled: { label: 'Đã hủy', variant: 'outline' },
  }
</script>

<svelte:head>
  <title>Admin - Khiếu nại review</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Admin / Disputes</p>
      <h1 class="text-4xl font-bold tracking-tight">Danh sách khiếu nại</h1>
      <p class="mt-2 text-sm text-muted-foreground">Xem xét và giải quyết các khiếu nại đánh giá năng lực từ người dùng.</p>
    </div>
    <Link href="/admin">
      <Button variant="outline">Quay lại dashboard</Button>
    </Link>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Bộ lọc khiếu nại</CardTitle>
      <CardDescription>Tìm kiếm theo tên người dùng, tên task hoặc lọc theo trạng thái khiếu nại</CardDescription>
    </CardHeader>
    <CardContent>
      <form onsubmit={(e) => { e.preventDefault(); handleFilter(); }} class="flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[240px] space-y-2">
          <Input
            type="text"
            bind:value={search}
            placeholder="Tìm kiếm theo tên, email, tiêu đề task..."
          />
        </div>
        <div class="w-[200px] space-y-2">
          <select
            bind:value={status}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="admin_reviewing">Admin đang xem xét</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="rejected">Bị từ chối</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
        <Button type="submit">Lọc kết quả</Button>
      </form>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Danh sách khiếu nại ({meta.total})</CardTitle>
      <CardDescription>Nhấp xem chi tiết để xây dựng hồ sơ, gọi AI hỗ trợ hoặc ra quyết định giải quyết</CardDescription>
    </CardHeader>
    <CardContent>
      {#if disputes.length === 0}
        <div class="flex items-center justify-center py-12">
          <div class="text-center max-w-md">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg class="h-8 w-8 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="mb-2 text-lg font-semibold text-foreground">Không tìm thấy khiếu nại</h3>
            <p class="text-muted-foreground">Hiện không có khiếu nại nào phù hợp với bộ lọc tìm kiếm.</p>
          </div>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th>Người khiếu nại</th>
                <th>Task liên quan</th>
                <th>Requested Outcome</th>
                <th>Trạng thái</th>
                <th>Thời điểm</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {#each disputes as dispute (dispute.id)}
                <tr class="text-sm">
                  <td>
                    <div class="font-medium">{dispute.reviewee_username ?? 'Không rõ'}</div>
                    <div class="text-xs text-muted-foreground">{dispute.reviewee_email ?? ''}</div>
                  </td>
                  <td>
                    <div class="font-medium max-w-xs truncate">{dispute.task_title ?? 'Task không rõ'}</div>
                    <div class="text-xs text-muted-foreground truncate max-w-xs">{dispute.dispute_reason}</div>
                  </td>
                  <td>
                    <Badge variant="outline">{dispute.requested_outcome}</Badge>
                  </td>
                  <td>
                    <Badge variant={statusMap[dispute.status]?.variant ?? 'outline'}>
                      {statusMap[dispute.status]?.label ?? dispute.status}
                    </Badge>
                  </td>
                  <td class="text-muted-foreground">{new Date(dispute.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <Link href="/admin/disputes/{dispute.id}">
                      <Button variant="outline" size="sm">Xem chi tiết</Button>
                    </Link>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if meta.lastPage > 1}
          <div class="flex items-center justify-between mt-4">
            <p class="text-xs text-muted-foreground">Trang {meta.currentPage} / {meta.lastPage}</p>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.currentPage === 1}
                onclick={() => { handlePageChange(meta.currentPage - 1); }}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.currentPage === meta.lastPage}
                onclick={() => { handlePageChange(meta.currentPage + 1); }}
              >
                Sau
              </Button>
            </div>
          </div>
        {/if}
      {/if}
    </CardContent>
  </Card>
</div>
