<script lang="ts">
  /**
   * Marketplace Tasks Page — GET /marketplace/tasks
   * Browse public tasks available for freelancers to apply.
   */
  import { Search } from 'lucide-svelte'

  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import ApplyTaskModal from './components/apply_task_modal.svelte'
  import MarketplaceFilters from './components/marketplace_filters.svelte'
  import MarketplaceTaskCard from './components/marketplace_task_card.svelte'
  import SimplePagination from './components/simple_pagination.svelte'
  import type { MarketplaceTasksProps, MarketplaceTask } from './types.svelte'

  interface Props {
    tasks: MarketplaceTasksProps['tasks']
    meta: MarketplaceTasksProps['meta']
    filters: MarketplaceTasksProps['filters']
  }

  const { tasks, meta, filters }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('marketplace.tasks', {}, 'Marketplace'))

  let applyModalOpen = $state(false)
  let selectedTask = $state<MarketplaceTask | null>(null)

  function handleApply(task: MarketplaceTask) {
    selectedTask = task
    applyModalOpen = true
  }

  // Build extra params for pagination (preserve current filters)
  const paginationParams = $derived(() => {
    const params: Record<string, unknown> = {}
    if (filters.keyword?.trim()) params.keyword = filters.keyword.trim()
    if (filters.difficulty) params.difficulty = filters.difficulty
    if (filters.min_budget !== null && filters.min_budget !== undefined)
      params.min_budget = filters.min_budget
    if (filters.max_budget !== null && filters.max_budget !== undefined)
      params.max_budget = filters.max_budget
    if (filters.sort_by !== 'created_at') params.sort_by = filters.sort_by
    if (filters.sort_order !== 'desc') params.sort_order = filters.sort_order
    return params
  })
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">{pageTitle}</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Tìm kiếm và ứng tuyển các nhiệm vụ công khai
        </p>
      </div>
      <div class="text-sm text-muted-foreground">
        {meta.total} nhiệm vụ
      </div>
    </div>

    <!-- Filters -->
    <MarketplaceFilters {filters} />

    <!-- Content -->
    {#if tasks.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Search class="h-12 w-12 mb-4 opacity-50" />
        <p class="text-lg font-medium">Không tìm thấy nhiệm vụ nào</p>
        <p class="text-sm mt-1">Thử thay đổi bộ lọc hoặc quay lại sau</p>
      </div>
    {:else}
      <div class="grid gap-5 grid-cols-1">
        {#each tasks as task (task.id)}
          <MarketplaceTaskCard {task} onApply={handleApply} />
        {/each}
      </div>

      <SimplePagination {meta} baseUrl="/marketplace/tasks" extraParams={paginationParams()} />
    {/if}
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
