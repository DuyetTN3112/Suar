<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { ArrowLeft, ChevronLeft, ChevronRight, Inbox, Check, X } from 'lucide-svelte'

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
    APPLICATION_STATUSES,
    APPLICATION_STATUS_BADGE_VARIANTS,
    APPLICATION_STATUS_LABELS,
    FILTER_VALUES,
    getTaskApplicationProcessRoute,
    getTaskApplicationsRoute,
    getTaskDetailRoute,
    type ApplicationFilterValue,
    type ApplicationStatus,
  } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'


  interface ApplicationUser {
    id: string
    username: string
    email: string
  }

  interface Application {
    id: string
    user?: ApplicationUser
    status: ApplicationStatus
    cover_letter?: string
    proposed_budget?: number
    estimated_duration?: number
    created_at: string
  }

  interface RankedApplication {
    application_id: string
    match_score: number
    trust_score: number
    candidate_source?: string
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    taskId: string
    applications: Application[]
    meta: { total: number; per_page: number; current_page: number; last_page: number }
    statusFilter: string
  }

  const props: Props = $props()

  let activeFilter = $state<ApplicationFilterValue>(FILTER_VALUES.ALL)
  let processing = $state<string | null>(null)
  let rankings = $state<Record<string, RankedApplication | undefined>>({})
  let rankingError = $state(false)

  $effect(() => {
    const normalizedStatusFilter = props.statusFilter.trim()
    activeFilter = normalizedStatusFilter
      ? (normalizedStatusFilter as ApplicationFilterValue)
      : FILTER_VALUES.ALL
  })

  const statusFilters = APPLICATION_FILTER_OPTIONS

  $effect(() => {
    const taskId = props.taskId
    void loadRankings(taskId)
  })

  function statusBadgeVariant(status: ApplicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    return APPLICATION_STATUS_BADGE_VARIANTS[status]
  }

  function statusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status]
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  async function loadRankings(taskId: string) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/applications/ranking`, {
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        rankingError = true
        return
      }

      const payloadUnknown: unknown = await response.json()
      const payload = Array.isArray(payloadUnknown)
        ? (payloadUnknown as RankedApplication[])
        : []

      rankings = Object.fromEntries(
        payload.map((item) => [item.application_id, item])
      )
    } catch (error) {
      console.error('Lỗi khi tải ranking ứng viên:', error)
      rankingError = true
    }
  }

  function handleFilterChange(filter: ApplicationFilterValue) {
    activeFilter = filter
    router.visit(`${getTaskApplicationsRoute(props.taskId)}${filter !== FILTER_VALUES.ALL ? `?status=${filter}` : ''}`, {
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
      const response = await fetch(getTaskApplicationProcessRoute(props.taskId, appId), {
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
          data.message ?? (action === 'approve' ? 'Đã duyệt đơn ứng tuyển' : 'Đã từ chối đơn ứng tuyển')
        )
        router.reload()
      } else {
        notificationStore.error(data.message ?? 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Lỗi khi xử lý đơn:', error)
      notificationStore.error('Đã xảy ra lỗi khi xử lý yêu cầu')
    } finally {
      processing = null
    }
  }

  function goToPage(pageNumber: number) {
    const params = new URLSearchParams()
    if (activeFilter !== FILTER_VALUES.ALL) params.set('status', activeFilter)
    params.set('page', String(pageNumber))
    router.visit(`${getTaskApplicationsRoute(props.taskId)}?${params.toString()}`, { preserveState: true })
  }

  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
</script>

<svelte:head>
  <title>Đơn ứng tuyển</title>
</svelte:head>

<Layout title="Đơn ứng tuyển">
  <div class="p-4 sm:p-6 space-y-4">
    <!-- Header with back button -->
    <div class="flex items-center gap-3">
      <Button variant="outline" size="sm" class="font-bold" onclick={() => { router.visit(getTaskDetailRoute(props.taskId)); }}>
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

    {#if rankingError}
      <div class="alert alert-warning" data-testid="ranking-error">
        <p class="font-bold">Unable to load ranking now</p>
      </div>
    {/if}

    {#if props.applications.length === 0}
      <Card class="border-2 shadow-none">
        <CardContent class="flex flex-col items-center justify-center py-12">
          <Inbox class="h-12 w-12 text-muted-foreground mb-3" />
          <p class="text-muted-foreground font-bold" data-testid="empty-state">Chưa có đơn ứng tuyển nào</p>
        </CardContent>
      </Card>
    {:else}
      <Card class="border-2 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="font-bold">Ứng viên</TableHead>
              <TableHead class="font-bold">Trạng thái</TableHead>
              <TableHead class="font-bold">Nguồn</TableHead>
              <TableHead class="font-bold">Match score</TableHead>
              <TableHead class="font-bold">Thời gian ước tính</TableHead>
              <TableHead class="font-bold">Thư ứng tuyển</TableHead>
              <TableHead class="font-bold">Ngày gửi</TableHead>
              <TableHead class="font-bold text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each props.applications as app (app.id)}
              <TableRow data-testid="application-row">
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
                  {@const ranking = rankings[app.id]}
                  {#if ranking?.candidate_source}
                    <Badge
                      variant={ranking.candidate_source === 'project_member' ? 'default' : ranking.candidate_source === 'org_member' ? 'secondary' : 'outline'}
                      class="font-bold text-xs"
                    >
                      {ranking.candidate_source === 'project_member' ? 'Trong dự án' : ranking.candidate_source === 'org_member' ? 'Trong tổ chức' : 'Bên ngoài'}
                    </Badge>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </TableCell>
                <TableCell>
                  {@const ranking = rankings[app.id]}
                  {#if ranking?.match_score != null}
                    <div>
                      <p class="font-bold">{Math.round(ranking.match_score)}%</p>
                      <p class="text-xs text-muted-foreground">Trust {Math.round(ranking.trust_score)}%</p>
                    </div>
                  {:else}
                    <span class="text-muted-foreground">Đang tải</span>
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
                  {#if app.status === APPLICATION_STATUSES.PENDING}
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
</Layout>
