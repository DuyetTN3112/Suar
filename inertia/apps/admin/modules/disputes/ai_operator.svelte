<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Input from '@/apps/admin/shared/ui/input.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/admin/shared/lib/pagination'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

	  interface DisputeQueueItem {
	    id: string
	    task_title: string | null
	    reviewee_username: string | null
	    status: string
	    source_type?: string | null
	    sourceType?: string | null
	    dispute_review_type?: string | null
	    disputeReviewType?: string | null
	    project_name?: string | null
	    projectName?: string | null
	    project_id?: string | null
	    projectId?: string | null
	    sprint_name?: string | null
	    sprintName?: string | null
	    sprint_id?: string | null
	    sprintId?: string | null
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
    pagination?: OffsetPagePagination
    aiMetrics: {
      totalEvaluations: number
      activeEvaluations: number
      completedEvaluations: number
      failedEvaluations: number
      queuedDisputes: number
      providers: ProviderMetric[]
    }
  }

  const { disputes, filters, pagination, aiMetrics }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateFormatter = $derived(new Intl.DateTimeFormat(documentLocale, { dateStyle: 'medium' }))

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

	  const paginationParams = $derived.by(() => ({
	    search: filters.search ?? undefined,
	    status: filters.status ?? undefined,
	  }))

	  function disputeSourceType(dispute: DisputeQueueItem): string {
	    return dispute.sourceType ?? dispute.source_type ?? 'review_dispute'
	  }

	  function isClassicReviewDispute(dispute: DisputeQueueItem): boolean {
	    return disputeSourceType(dispute) === 'review_dispute'
	  }

	  function sourceLabel(dispute: DisputeQueueItem): string {
	    const sourceType = disputeSourceType(dispute)
	    if (sourceType === 'sprint_review_dispute') return t('task.disputes.index.source.sprint_review_dispute', {}, 'Sprint review')
	    if (sourceType === 'sprint_reverse_review_workflow') return t('task.disputes.index.source.sprint_reverse_review_workflow', {}, 'Reverse review')
	    if (sourceType === 'task_review_workflow') return t('task.disputes.index.source.task_review_workflow', {}, 'Task workflow')
	    return t('task.disputes.index.source.review_dispute', {}, 'Task review')
	  }

	  function reviewTypeLabel(dispute: DisputeQueueItem): string {
	    return dispute.disputeReviewType ?? dispute.dispute_review_type ?? 'task_review'
	  }

	  function projectLabel(dispute: DisputeQueueItem): string | null {
	    return dispute.projectName ?? dispute.project_name ?? dispute.projectId ?? dispute.project_id ?? null
	  }

	  function sprintLabel(dispute: DisputeQueueItem): string | null {
	    return dispute.sprintName ?? dispute.sprint_name ?? dispute.sprintId ?? dispute.sprint_id ?? null
	  }

	  function queueContextLabel(dispute: DisputeQueueItem): string {
	    return dispute.task_title ?? projectLabel(dispute) ?? sprintLabel(dispute) ?? t('task.disputes.index.unknown_context', {}, 'Unknown review context')
	  }

	  function caseFileLabel(dispute: DisputeQueueItem): string {
	    if (!isClassicReviewDispute(dispute)) return t('task.disputes.ai_operator.runtime_package', {}, 'Runtime package')
	    return dispute.latest_case_version ? `v${dispute.latest_case_version}` : t('task.disputes.ai_operator.case_file_missing', {}, 'Not available')
	  }

    function formatCreatedAt(value: string): string {
      const date = new Date(value)
      return Number.isNaN(date.getTime())
        ? t('common.invalid_date', {}, 'Invalid date')
        : dateFormatter.format(date)
    }
	</script>

<svelte:head>
  <title>{t('task.disputes.ai_operator.page_title', {}, 'AI dispute operator')}</title>
</svelte:head>

  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-4xl font-bold tracking-tight">{t('task.disputes.ai_operator.title', {}, 'AI dispute operator')}</h1>
      </div>
      <div class="flex gap-2">
        <Link href="/admin/disputes">
          <Button variant="outline">{t('task.disputes.ai_operator.back_to_disputes', {}, 'Dispute list')}</Button>
        </Link>
      </div>
    </div>

  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
    <Card>
      <CardHeader>
        <CardTitle>{t('task.disputes.ai_operator.queued', {}, 'Queued')}</CardTitle>
        <div class="text-3xl font-bold">{aiMetrics.queuedDisputes}</div>
      </CardHeader>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{t('task.disputes.ai_operator.total_ai', {}, 'Total AI runs')}</CardTitle>
        <div class="text-3xl font-bold">{aiMetrics.totalEvaluations}</div>
      </CardHeader>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{t('task.disputes.ai_operator.active', {}, 'Active')}</CardTitle>
        <div class="text-3xl font-bold">{aiMetrics.activeEvaluations}</div>
      </CardHeader>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{t('task.disputes.ai_operator.completed', {}, 'Completed')}</CardTitle>
        <div class="text-3xl font-bold">{aiMetrics.completedEvaluations}</div>
      </CardHeader>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{t('task.disputes.ai_operator.failed', {}, 'Failed / cancelled')}</CardTitle>
        <div class="text-3xl font-bold">{aiMetrics.failedEvaluations}</div>
      </CardHeader>
    </Card>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>{t('task.disputes.ai_operator.filter_title', {}, 'Queue filters')}</CardTitle>
    </CardHeader>
    <CardContent>
      <form onsubmit={(event) => { event.preventDefault(); applyFilters() }} class="flex flex-wrap items-end gap-4">
        <div class="min-w-[240px] flex-1 space-y-2">
          <Input bind:value={search} placeholder={t('task.disputes.ai_operator.search_placeholder', {}, 'Task, user, or reason...')} />
        </div>
        <div class="w-[220px] space-y-2">
          <select
            bind:value={status}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">{t('task.disputes.ai_operator.all_statuses', {}, 'All statuses')}</option>
            <option value="admin_reviewing">{t('task.disputes.index.status.admin_reviewing', {}, 'Admin reviewing')}</option>
            <option value="ai_reviewing">{t('task.disputes.index.status.ai_reviewing', {}, 'AI reviewing')}</option>
            <option value="pending">{t('task.disputes.index.status.pending', {}, 'Pending')}</option>
            <option value="resolved">{t('task.disputes.index.status.resolved', {}, 'Resolved')}</option>
          </select>
        </div>
        <Button type="submit">{t('task.disputes.ai_operator.apply', {}, 'Apply')}</Button>
      </form>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>{t('task.disputes.ai_operator.provider_title', {}, 'By provider')}</CardTitle>
    </CardHeader>
    <CardContent>
      {#if aiMetrics.providers.length === 0}
        <p class="text-sm text-muted-foreground">{t('task.disputes.ai_operator.empty_providers', {}, 'No AI evaluations yet.')}</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th>{t('task.disputes.ai_operator.provider', {}, 'Provider')}</th>
                <th>{t('task.disputes.ai_operator.total', {}, 'Total')}</th>
                <th>{t('task.disputes.ai_operator.active', {}, 'Active')}</th>
                <th>{t('task.disputes.ai_operator.completed', {}, 'Completed')}</th>
                <th>{t('task.disputes.ai_operator.failed_short', {}, 'Failed')}</th>
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
      <CardTitle>{t('task.disputes.ai_operator.queue_title', {}, 'Dispute queue')}</CardTitle>
    </CardHeader>
    <CardContent>
      {#if disputes.length === 0}
        <p class="text-sm text-muted-foreground">{t('task.disputes.ai_operator.queue_empty', {}, 'No disputes in the current queue.')}</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
	                <th>{t('task.disputes.ai_operator.context', {}, 'Context')}</th>
	                <th>{t('task.disputes.ai_operator.user', {}, 'User')}</th>
	                <th>{t('task.disputes.ai_operator.status', {}, 'Status')}</th>
                <th>{t('task.disputes.ai_operator.case_file', {}, 'Case file')}</th>
                <th>{t('task.disputes.ai_operator.ai_runs', {}, 'AI runs')}</th>
                <th>{t('task.disputes.ai_operator.created', {}, 'Created')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
	              {#each disputes as dispute (dispute.id)}
	                <tr>
	                  <td class="font-medium">
	                    <div>{queueContextLabel(dispute)}</div>
	                    <div class="mt-1 flex flex-wrap gap-1">
	                      <Badge variant="outline" class="text-[10px]">{sourceLabel(dispute)}</Badge>
	                      <Badge variant="outline" class="font-mono text-[10px]">{reviewTypeLabel(dispute)}</Badge>
	                    </div>
	                  </td>
	                  <td>{dispute.reviewee_username ?? t('task.disputes.ai_operator.unknown_user', {}, 'Unknown user')}</td>
                  <td>
                    <Badge variant="outline">{dispute.status}</Badge>
                  </td>
	                  <td>{caseFileLabel(dispute)}</td>
                  <td>{dispute.ai_evaluations_count}</td>
                  <td>{formatCreatedAt(dispute.created_at)}</td>
                  <td class="text-right">
                    <Link href={`/admin/disputes/${dispute.id}`}>
                      <Button variant="outline" size="sm">{t('task.disputes.ai_operator.open', {}, 'Open')}</Button>
                    </Link>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
      {#if pagination}
        <UnifiedOffsetPagination
          {pagination}
          baseUrl="/admin/disputes/ai-operator"
          queryParams={paginationParams}
        />
      {/if}
    </CardContent>
  </Card>
</div>
