<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Inbox, Check, X } from 'lucide-svelte'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import TalentExplainabilityBadges from '@/apps/user/modules/profile/components/talent_explainability_badges.svelte'
  import Table from '@/apps/user/shared/ui/table.svelte'
  import TableBody from '@/apps/user/shared/ui/table_body.svelte'
  import TableCell from '@/apps/user/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/user/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/user/shared/ui/table_header.svelte'
  import TableRow from '@/apps/user/shared/ui/table_row.svelte'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import { APPLICATION_STATUSES, APPLICATION_STATUS_BADGE_VARIANTS, FILTER_VALUES, getTaskApplicationProcessRoute, getTaskApplicationsRoute, type ApplicationFilterValue, type ApplicationStatus } from '@/apps/user/shared/constants'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'


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
    portfolio_links?: string[]
    estimated_duration?: number
    created_at: string
    candidate_source?: 'project_member' | 'org_member' | 'external' | string | null
  }

  interface RankedApplication {
    applicationId: string
    rank?: number
    matchScore: number
    skillMatch?: number | null
    domainMatch?: number | null
    deliveryReliability?: number | null
    trustScore: number
    evidenceConfidence?: 'low' | 'medium' | 'high'
    evidenceWarnings?: string[]
    explanations?: string[]
    risks?: string[]
    candidateSource?: string
    fitLabel?: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match'
    reviewedSkillsCount?: number
    importedSkillsCount?: number
    underDisputeSkillsCount?: number
    latestConfidenceSignal?: 'low' | 'medium' | 'high' | null
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    taskId: string
    applications: Application[]
    pagination: OffsetPagePagination
    statusFilter: string
  }

  const props: Props = $props()
  const { t } = useTranslation()

  let activeFilter = $state<ApplicationFilterValue>(FILTER_VALUES.ALL)
  let processing = $state<string | null>(null)
  let rejectingAppId = $state<string | null>(null)
  let rejectionReasons = $state<Record<string, string>>({})
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

  function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)))
  }

  function metricLabel(label: string, value?: number | null): string | null {
    if (typeof value !== 'number') return null
    return `${label} ${clampPercent(value)}%`
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
            : { action }
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
        router.reload()
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
                      {@const ranking = rankings[app.id]}
                      {#if ranking?.matchScore != null}
                        <div class="space-y-1.5">
                          <div class="flex flex-wrap items-center gap-1.5">
                            {#if ranking.rank}
                              <Badge variant="outline" class="text-[10px] font-bold">
                                #{ranking.rank}
                              </Badge>
                            {/if}
                            <p class="font-bold">{clampPercent(ranking.matchScore)}%</p>
                            <Badge
                              variant={evidenceConfidenceBadgeVariant(ranking.evidenceConfidence)}
                              class="text-[10px] font-bold"
                            >
                              {evidenceConfidenceLabel(ranking.evidenceConfidence)}
                            </Badge>
                            <Badge variant="outline" class="text-[10px] font-bold">
                              {fitLabel(ranking.fitLabel)}
                            </Badge>
                          </div>
                          <div class="flex flex-wrap gap-1">
                            {#each [
                              metricLabel(t('task.applications.metric.skill', {}, 'Skill'), ranking.skillMatch),
                              metricLabel(t('task.applications.metric.domain', {}, 'Domain'), ranking.domainMatch),
                              metricLabel(t('task.applications.metric.delivery', {}, 'Delivery'), ranking.deliveryReliability),
                              metricLabel(t('task.applications.metric.trust', {}, 'Trust'), ranking.trustScore),
                            ].filter(Boolean) as signal}
                              <span class="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                {signal}
                              </span>
                            {/each}
                          </div>
                          {#if ranking.explanations?.length}
                            <ul class="space-y-1 text-xs leading-5 text-muted-foreground">
                              {#each ranking.explanations.slice(0, 2) as explanation}
                                <li>{explanation}</li>
                              {/each}
                            </ul>
                          {/if}
                          {#if ranking.evidenceConfidence === 'low'}
                            <p class="text-xs font-medium text-foreground">
                              {t('task.applications.low_evidence_hint', {}, 'Evidence is not enough to treat this ranking as a final decision.')}
                            </p>
                          {/if}
                          {#if ranking.evidenceWarnings?.length || ranking.risks?.length}
                            <div class="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs leading-5 text-foreground">
                              {#each [...(ranking.evidenceWarnings ?? []), ...(ranking.risks ?? [])].slice(0, 2) as warning}
                                <p>{warning}</p>
                              {/each}
                            </div>
                          {/if}
                          <TalentExplainabilityBadges
                            reviewedSkillsCount={ranking.reviewedSkillsCount}
                            importedSkillsCount={ranking.importedSkillsCount}
                            underDisputeSkillsCount={ranking.underDisputeSkillsCount}
                            latestConfidenceSignal={ranking.latestConfidenceSignal}
                            containerClass="flex flex-wrap gap-1"
                            badgeClass="text-[10px] font-bold"
                          />
                        </div>
                      {:else}
                        <span class="text-muted-foreground">
                          {rankingLoaded
                            ? t('task.applications.no_ranking', {}, 'No ranking yet')
                            : t('common.loading', {}, 'Loading')}
                        </span>
                      {/if}
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
                        {#if rejectingAppId === app.id}
                          <div class="ml-auto grid max-w-[280px] gap-2 text-left">
                            <label class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground" for={`rejection-reason-${app.id}`}>
                              {t('task.applications.rejection_reason', {}, 'Rejection reason')}
                            </label>
                            <textarea
                              id={`rejection-reason-${app.id}`}
                              class="min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                              value={rejectionReasons[app.id] ?? ''}
                              oninput={(event) => setRejectionReason(app.id, event.currentTarget.value)}
                              placeholder={t('task.applications.rejection_reason_placeholder', {}, 'Explain the reason so the applicant understands the decision')}
                            ></textarea>
                            <div class="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                class="h-7 font-bold"
                                onclick={() => { rejectingAppId = null; }}
                                disabled={processing !== null}
                              >
                                {t('common.cancel', {}, 'Cancel')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                class="h-7 font-bold text-destructive hover:text-destructive"
                                onclick={() => handleProcess(app.id, 'reject')}
                                disabled={processing !== null || !rejectionReasonFor(app.id)}
                              >
                                <X class="mr-1 h-3 w-3" />
                                {t('task.applications.confirm_reject', {}, 'Confirm rejection')}
                              </Button>
                            </div>
                          </div>
                        {:else}
                          <div class="flex justify-end gap-1">
                            <Button
                              size="sm"
                              class="h-7 font-bold"
                              onclick={() => handleProcess(app.id, 'approve')}
                              disabled={processing !== null}
                            >
                              <Check class="mr-1 h-3 w-3" />
                              {t('task.applications.approve', {}, 'Approve')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              class="h-7 font-bold text-destructive hover:text-destructive"
                              onclick={() => { rejectingAppId = app.id; }}
                              disabled={processing !== null}
                            >
                              <X class="mr-1 h-3 w-3" />
                              {t('task.applications.reject', {}, 'Reject')}
                            </Button>
                          </div>
                        {/if}
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
