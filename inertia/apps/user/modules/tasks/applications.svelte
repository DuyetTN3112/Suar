<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Inbox } from 'lucide-svelte'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import Table from '@/apps/user/shared/ui/table.svelte'
  import TableBody from '@/apps/user/shared/ui/table_body.svelte'
  import TableCell from '@/apps/user/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/user/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/user/shared/ui/table_header.svelte'
  import TableRow from '@/apps/user/shared/ui/table_row.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import { APPLICATION_STATUSES, APPLICATION_STATUS_BADGE_VARIANTS, FILTER_VALUES, getTaskApplicationProcessRoute, getTaskApplicationsRoute, type ApplicationFilterValue, type ApplicationStatus } from '@/apps/user/shared/constants'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type {
    RankedApplication,
    AssignmentType,
    TaskApplicationsProps as Props,
  } from '@/apps/shared/tasks/task_application_types'
  import TaskApplicationMatchCell from './components/task_application_match_cell.svelte'
  import TaskApplicationActionCell from './components/task_application_action_cell.svelte'

  const props: Props = $props()
  const { t } = useTranslation()

  let activeFilter = $state<ApplicationFilterValue>(FILTER_VALUES.ALL)
  let processing = $state<string | null>(null)
  let rejectingAppId = $state<string | null>(null)
  let rejectionReasons = $state<Record<string, string>>({})
  let assignmentTypes = $state<Record<string, AssignmentType>>({})
  let rankings = $state<Record<string, RankedApplication | undefined>>({})
  let rankingLoaded = $state(false)
  let rankingError = $state(false)

  $effect(() => {
    const normalizedStatusFilter = props.statusFilter.trim()
    activeFilter = normalizedStatusFilter
      ? (normalizedStatusFilter as ApplicationFilterValue)
      : FILTER_VALUES.ALL
  })

  const statusFilters = [
    FILTER_VALUES.ALL,
    APPLICATION_STATUSES.PENDING,
    APPLICATION_STATUSES.APPROVED,
    APPLICATION_STATUSES.REJECTED,
    APPLICATION_STATUSES.WITHDRAWN,
  ] as const satisfies readonly ApplicationFilterValue[]

  $effect(() => {
    const taskId = props.taskId
    void loadRankings(taskId)
  })

  function statusBadgeVariant(status: ApplicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    return APPLICATION_STATUS_BADGE_VARIANTS[status]
  }

  function statusLabel(status: ApplicationStatus): string {
    switch (status) {
      case APPLICATION_STATUSES.PENDING:
        return t('task.applications.status.pending', {}, 'Pending')
      case APPLICATION_STATUSES.APPROVED:
        return t('task.applications.status.approved', {}, 'Approved')
      case APPLICATION_STATUSES.REJECTED:
        return t('task.applications.status.rejected', {}, 'Rejected')
      case APPLICATION_STATUSES.WITHDRAWN:
        return t('task.applications.status.withdrawn', {}, 'Withdrawn')
    }
  }

  function formatDate(dateString: string): string {
    const locale = currentDocumentLocale()
    return new Date(dateString).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')
  }

  function filterLabel(filter: ApplicationFilterValue): string {
    if (filter === FILTER_VALUES.ALL) {
      return t('common.all', {}, 'All')
    }

    return statusLabel(filter)
  }

  function candidateSourceLabel(source?: string | null): string | null {
    switch (source) {
      case 'project_member':
        return t('task.applications.candidate_source.project_member', {}, 'Project member')
      case 'org_member':
        return t('task.applications.candidate_source.org_member', {}, 'Organization member')
      case 'external':
        return t('task.applications.candidate_source.external', {}, 'External')
      default:
        return null
    }
  }

  function candidateSourceBadgeVariant(source?: string | null): 'default' | 'secondary' | 'outline' {
    if (source === 'project_member') return 'default'
    if (source === 'org_member') return 'secondary'
    return 'outline'
  }

  function evidenceConfidenceLabel(confidence?: string | null): string {
    if (confidence === 'high') return t('task.applications.evidence_confidence.high', {}, 'High evidence')
    if (confidence === 'medium') return t('task.applications.evidence_confidence.medium', {}, 'Medium evidence')
    return t('task.applications.evidence_confidence.low', {}, 'Not enough evidence')
  }

  function evidenceConfidenceBadgeVariant(confidence?: string | null): 'default' | 'secondary' | 'outline' {
    if (confidence === 'high') return 'default'
    if (confidence === 'medium') return 'secondary'
    return 'outline'
  }

  function fitLabel(label?: RankedApplication['fitLabel']): string {
    switch (label) {
      case 'strong_match':
        return t('task.applications.fit.strong_match', {}, 'Strong match')
      case 'good_match':
        return t('task.applications.fit.good_match', {}, 'Good match')
      case 'partial_match':
        return t('task.applications.fit.partial_match', {}, 'Needs review')
      case 'weak_match':
        return t('task.applications.fit.weak_match', {}, 'Weak')
      default:
        return t('task.applications.fit.unclassified', {}, 'Unclassified')
    }
  }

  async function loadRankings(taskId: string) {
    rankingError = false
    rankingLoaded = false
    rankings = {}

    if (props.applications.length === 0) {
      rankingLoaded = true
      return
    }

    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/applications/ranking`, {
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        rankingError = true
        rankingLoaded = true
        return
      }

      const payloadUnknown: unknown = await response.json()
      const payload = (
        typeof payloadUnknown === 'object' &&
        payloadUnknown !== null &&
        'data' in payloadUnknown &&
        Array.isArray((payloadUnknown as { data?: unknown }).data)
      )
        ? ((payloadUnknown as { data: RankedApplication[] }).data)
        : []

      rankings = Object.fromEntries(
        payload.map((item, index) => [item.applicationId, { ...item, rank: index + 1 }])
      )
      rankingLoaded = true
    } catch (error) {
      console.error(t('task.applications.ranking_load_error', {}, 'Error loading applicant ranking:'), error)
      rankingError = true
      rankingLoaded = true
    }
  }

  function handleFilterChange(filter: ApplicationFilterValue) {
    activeFilter = filter
    router.visit(`${getTaskApplicationsRoute(props.taskId)}${filter !== FILTER_VALUES.ALL ? `?status=${filter}` : ''}`, {
      preserveState: true,
    })
  }

  function setRejectionReason(appId: string, value: string) {
    rejectionReasons = {
      ...rejectionReasons,
      [appId]: value,
    }
  }

  function rejectionReasonFor(appId: string): string {
    return rejectionReasons[appId]?.trim() ?? ''
  }

  function assignmentTypeFor(appId: string): AssignmentType {
    return assignmentTypes[appId] ?? 'external_contributor'
  }

  function assignmentTypeLabel(value: AssignmentType): string {
    switch (value) {
      case 'member':
        return t('task.applications.assignment_type.member', {}, 'Member')
      case 'external_contributor':
        return t('task.applications.assignment_type.external_contributor', {}, 'External contributor')
      case 'volunteer':
        return t('task.applications.assignment_type.volunteer', {}, 'Volunteer')
    }
  }

  function setAssignmentType(appId: string, value: AssignmentType) {
    assignmentTypes = {
      ...assignmentTypes,
      [appId]: value,
    }
  }

  async function handleProcess(appId: string, action: 'approve' | 'reject') {
    const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (!csrfToken) {
      notificationStore.error(t('task.applications.csrf_missing', {}, 'CSRF token not found. Please reload the page.'))
      return
    }

    const rejectionReason = action === 'reject' ? rejectionReasonFor(appId) : null
    if (action === 'reject' && !rejectionReason) {
      notificationStore.error(t('task.applications.rejection_reason_required', {}, 'Please enter a rejection reason.'))
      return
    }

    processing = appId

    try {
      const response = await fetch(getTaskApplicationProcessRoute(appId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(
          action === 'reject'
            ? { action, rejectionReason }
            : { action, assignmentType: assignmentTypeFor(appId) }
        ),
        credentials: 'same-origin',
      })

      if (response.ok) {
        notificationStore.success(
          action === 'approve'
            ? t('task.applications.approve_application_success', {}, 'Application approved')
            : t('task.applications.reject_application_success', {}, 'Application rejected')
        )
        rejectingAppId = null
        router.reload({
          only: ['applications', 'pagination', 'statusFilter', 'flash'],
        })
      } else {
        const data = (await response.json()) as { error?: { message?: string } }
        notificationStore.error(data.error?.message ?? t('task.applications.process_error', {}, 'Something went wrong'))
      }
    } catch (error) {
      console.error(t('task.applications.process_log_error', {}, 'Error processing application:'), error)
      notificationStore.error(t('task.applications.process_request_error', {}, 'An error occurred while processing the request'))
    } finally {
      processing = null
    }
  }

  const paginationQueryParams = $derived.by(() => {
    const params: Record<string, string> = {}
    if (activeFilter !== FILTER_VALUES.ALL) {
      params.status = activeFilter
    }

    return params
  })

  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const isOrganizationShell = $derived(
    props.shellMode === 'organization' ||
      currentOrgRole === 'org_owner' ||
      currentOrgRole === 'org_admin'
  )
  const pendingCount = $derived(props.applications.filter((app) => app.status === APPLICATION_STATUSES.PENDING).length)
  const approvedCount = $derived(props.applications.filter((app) => app.status === APPLICATION_STATUSES.APPROVED).length)
  const rejectedCount = $derived(props.applications.filter((app) => app.status === APPLICATION_STATUSES.REJECTED).length)
  const pageTitle = $derived(t('task.applications.title', {}, 'Applications'))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="min-w-0 space-y-6">
    <section class="rounded-2xl border border-border bg-card p-6 shadow-xs">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {isOrganizationShell
              ? t('task.applications.org_eyebrow', {}, 'Organization / Application review')
              : t('task.applications.marketplace_eyebrow', {}, 'Marketplace application review')}
          </div>
          <h1 class="mt-1 text-3xl font-black tracking-tight text-foreground">{pageTitle}</h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t('task.applications.subtitle', {}, 'Review marketplace applicants, read match signals, and approve or reject them based on project permissions.')}
          </p>
        </div>
        <div class="grid min-w-[260px] grid-cols-3 gap-2 text-center">
          <div class="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <div class="text-lg font-black text-foreground">{pendingCount}</div>
            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('task.applications.pending', {}, 'Pending')}</div>
          </div>
          <div class="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <div class="text-lg font-black text-foreground">{approvedCount}</div>
            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('task.applications.approved', {}, 'Approved')}</div>
          </div>
          <div class="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <div class="text-lg font-black text-foreground">{rejectedCount}</div>
            <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('task.applications.rejected', {}, 'Rejected')}</div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        {#each statusFilters as filter (filter)}
          <Button
            variant={activeFilter === filter ? 'default' : 'outline'}
            size="sm"
            class="font-bold"
            onclick={() => { handleFilterChange(filter); }}
          >
            {filterLabel(filter)}
          </Button>
        {/each}
      </div>
    </section>

    <div class="space-y-4">
      {#if rankingError}
        <div class="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground" data-testid="ranking-error">
          <p class="font-bold">{t('task.applications.ranking_error', {}, 'Unable to load applicant ranking')}</p>
        </div>
      {/if}

      {#if props.applications.length === 0}
        <Card class="border-2 border-dashed shadow-none">
          <CardContent class="flex flex-col items-center justify-center py-12">
            <Inbox class="mb-3 h-12 w-12 text-muted-foreground" />
            <p class="font-bold text-muted-foreground" data-testid="empty-state">{t('task.applications.empty_state', {}, 'No applications yet')}</p>
          </CardContent>
        </Card>
      {:else}
        <Card class="overflow-hidden border border-border shadow-none">
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="font-bold">{t('task.applications.applicant', {}, 'Applicant')}</TableHead>
                  <TableHead class="font-bold">{t('task.status', {}, 'Status')}</TableHead>
                  <TableHead class="font-bold">{t('task.applications.source', {}, 'Source')}</TableHead>
                  <TableHead class="font-bold">{t('task.applications.match_score', {}, 'Match score')}</TableHead>
                  <TableHead class="font-bold">{t('task.applications.estimated_duration', {}, 'Estimated duration')}</TableHead>
                  <TableHead class="font-bold">{t('task.applications.message', {}, 'Message')}</TableHead>
                  <TableHead class="font-bold">{t('task.applications.submitted_at', {}, 'Submitted')}</TableHead>
                  <TableHead class="font-bold text-right">{t('task.applications.actions', {}, 'Actions')}</TableHead>
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
                        <span class="text-muted-foreground">{t('task.applications.anonymous', {}, 'Anonymous')}</span>
                      {/if}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(app.status)} class="font-bold">
                        {statusLabel(app.status)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {@const ranking = rankings[app.id]}
                      {@const candidateSource = ranking?.candidateSource ?? app.candidate_source}
                      {@const sourceLabel = candidateSourceLabel(candidateSource)}
                      {#if sourceLabel}
                        <Badge
                          variant={candidateSourceBadgeVariant(candidateSource)}
                          class="font-bold text-xs"
                        >
                          {sourceLabel}
                        </Badge>
                      {:else}
                        <span class="text-muted-foreground">—</span>
                      {/if}
                    </TableCell>
                    <TableCell>
                      <TaskApplicationMatchCell
                        ranking={rankings[app.id]}
                        {rankingLoaded}
                        {evidenceConfidenceBadgeVariant}
                        {evidenceConfidenceLabel}
                        {fitLabel}
                      />
                    </TableCell>
                    <TableCell>
                      {#if app.estimated_duration != null}
                        <span>{t('task.applications.duration_days', { count: app.estimated_duration }, ':count days')}</span>
                      {:else}
                        <span class="text-muted-foreground">—</span>
                      {/if}
                    </TableCell>
                    <TableCell class="max-w-[200px]">
                      {#if app.cover_letter}
                        <p class="truncate text-sm" title={app.cover_letter}>{app.cover_letter}</p>
                      {:else}
                        <span class="text-muted-foreground">—</span>
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
                              {t('task.applications.proof_prefix', {}, 'Proof')}: {link}
                            </a>
                          {/each}
                        </div>
                      {/if}
                    </TableCell>
                    <TableCell>{formatDate(app.created_at)}</TableCell>
                    <TableCell class="text-right">
                      {#if app.status === APPLICATION_STATUSES.PENDING}
                        <TaskApplicationActionCell
                          appId={app.id}
                          assignmentType={assignmentTypeFor(app.id)}
                          isRejecting={rejectingAppId === app.id}
                          rejectionReason={rejectionReasons[app.id] ?? ''}
                          isProcessing={processing !== null}
                          {assignmentTypeLabel}
                          onAssignmentTypeChange={(val: AssignmentType) => setAssignmentType(app.id, val)}
                          onRejectionReasonChange={(val: string) => setRejectionReason(app.id, val)}
                          onStartReject={() => { rejectingAppId = app.id }}
                          onCancelReject={() => { rejectingAppId = null }}
                          onApprove={() => handleProcess(app.id, 'approve')}
                          onConfirmReject={() => handleProcess(app.id, 'reject')}
                        />
                      {/if}
                    </TableCell>
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div class="pt-4">
          <UnifiedOffsetPagination
            pagination={props.pagination}
            baseUrl={getTaskApplicationsRoute(props.taskId)}
            queryParams={paginationQueryParams}
          />
        </div>
      {/if}
    </div>
  </div>
</AppLayout>
