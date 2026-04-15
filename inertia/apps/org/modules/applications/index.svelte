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
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import { APPLICATION_STATUSES, FILTER_VALUES, FRONTEND_ROUTES, getTaskApplicationsRoute, type ApplicationFilterValue, type ApplicationStatus } from '@/apps/org/shared/constants'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface ApplicationTask {
    id: string
    title: string
    status: string
    project_name?: string | null
  }

  interface ApplicationUser {
    id: string
    username: string | null
    email: string | null
  }

  interface Application {
    id?: string
    task_id: string
    task?: ApplicationTask | null
    user?: ApplicationUser | null
    status: ApplicationStatus
    cover_letter?: string | null
    portfolio_links?: string[]
    created_at?: string
    newest_application_at?: string | null
    pending_count?: number
    total_count?: number
    candidate_source?: 'project_member' | 'org_member' | 'external' | string | null
    candidate_sources?: string[]
  }

  interface TaskApplicationGroup {
    taskId: string
    title: string
    status: string
    projectName: string | null
    pendingCount: number
    totalCount: number
    newestApplicationAt: string | null
    candidateSources: string[]
  }

  interface Props {
    applications: Application[]
    pagination: OffsetPagePagination
    statusFilter: string
  }

  const { applications, pagination, statusFilter }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  let activeFilter = $state<ApplicationFilterValue>(FILTER_VALUES.ALL)

  $effect(() => {
    const normalizedStatusFilter = statusFilter.trim()
    activeFilter = normalizedStatusFilter
      ? (normalizedStatusFilter as ApplicationFilterValue)
      : FILTER_VALUES.ALL
  })

  const pageTitle = $derived(t('task.applications.title', {}, 'Applications'))
  const statusFilters = [
    FILTER_VALUES.ALL,
    APPLICATION_STATUSES.PENDING,
    APPLICATION_STATUSES.APPROVED,
    APPLICATION_STATUSES.REJECTED,
    APPLICATION_STATUSES.WITHDRAWN,
  ] as const satisfies readonly ApplicationFilterValue[]

  function applyFilter(filter: ApplicationFilterValue) {
    activeFilter = filter
    const params = new URLSearchParams()
    if (filter !== FILTER_VALUES.ALL) params.set('status', filter)
    router.visit(`${FRONTEND_ROUTES.ORG_APPLICATIONS}${params.size > 0 ? `?${params}` : ''}`, {
      preserveState: true,
    })
  }

  function applicationsRoute(taskId: string): string {
    return getTaskApplicationsRoute(taskId).replace('/tasks/', '/org/tasks/')
  }

  function applicationTimestamp(application: Application): number {
    const timestamp = Date.parse(application.newest_application_at ?? application.created_at ?? '')
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  function formatApplicationDate(value: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleDateString(documentLocale)
  }

  function pendingCountLabel(count: number): string {
    return count === 1
      ? t('task.applications.inbox.pending_count_one', { count }, ':count pending application')
      : t('task.applications.inbox.pending_count_other', { count }, ':count pending applications')
  }

  function totalCountLabel(count: number): string {
    return count === 1
      ? t('task.applications.inbox.total_count_one', { count }, ':count total application')
      : t('task.applications.inbox.total_count_other', { count }, ':count total applications')
  }

  function sourceLabel(source: string): string {
    if (source === 'project_member') {
      return t('task.applications.candidate_source.project_member', {}, 'Project member')
    }
    if (source === 'org_member') {
      return t('task.applications.candidate_source.org_member', {}, 'Organization member')
    }
    if (source === 'external') {
      return t('task.applications.candidate_source.external', {}, 'External')
    }
    return source
  }

  function candidateSourceLabel(sources: string[]): string {
    return sources.map(sourceLabel).join(', ')
  }

  const taskApplicationGroups = $derived.by(() => {
    const groups = new Map<string, TaskApplicationGroup>()

    for (const application of applications) {
      const taskId = application.task_id
      const sources = application.candidate_sources ?? [application.candidate_source ?? 'external']
      const createdAt = application.newest_application_at ?? application.created_at ?? null
      const existing = groups.get(taskId)

      if (!existing) {
        groups.set(taskId, {
          taskId,
          title: application.task?.title ?? taskId,
          status: application.task?.status ?? 'unknown',
          projectName: application.task?.project_name ?? null,
          pendingCount: application.pending_count ?? (application.status === APPLICATION_STATUSES.PENDING ? 1 : 0),
          totalCount: application.total_count ?? 1,
          newestApplicationAt: createdAt,
          candidateSources: [...sources],
        })
        continue
      }

      existing.totalCount += application.total_count ?? 1
      existing.pendingCount +=
        application.pending_count ?? (application.status === APPLICATION_STATUSES.PENDING ? 1 : 0)
      for (const source of sources) {
        if (!existing.candidateSources.includes(source)) {
          existing.candidateSources.push(source)
        }
      }
      if (createdAt && applicationTimestamp(application) > timestampValue(existing.newestApplicationAt)) {
        existing.newestApplicationAt = createdAt
      }
    }

    return [...groups.values()].sort((first, second) => {
      return timestampValue(second.newestApplicationAt) - timestampValue(first.newestApplicationAt)
    })
  })

  function timestampValue(value: string | null): number {
    const timestamp = Date.parse(value ?? '')
    return Number.isNaN(timestamp) ? 0 : timestamp
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
            <Inbox class="size-3.5" />
            <span>{t('task.applications.org_eyebrow', {}, 'Organization / Application review')}</span>
          </div>
          <h1 class="mt-1 text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <p class="mt-1 max-w-3xl text-base text-muted-foreground">
            {t(
              'task.applications.subtitle',
              {},
              'Review marketplace applicants across all posted tasks, then jump into a task-specific review when you need scoring or a decision.'
            )}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each statusFilters as filter (filter)}
            <Button
              variant={activeFilter === filter ? 'default' : 'outline'}
              size="sm"
              class="font-bold"
              onclick={() => applyFilter(filter)}
            >
              {filter}
            </Button>
          {/each}
        </div>
      </div>
    </section>

    <Card class="overflow-hidden">
      <CardContent class="p-0">
        {#if taskApplicationGroups.length === 0}
          <div class="flex min-h-48 items-center justify-center">
            <p class="text-sm font-medium text-muted-foreground">
              {t('task.applications.empty_state', {}, 'No applications yet')}
            </p>
          </div>
        {:else}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('task.applications.task', {}, 'Task')}</TableHead>
                <TableHead>{t('task.applications.pending_count', {}, 'Pending')}</TableHead>
                <TableHead>{t('task.applications.source', {}, 'Source')}</TableHead>
                <TableHead>{t('task.applications.submitted_at', {}, 'Newest')}</TableHead>
                <TableHead class="text-right">{t('task.applications.actions', {}, 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each taskApplicationGroups as group (group.taskId)}
                <TableRow>
                  <TableCell class="font-medium">
                    <div class="flex flex-col">
                      <span>{group.title}</span>
                      <span class="text-xs text-muted-foreground">
                        {group.projectName ? `${group.projectName} · ` : ''}{group.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-col items-start gap-1">
                      <Badge variant={group.pendingCount > 0 ? 'default' : 'outline'}>
                        {pendingCountLabel(group.pendingCount)}
                      </Badge>
                      <span class="text-xs text-muted-foreground">
                        {totalCountLabel(group.totalCount)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {candidateSourceLabel(group.candidateSources)}
                  </TableCell>
                  <TableCell>
                    {t(
                      'task.applications.inbox.newest_application',
                      { date: formatApplicationDate(group.newestApplicationAt) },
                      'Newest application :date'
                    )}
                  </TableCell>
                  <TableCell class="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onclick={() => router.visit(applicationsRoute(group.taskId))}
                    >
                      {t('task.applications.view_applications', {}, 'View applications')}
                    </Button>
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        {/if}
      </CardContent>
    </Card>

    <UnifiedOffsetPagination
      {pagination}
      baseUrl={FRONTEND_ROUTES.ORG_APPLICATIONS}
      queryParams={paginationQueryParams}
    />
  </div>
</OrganizationLayout>
