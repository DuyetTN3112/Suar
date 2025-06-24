<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Button from '@/components/ui/button.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import { router } from '@inertiajs/svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import { ArrowLeft, ChevronLeft, ChevronRight, Inbox, Check, X } from 'lucide-svelte'

  interface ApplicationUser {
    id: string
    username: string
    email: string
  }

  interface Application {
    id: string
    user?: ApplicationUser
    status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
    cover_letter?: string
    proposed_budget?: number
    estimated_duration?: number
    created_at: string
  }

  interface Props {
    taskId: string
    applications: Application[]
    meta: { total: number; per_page: number; current_page: number; last_page: number }
    statusFilter: string
  }

  const props: Props = $props()

  let activeFilter = $state('all')
  let processing = $state<string | null>(null)

  $effect(() => {
    activeFilter = props.statusFilter || 'all'
  })

  const statusFilters = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'rejected', label: 'Từ chối' },
    { value: 'withdrawn', label: 'Đã rút' },
  ]

  function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'approved': return 'default'
      case 'pending': return 'secondary'
      case 'rejected': return 'destructive'
      case 'withdrawn': return 'outline'
      default: return 'outline'
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Chờ duyệt'
      case 'approved': return 'Đã duyệt'
      case 'rejected': return 'Từ chối'
      case 'withdrawn': return 'Đã rút'
      default: return status
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  function handleFilterChange(filter: string) {
    activeFilter = filter
    router.visit(`/tasks/${props.taskId}/applications${filter !== 'all' ? `?status=${filter}` : ''}`, {
      preserveState: true,
    })
  }

  async function handleProcess(appId: string, action: 'approve' | 'reject') {
    const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (!csrfToken) {
      notificationStore.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.')
      return
    }

    processing = appId

    try {
      const response = await fetch(`/tasks/${props.taskId}/applications/${appId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ action }),
        credentials: 'same-origin',
      })

      const data = (await response.json()) as { success?: boolean; message?: string }
      if (data.success) {
        notificationStore.success(
          data.message || (action === 'approve' ? 'Đã duyệt đơn ứng tuyển' : 'Đã từ chối đơn ứng tuyển')
        )
        router.reload()
      } else {
        notificationStore.error(data.message || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Lỗi khi xử lý đơn:', error)
      notificationStore.error('Đã xảy ra lỗi khi xử lý yêu cầu')
    } finally {
      processing = null
    }
  }

  function goToPage(page: number) {
    const params = new URLSearchParams()
    if (activeFilter !== 'all') params.set('status', activeFilter)
    params.set('page', String(page))
    router.visit(`/tasks/${props.taskId}/applications?${params.toString()}`, { preserveState: true })
  }
</script>

<svelte:head>
  <title>Đơn ứng tuyển</title>
</svelte:head>

<AppLayout title="Đơn ứng tuyển">
  <div class="p-4 sm:p-6 space-y-4">
    <!-- Header with back button -->
    <div class="flex items-center gap-3">
      <Button variant="outline" size="sm" class="font-bold" onclick={() => { router.visit(`/tasks/${props.taskId}`); }}>
        <ArrowLeft class="h-4 w-4 mr-1" />
        Quay lại
      </Button>
      <h1 class="text-2xl font-bold">Đơn ứng tuyển</h1>
    </div>

    <!-- Status filters -->
    <div class="flex gap-2 flex-wrap">
      {#each statusFilters as filter (filter.value)}
        <Button
          variant={activeFilter === filter.value ? 'default' : 'outline'}
          size="sm"
          class="font-bold"
          onclick={() => { handleFilterChange(filter.value); }}
        >
          {filter.label}
        </Button>
      {/each}
    </div>

    {#if props.applications.length === 0}
      <Card class="border-2 shadow-neo">
        <CardContent class="flex flex-col items-center justify-center py-12">
          <Inbox class="h-12 w-12 text-muted-foreground mb-3" />
          <p class="text-muted-foreground font-bold">Chưa có đơn ứng tuyển nào</p>
        </CardContent>
      </Card>
    {:else}
      <Card class="border-2 shadow-neo">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="font-bold">Ứng viên</TableHead>
              <TableHead class="font-bold">Trạng thái</TableHead>
              <TableHead class="font-bold">Ngân sách đề xuất</TableHead>
              <TableHead class="font-bold">Thời gian ước tính</TableHead>
              <TableHead class="font-bold">Thư ứng tuyển</TableHead>
              <TableHead class="font-bold">Ngày gửi</TableHead>
              <TableHead class="font-bold text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each props.applications as app (app.id)}
              <TableRow>
                <TableCell>
                  {#if app.user}
                    <div>
                      <p class="font-bold">{app.user.username}</p>
                      <p class="text-xs text-muted-foreground">{app.user.email}</p>
                    </div>
                  {:else}
                    <span class="text-muted-foreground">Ẩn danh</span>
                  {/if}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(app.status)} class="font-bold">
                    {statusLabel(app.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {#if app.proposed_budget != null}
                    <span class="font-bold">{app.proposed_budget.toLocaleString('vi-VN')}đ</span>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </TableCell>
                <TableCell>
                  {#if app.estimated_duration != null}
                    <span>{app.estimated_duration} ngày</span>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </TableCell>
                <TableCell class="max-w-[200px]">
                  {#if app.cover_letter}
                    <p class="text-sm truncate" title={app.cover_letter}>{app.cover_letter}</p>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </TableCell>
                <TableCell>{formatDate(app.created_at)}</TableCell>
                <TableCell class="text-right">
                  {#if app.status === 'pending'}
                    <div class="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        class="h-7 font-bold"
                        onclick={() => handleProcess(app.id, 'approve')}
                        disabled={processing === app.id}
                      >
                        <Check class="h-3 w-3 mr-1" />
                        Duyệt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-7 font-bold text-destructive hover:text-destructive"
                        onclick={() => handleProcess(app.id, 'reject')}
                        disabled={processing === app.id}
                      >
                        <X class="h-3 w-3 mr-1" />
                        Từ chối
                      </Button>
                    </div>
                  {/if}
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </Card>

      <!-- Pagination -->
      {#if props.meta.last_page > 1}
        <div class="flex justify-center items-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            class="h-8 font-bold"
            onclick={() => { goToPage(props.meta.current_page - 1); }}
            disabled={props.meta.current_page === 1}
          >
            <ChevronLeft class="h-4 w-4 mr-1" />
            Trước
          </Button>
          <span class="text-sm font-bold">{props.meta.current_page} / {props.meta.last_page}</span>
          <Button
            variant="outline"
            size="sm"
            class="h-8 font-bold"
            onclick={() => { goToPage(props.meta.current_page + 1); }}
            disabled={props.meta.current_page === props.meta.last_page}
          >
            Sau
            <ChevronRight class="h-4 w-4 ml-1" />
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</AppLayout>
