<script lang="ts">
  /**
   * Marketplace Tasks Page — GET /marketplace/tasks
   * Browse public tasks available for external contributors to request access.
   */
  import { page } from '@inertiajs/svelte'
  import { Search } from 'lucide-svelte'

  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import ApplyTaskModal from './components/apply_task_modal.svelte'
  import MarketplaceFilters from './components/marketplace_filters.svelte'
  import MarketplaceTaskCard from './components/marketplace_task_card.svelte'
  import type { MarketplaceTasksProps, MarketplaceTask } from './types.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { id?: string | null; current_organization_role?: string | null; current_organization_id?: string | null } }
    tasks: MarketplaceTasksProps['tasks']
    pagination: MarketplaceTasksProps['pagination']
    filters: MarketplaceTasksProps['filters']
    availableSkills?: MarketplaceTasksProps['availableSkills']
  }

  const { tasks, pagination, filters, availableSkills = [] }: Props = $props()
  const currentUser = $derived((page as { props: { auth?: { user?: { id?: string | null; current_organization_role?: string | null; current_organization_id?: string | null } } } }).props.auth?.user)
  const currentOrgRole = $derived(currentUser?.current_organization_role ?? null)
  const currentOrganizationId = $derived(currentUser?.current_organization_id ?? null)
  const currentUserId = $derived(currentUser?.id ?? null)
  const isOrganizationLeader = $derived(
    currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin'
  )
  const hasReviewableTask = $derived(tasks.some((task) => Boolean(task.can_review_applications)))
  const isOrganizationShell = $derived(isOrganizationLeader || hasReviewableTask)
  const allowRecommendedSort = $derived(Boolean(currentUserId && !isOrganizationShell))
  const marketplaceContext = $derived({
    mode: isOrganizationShell ? 'organization' : 'user',
    canRecruit: isOrganizationShell,
    currentOrganizationId,
    currentUserId,
  } as const)
  const { t } = useTranslation()

  const pageTitle = $derived(t('task.marketplace_page.title', {}, 'Task marketplace'))
  const totalLabel = $derived(
    isOrganizationShell
      ? t('task.marketplace_page.org_total_name', {}, 'marketplace tasks')
      : t('task.marketplace_page.user_total_name', {}, 'joinable tasks')
  )
  const showingRange = $derived.by(() => {
    if (tasks.length === 0) return '0'
    const start = (pagination.page - 1) * pagination.perPage + 1
    const end = start + tasks.length - 1
    return `${start}-${end}`
  })

  let applyModalOpen = $state(false)
  let selectedTask = $state<MarketplaceTask | null>(null)

  function handleApply(task: MarketplaceTask) {
    selectedTask = task
    applyModalOpen = true
  }

  // Build extra params for pagination (preserve current filters)
  const paginationParams = $derived(() => {
    const params: Record<string, unknown> = {}
    if (filters.skill_categories?.length) params.skill_categories = filters.skill_categories
    if (filters.skill_ids?.length) params.skill_ids = filters.skill_ids
    if (filters.keyword?.trim()) params.keyword = filters.keyword.trim()
    if (filters.difficulty) params.difficulty = filters.difficulty
    if (filters.task_type) params.task_type = filters.task_type
    if (filters.business_domain) params.business_domain = filters.business_domain
    if (filters.problem_category) params.problem_category = filters.problem_category
    if (filters.role_in_task) params.role_in_task = filters.role_in_task
    if (filters.verification_method) params.verification_method = filters.verification_method
    if (filters.tech_stack?.trim()) params.tech_stack = filters.tech_stack.trim()
    if (filters.domain_tags?.trim()) params.domain_tags = filters.domain_tags.trim()
    if (filters.accepting_applications) params.accepting_applications = filters.accepting_applications
    if (
      filters.sort_by !== 'created_at' &&
      (allowRecommendedSort || filters.sort_by !== 'recommended')
    ) params.sort_by = filters.sort_by
    if (filters.sort_order !== 'desc') params.sort_order = filters.sort_order
    return params
  })
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="min-w-0 marketplace-page">
    <section class="bg-card border border-border rounded-2xl p-6 shadow-xs">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="font-medium uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">
            {isOrganizationShell
              ? t('task.marketplace_page.org_eyebrow', {}, 'Organization / Task marketplace')
              : t('task.marketplace_page.user_eyebrow', {}, 'User / Task marketplace')}
          </div>
          <h1 class="text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <div class="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('task.marketplace_page.total_label', { count: pagination.total, label: totalLabel }, ':count :label')}
          </div>
          <div class="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('task.marketplace_page.showing_range', { range: showingRange, total: pagination.total }, 'Showing :range / :total')}
          </div>
        </div>
      </div>

      <MarketplaceFilters {filters} {availableSkills} {allowRecommendedSort} />

    {#if tasks.length === 0}
      <div class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        <Search class="h-12 w-12 mb-4 opacity-50" />
        <h2>{t('task.marketplace_page.empty_title', {}, 'No tasks found')}</h2>
        <p>{t('task.marketplace_page.empty_description', {}, 'Try different filters.')}</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each tasks as task (task.id)}
          <MarketplaceTaskCard {task} {marketplaceContext} onApply={handleApply} />
        {/each}
      </div>

      {#if pagination.mode === 'offset'}
        <UnifiedOffsetPagination
          pagination={pagination}
          baseUrl="/marketplace/tasks"
          queryParams={paginationParams()}
        />
      {/if}
    {/if}
    </section>
  </div>
</AppLayout>

<!-- Apply Modal -->
<ApplyTaskModal
  task={selectedTask}
  open={applyModalOpen}
  onOpenChange={(value: boolean) => {
    applyModalOpen = value
  }}
/>
