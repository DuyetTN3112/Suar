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
  import { ChevronLeft, ChevronRight, Inbox } from 'lucide-svelte'
  import {
    APPLICATION_FILTER_OPTIONS,
    APPLICATION_STATUSES,
    APPLICATION_STATUS_BADGE_VARIANTS,
    APPLICATION_STATUS_LABELS,
    FILTER_VALUES,
    FRONTEND_ROUTES,
    getApplicationWithdrawRoute,
    getTaskDetailRoute,
    type ApplicationFilterValue,
    type ApplicationStatus,
  } from '@/constants'

  interface Application {
    id: string
    task_id: string
    task?: { id: string; title: string; status: string }
    status: ApplicationStatus
    cover_letter?: string
    proposed_budget?: number
    estimated_duration?: number
    created_at: string
    updated_at: string
  }

  interface Props {
    applications: Application[]
    meta: { total: number; per_page: number; current_page: number; last_page: number }
    statusFilter: string
  }

  const { applications, meta, statusFilter }: Props = $props()

  let activeFilter = $state<ApplicationFilterValue>(FILTER_VALUES.ALL)
  let withdrawing = $state<string | null>(null)

  $effect(() => {
    const normalizedStatusFilter = statusFilter.trim()
    activeFilter = normalizedStatusFilter
      ? (normalizedStatusFilter as ApplicationFilterValue)
      : FILTER_VALUES.ALL
  })

  const statusFilters = APPLICATION_FILTER_OPTIONS

  function statusBadgeVariant(status: ApplicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    return APPLICATION_STATUS_BADGE_VARIANTS[status]
  }

  function statusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status]
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  function handleFilterChange(filter: ApplicationFilterValue) {
    activeFilter = filter
    router.visit(`${FRONTEND_ROUTES.MY_APPLICATIONS}${filter !== FILTER_VALUES.ALL ? `?status=${filter}` : ''}`, {
      preserveState: true,
    })
  }

  async function handleWithdraw(id: string) {
    const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (!csrfToken) {
      notificationStore.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.')
      return
    }

    withdrawing = id

    try {
      const response = await fetch(getApplicationWithdrawRoute(id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
      })

      const payloadUnknown: unknown = await response.json()
      const payload =
        typeof payloadUnknown === 'object' && payloadUnknown !== null
          ? (payloadUnknown as { success?: boolean; message?: string })
          : {}

      if (payload.success) {
        notificationStore.success(payload.message || 'Đã rút đơn ứng tuyển thành công')
        router.reload()
      } else {
        notificationStore.error(payload.message || 'Không thể rút đơn ứng tuyển')
      }
    } catch (error) {
      console.error('Lỗi khi rút đơn:', error)
      notificationStore.error('Đã xảy ra lỗi khi xử lý yêu cầu')
    } finally {
      withdrawing = null
    }
  }

  function goToPage(page: number) {
    const params = new URLSearchParams()
    if (activeFilter !== FILTER_VALUES.ALL) params.set('status', activeFilter)
    params.set('page', String(page))
    router.visit(`${FRONTEND_ROUTES.MY_APPLICATIONS}?${params.toString()}`, { preserveState: true })
  }
</script>

<svelte:head>
  <title>Đơn ứng tuyển của tôi</title>
</svelte:head>

<AppLayout title="Đơn ứng tuyển của tôi">
  <div class="p-4 sm:p-6 space-y-4">
    <div>
      <h1 class="text-2xl font-bold">Đơn ứng tuyển của tôi</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Theo dõi trạng thái các đơn đã gửi từ Marketplace và rút đơn khi task vẫn đang chờ xử lý.
      </p>
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

    {#if applications.length === 0}
      <Card class="border-2 shadow-neo">
        <CardContent class="flex flex-col items-center justify-center py-12">
          <Inbox class="h-12 w-12 text-muted-foreground mb-3" />
          <p class="text-muted-foreground font-bold">Bạn chưa có đơn ứng tuyển nào</p>
          <Button class="mt-4 font-bold" onclick={() => { router.visit(FRONTEND_ROUTES.MARKETPLACE_TASKS); }}>
            Khám phá nhiệm vụ
          </Button>
        </CardContent>
      </Card>
    {:else}
      <Card class="border-2 shadow-neo">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="font-bold">Nhiệm vụ</TableHead>
              <TableHead class="font-bold">Trạng thái</TableHead>
              <TableHead class="font-bold">Ngân sách đề xuất</TableHead>
              <TableHead class="font-bold">Ngày gửi</TableHead>
              <TableHead class="font-bold text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each applications as app (app.id)}
              <TableRow>
                <TableCell>
                  {#if app.task}
                    <a href={getTaskDetailRoute(app.task.id)} class="font-bold hover:underline">
                      {app.task.title}
                    </a>
                  {:else}
                    <span class="text-muted-foreground">Nhiệm vụ #{app.task_id}</span>
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
                <TableCell>{formatDate(app.created_at)}</TableCell>
                <TableCell class="text-right">
                  {#if app.status === APPLICATION_STATUSES.PENDING}
                    <Button
                      variant="outline"
                      size="sm"
                      class="font-bold text-destructive hover:text-destructive"
                      onclick={() => handleWithdraw(app.id)}
                      disabled={withdrawing === app.id}
                    >
                      {withdrawing === app.id ? 'Đang rút...' : 'Rút đơn'}
                    </Button>
                  {/if}
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </Card>

      <!-- Pagination -->
      {#if meta.last_page > 1}
        <div class="flex justify-center items-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            class="h-8 font-bold"
            onclick={() => { goToPage(meta.current_page - 1); }}
            disabled={meta.current_page === 1}
          >
            <ChevronLeft class="h-4 w-4 mr-1" />
            Trước
          </Button>
          <span class="text-sm font-bold">{meta.current_page} / {meta.last_page}</span>
          <Button
            variant="outline"
            size="sm"
            class="h-8 font-bold"
            onclick={() => { goToPage(meta.current_page + 1); }}
            disabled={meta.current_page === meta.last_page}
          >
            Sau
            <ChevronRight class="h-4 w-4 ml-1" />
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</AppLayout>
