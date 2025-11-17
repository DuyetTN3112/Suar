<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Inbox } from 'lucide-svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import Table from '@/apps/org/shared/ui/table.svelte'
  import TableBody from '@/apps/org/shared/ui/table_body.svelte'
  import TableCell from '@/apps/org/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/org/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/org/shared/ui/table_header.svelte'
  import TableRow from '@/apps/org/shared/ui/table_row.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import { APPLICATION_FILTER_OPTIONS, APPLICATION_STATUS_BADGE_VARIANTS, APPLICATION_STATUS_LABELS, FILTER_VALUES, FRONTEND_ROUTES, getApplicationWithdrawRoute, getTaskDetailRoute, type ApplicationFilterValue, type ApplicationStatus } from '@/apps/org/shared/constants'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'


  interface Application {
    id: string
    task_id: string
    task?: { id: string; title: string; status: string }
    status: ApplicationStatus
    cover_letter?: string
    portfolio_links?: string[]
    rejection_reason?: string | null
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
    applications: Application[]
    pagination: OffsetPagePagination
    statusFilter: string
  }

  const { applications, pagination, statusFilter }: Props = $props()
  const { t } = useTranslation()

  let activeFilter = $state<ApplicationFilterValue>(FILTER_VALUES.ALL)
  let withdrawing = $state<string | null>(null)

  $effect(() => {
    const normalizedStatusFilter = statusFilter.trim()
    activeFilter = normalizedStatusFilter
      ? (normalizedStatusFilter as ApplicationFilterValue)
      : FILTER_VALUES.ALL
  })

  const pageTitle = $derived(t('task.my_applications.title', {}, 'My applications'))
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const applicantStatusLabels = $derived<Record<ApplicationStatus, string>>({
    pending: t('task.my_applications.status.pending', {}, 'Pending'),
    approved: t('task.my_applications.status.approved', {}, 'Approved'),
    rejected: t('task.my_applications.status.rejected', {}, 'Rejected'),
    withdrawn: t('task.my_applications.status.withdrawn', {}, 'Withdrawn'),
  })
  const statusFilters = $derived(APPLICATION_FILTER_OPTIONS.map((filter) => ({
    ...filter,
    label:
      filter.value === FILTER_VALUES.ALL
        ? t('task.my_applications.status.all', {}, filter.label)
        : applicantStatusLabels[filter.value],
  })))
  const pendingCount = $derived(applications.filter((app) => app.status === 'pending').length)
  const approvedCount = $derived(applications.filter((app) => app.status === 'approved').length)
  const rejectedOrWithdrawnCount = $derived(
    applications.filter((app) => app.status === 'rejected' || app.status === 'withdrawn').length
  )

  function statusLabel(status: ApplicationStatus): string {
    return applicantStatusLabels[status] ?? APPLICATION_STATUS_LABELS[status]
  }

  function statusBadgeVariant(status: ApplicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    return APPLICATION_STATUS_BADGE_VARIANTS[status]
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(documentLocale)
  }

  function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatTimelineLabel(label: string): string {
    const separatorIndex = label.indexOf(': ')
    if (separatorIndex === -1) return label

    const prefix = label.slice(0, separatorIndex)
    const dateText = label.slice(separatorIndex + 2)
    const date = new Date(dateText)
    if (Number.isNaN(date.getTime())) return label

    return `${prefix}: ${formatDateTime(dateText)}`
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
      notificationStore.error(t('task.my_applications.csrf_missing', {}, 'CSRF token not found. Please reload the page.'))
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

      if (response.ok) {
        notificationStore.success(t('task.my_applications.withdraw_success', {}, 'Application withdrawn successfully.'))
        router.reload()
      } else {
        notificationStore.error(t('task.my_applications.withdraw_error', {}, 'Unable to withdraw application.'))
      }
    } catch (error) {
      console.error('Error withdrawing application:', error)
      notificationStore.error(t('task.my_applications.request_error', {}, 'An error occurred while processing the request.'))
    } finally {
      withdrawing = null
    }
  }

  const paginationQueryParams = $derived.by(() => {
    const params: Record<string, string> = {}
    if (activeFilter !== FILTER_VALUES.ALL) {
      params.status = activeFilter
    }

    return params
  })
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<OrganizationLayout title={pageTitle}>
  <div class="min-w-0 space-y-6">
    <section class="rounded-2xl border border-border bg-card p-6 shadow-xs">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t('task.my_applications.eyebrow', {}, 'User / Sent applications')}
          </div>
          <h1 class="text-3xl font-bold tracking-tight text-foreground mt-1">{pageTitle}</h1>
          <p class="text-base text-muted-foreground max-w-3xl mt-1">
            {t(
              'task.my_applications.subtitle',
              {},
              'Track applications sent from the task marketplace and withdraw while tasks are still pending.'
            )}
          </p>
        </div>
        <div class="grid min-w-[260px] grid-cols-3 gap-2 text-center">
          <div class="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <div class="text-lg font-black text-foreground">{pendingCount}</div>
            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t('task.my_applications.status.pending', {}, 'Pending')}
            </div>
          </div>
          <div class="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <div class="text-lg font-black text-foreground">{approvedCount}</div>
            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t('task.my_applications.status.approved', {}, 'Approved')}
            </div>
          </div>
          <div class="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <div class="text-lg font-black text-foreground">{rejectedOrWithdrawnCount}</div>
            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t('task.my_applications.closed_count', {}, 'Closed')}
            </div>
          </div>
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
    </section>

    <section class="min-h-[420px]">
      {#if applications.length === 0}
        <Card class="border-2 border-dashed shadow-none">
          <CardContent class="flex flex-col items-center justify-center py-12">
            <Inbox class="h-12 w-12 text-muted-foreground mb-3" />
            <h2 class="text-lg font-bold text-foreground mb-1" data-testid="empty-state">
              {t('task.my_applications.empty_title', {}, 'You have no applications yet')}
            </h2>
            <Button class="font-bold" onclick={() => { router.visit(FRONTEND_ROUTES.MARKETPLACE_TASKS); }}>
              {t('task.my_applications.go_to_marketplace', {}, 'Go to task marketplace')}
            </Button>
          </CardContent>
        </Card>
      {:else}
        <Card class="overflow-hidden border border-border shadow-none">
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="font-bold">{t('task.my_applications.task_header', {}, 'Task')}</TableHead>
                  <TableHead class="font-bold">{t('task.my_applications.status_header', {}, 'Status')}</TableHead>
                  <TableHead class="font-bold">{t('task.my_applications.submitted_at_header', {}, 'Submitted')}</TableHead>
                  <TableHead class="font-bold text-right">{t('task.my_applications.actions_header', {}, 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each applications as app (app.id)}
                  <TableRow data-testid="application-row">
                    <TableCell>
                      {#if app.task}
                        <div>
                          <a href={getTaskDetailRoute(app.task.id)} class="font-bold text-foreground hover:underline">
                            {app.task.title}
                          </a>
                          {#if app.organization_name}
                            <p class="mt-0.5 text-xs text-muted-foreground">{app.organization_name}</p>
                          {/if}
                          {#if app.project_name}
                            <p class="mt-0.5 text-xs text-muted-foreground">{app.project_name}</p>
                          {/if}
                          {#if app.portfolio_links?.length}
                            <div class="mt-2 flex flex-col gap-1">
                              {#each app.portfolio_links as link}
                                <a
                                  class="truncate text-xs font-semibold text-primary hover:underline"
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={link}
                                >
                                  {t('task.my_applications.proof_submitted', {}, 'Submitted proof')}: {link}
                                </a>
                              {/each}
                            </div>
                          {/if}
                        </div>
                      {:else}
                        <span class="text-muted-foreground">
                          {t('task.my_applications.task_number', { id: app.task_id }, 'Task #:id')}
                        </span>
                      {/if}
                    </TableCell>
                    <TableCell>
                      <div>
                        <Badge variant={statusBadgeVariant(app.status)} class="font-bold">
                          {statusLabel(app.status)}
                        </Badge>
                        {#if app.withdrawn_at}
                          <p class="mt-1 text-xs text-muted-foreground">
                            {t('task.my_applications.withdrawn_at', { date: formatDate(app.withdrawn_at) }, 'Withdrawn at :date')}
                          </p>
                        {/if}
                        {#if app.status === 'rejected' && app.rejection_reason}
                          <div class="mt-2 max-w-[320px] rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-foreground">
                            <span class="block font-bold text-destructive">
                              {t('task.my_applications.rejection_reason', {}, 'Rejection reason')}
                            </span>
                            <span class="mt-1 block leading-5">{app.rejection_reason}</span>
                          </div>
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
                            class="text-xs font-bold"
                            onclick={() => handleWithdraw(app.id)}
                            disabled={withdrawing === app.id}
                          >
                            {withdrawing === app.id
                              ? t('task.my_applications.withdrawing_button', {}, 'Withdrawing...')
                              : t('task.my_applications.withdraw_button', {}, 'Withdraw application')}
                          </Button>
                        {/if}
                        {#if app.lifecycle_events?.length}
                          <ol class="max-w-[200px] text-left text-xs text-muted-foreground" data-testid="application-timeline">
                            {#each app.lifecycle_events as event}
                              <li>• {formatTimelineLabel(event.label)}</li>
                            {/each}
                          </ol>
                        {/if}
                      </div>
                    </TableCell>
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div class="mt-4">
          <UnifiedOffsetPagination
            pagination={pagination}
            baseUrl={FRONTEND_ROUTES.MY_APPLICATIONS}
            queryParams={paginationQueryParams}
          />
        </div>
      {/if}
    </section>
  </div>
</OrganizationLayout>
