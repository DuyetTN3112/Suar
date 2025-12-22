<script lang="ts">
  /**
   * Marketplace Tasks Page — GET /marketplace/tasks
   * Browse public tasks available for freelancers to apply.
   */
  import { page } from '@inertiajs/svelte'
  import { Search } from 'lucide-svelte'

  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import ApplyTaskModal from './components/apply_task_modal.svelte'
  import MarketplaceFilters from './components/marketplace_filters.svelte'
  import MarketplaceTaskCard from './components/marketplace_task_card.svelte'
  import SimplePagination from './components/simple_pagination.svelte'
  import type { MarketplaceTasksProps, MarketplaceTask } from './types.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    tasks: MarketplaceTasksProps['tasks']
    meta: MarketplaceTasksProps['meta']
    filters: MarketplaceTasksProps['filters']
  }

  const { tasks, meta, filters }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const { t } = useTranslation()

  const pageTitle = $derived(t('marketplace.tasks', {}, 'Marketplace'))
  const showingRange = $derived.by(() => {
    if (tasks.length === 0) return '0'
    const start = (meta.current_page - 1) * meta.per_page + 1
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
    if (filters.keyword?.trim()) params.keyword = filters.keyword.trim()
    if (filters.difficulty) params.difficulty = filters.difficulty
    if (filters.sort_by !== 'created_at') params.sort_by = filters.sort_by
    if (filters.sort_order !== 'desc') params.sort_order = filters.sort_order
    return params
  })
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <div class="min-w-0 marketplace-page">
    <section class="bg-white border border-border rounded-2xl p-6 shadow-xs">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="font-medium uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">User / Marketplace</div>
          <h1 class="text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <p class="text-base text-muted-foreground max-w-3xl">
            Bàn cơ hội dành cho user ứng tuyển task công khai. Mỗi card phải cho đọc nhanh độ phù hợp, quyền tham gia, hạn chót và brief chi tiết trước khi nộp đơn.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <div class="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{meta.total} nhiệm vụ có thể ứng tuyển</div>
          <div class="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Hiển thị {showingRange} / {meta.total}</div>
        </div>
      </div>

      <MarketplaceFilters {filters} />

    {#if tasks.length === 0}
      <div class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        <Search class="h-12 w-12 mb-4 opacity-50" />
        <h2>Không tìm thấy nhiệm vụ nào</h2>
        <p>Thử thay đổi bộ lọc hoặc quay lại sau.</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each tasks as task (task.id)}
          <MarketplaceTaskCard {task} onApply={handleApply} />
        {/each}
      </div>

      <SimplePagination {meta} baseUrl="/marketplace/tasks" extraParams={paginationParams()} />
    {/if}
    </section>
  </div>
</Layout>

<!-- Apply Modal -->
<ApplyTaskModal
  task={selectedTask}
  open={applyModalOpen}
  onOpenChange={(value: boolean) => {
    applyModalOpen = value
  }}
/>
