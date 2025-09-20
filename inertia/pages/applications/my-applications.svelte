<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { ChevronLeft, ChevronRight, Inbox } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import {
    APPLICATION_FILTER_OPTIONS,
    APPLICATION_STATUS_BADGE_VARIANTS,
    APPLICATION_STATUS_LABELS,
    FILTER_VALUES,
    FRONTEND_ROUTES,
    getApplicationWithdrawRoute,
    getTaskDetailRoute,
    type ApplicationFilterValue,
    type ApplicationStatus,
  } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'


  interface Application {
    id: string
    task_id: string
    task?: { id: string; title: string; status: string }
    status: ApplicationStatus
    cover_letter?: string
    estimated_duration?: number
    created_at: string
    updated_at: string
    organization_name?: string | null
    project_name?: string | null
    withdrawn_at?: string | null
    lifecycle_events?: { label: string }[]
    can_withdraw?: boolean
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    applications: Application[]
    meta: { total: number; per_page: number; current_page: number; last_page: number }
    statusFilter: string
  }

  const { applications, meta, statusFilter }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)

  let activeFilter = $state<ApplicationFilterValue>(FILTER_VALUES.ALL)
  let withdrawing = $state<string | null>(null)

  $effect(() => {
    const normalizedStatusFilter = statusFilter.trim()
    activeFilter = normalizedStatusFilter
      ? (normalizedStatusFilter as ApplicationFilterValue)
      : FILTER_VALUES.ALL
  })

  const statusFilters = APPLICATION_FILTER_OPTIONS

  function statusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status]
  }

  function statusBadgeVariant(status: ApplicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    return APPLICATION_STATUS_BADGE_VARIANTS[status]
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
        notificationStore.success(payload.message ?? 'Đã rút đơn ứng tuyển thành công')
        router.reload()
      } else {
        notificationStore.error(payload.message ?? 'Không thể rút đơn ứng tuyển')
      }
    } catch (error) {
      console.error('Lỗi khi rút đơn:', error)
      notificationStore.error('Đã xảy ra lỗi khi xử lý yêu cầu')
    } finally {
      withdrawing = null
    }
  }

  function goToPage(pageNumber: number) {
    const params = new URLSearchParams()
    if (activeFilter !== FILTER_VALUES.ALL) params.set('status', activeFilter)
    params.set('page', String(pageNumber))
    router.visit(`${FRONTEND_ROUTES.MY_APPLICATIONS}?${params.toString()}`, { preserveState: true })
  }
</script>

<svelte:head>
  <title>Đơn ứng tuyển của tôi</title>
</svelte:head>

<Layout title="Đơn ứng tuyển của tôi">
  <div class="min-w-0">
    <section class="bg-white border border-border rounded-2xl p-6 shadow-xs min-h-[540px]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="font-medium uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">User / Applications</div>
          <h1 class="text-3xl font-bold tracking-tight text-foreground mt-1">Đơn ứng tuyển của tôi</h1>
          <p class="text-base text-muted-foreground max-w-3xl mt-1">
            Theo dõi trạng thái các đơn đã gửi từ Marketplace và rút đơn khi task vẫn đang chờ xử lý.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
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
        <Card class="border-2 border-dashed shadow-none mt-6">
          <CardContent class="flex flex-col items-center justify-center py-12">
            <Inbox class="h-12 w-12 text-muted-foreground mb-3" />
            <h2 class="text-lg font-bold text-foreground mb-1" data-testid="empty-state">Bạn chưa có đơn ứng tuyển nào</h2>
            <p class="text-sm text-muted-foreground mb-4">Hãy bắt đầu khám phá các cơ hội và ứng tuyển trên Marketplace.</p>
            <Button class="font-bold" onclick={() => { router.visit(FRONTEND_ROUTES.MARKETPLACE_TASKS); }}>
              Khám phá nhiệm vụ
            </Button>
          </CardContent>
        </Card>
      {:else}
        <Card class="mt-6 border border-border shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="font-bold">Nhiệm vụ</TableHead>
                <TableHead class="font-bold">Trạng thái</TableHead>
                <TableHead class="font-bold">Ngày gửi</TableHead>
                <TableHead class="font-bold text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each applications as app (app.id)}
                <TableRow data-testid="application-row">
                  <TableCell>
                    {#if app.task}
                      <div>
                        <a href={getTaskDetailRoute(app.task.id)} class="font-bold hover:underline text-foreground">
                          {app.task.title}
                        </a>
                        {#if app.organization_name}
                          <p class="text-xs text-muted-foreground mt-0.5">{app.organization_name}</p>
                        {/if}
                        {#if app.project_name}
                          <p class="text-xs text-muted-foreground mt-0.5">{app.project_name}</p>
                        {/if}
                      </div>
                    {:else}
                      <span class="text-muted-foreground">Nhiệm vụ #{app.task_id}</span>
                    {/if}
                  </TableCell>
                  <TableCell>
                    <div>
                      <Badge variant={statusBadgeVariant(app.status)} class="font-bold">
                        {statusLabel(app.status)}
                      </Badge>
                      {#if app.withdrawn_at}
                        <p class="text-xs text-muted-foreground mt-1">Rút đơn lúc {formatDate(app.withdrawn_at)}</p>
                      {/if}
                    </div>
                  </TableCell>
                  <TableCell class="text-muted-foreground">{formatDate(app.created_at)}</TableCell>
                  <TableCell>
                    <div class="flex flex-col items-end gap-1">
                      {#if app.can_withdraw}
                        <Button
                          variant="outline"
                          size="sm"
                          class="font-bold text-xs"
                          onclick={() => handleWithdraw(app.id)}
                          disabled={withdrawing === app.id}
                        >
                          {withdrawing === app.id ? 'Đang rút...' : 'Rút đơn'}
                        </Button>
                      {/if}
                      {#if app.lifecycle_events?.length}
                        <ol class="text-left text-xs text-muted-foreground max-w-[200px]" data-testid="application-timeline">
                          {#each app.lifecycle_events as event}
                            <li>• {event.label}</li>
                          {/each}
                        </ol>
                      {/if}
                    </div>
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </Card>

        {#if meta.last_page > 1}
          <div class="flex items-center justify-center gap-2 mt-4">
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
    </section>
  </div>
</Layout>
