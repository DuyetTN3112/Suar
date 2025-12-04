<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import SlicePanel from '@/apps/org/modules/tasks/components/status_board_panel.svelte'
  import type { SliceItem, SliceMetadata } from '@/apps/org/modules/tasks/types/status_board_types'

  interface Props {
    shellMode?: 'app' | 'organization'
    items: SliceItem[]
    metadata: SliceMetadata
    pagination: OffsetPagePagination
    auth?: {
      user?: {
        current_organization_role?: string | null
      } | null
    }
  }

  const { items, metadata, pagination, auth }: Props = $props()
  const { t } = useTranslation()
  

  let isOptimisticActive = $state(false)
  let localItems = $state<SliceItem[]>([])
  let conflictMessage = $state<string | null>(null)
  let errorMessage = $state<string | null>(null)
  let simulateConflict = $state(false)

  $effect(() => {
    if (!isOptimisticActive) {
      localItems = [...items]
    }
  })

  function refreshSlice() {
    router.reload({
      only: ['items', 'metadata', 'flash'],
    })
  }

  function runMutationExample() {
    isOptimisticActive = true
    conflictMessage = null
    errorMessage = null

    router.patch(
      '/api/v1/tasks/board-state',
      {
        total: metadata.total,
        simulateConflict,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          isOptimisticActive = false
        },
        onError: (errors) => {
          const maybeStatus = errors as { status?: number }
          isOptimisticActive = false

          if (maybeStatus.status === 409) {
            conflictMessage = 'Concurrent update detected. Syncing latest server state.'
            router.reload({
              only: ['items', 'metadata', 'flash'],
            })
            return
          }

          errorMessage = 'Mutation failed. Please retry or reload the page.'
        },
      }
    )
  }
</script>

<OrganizationLayout title={t('task.status_board.title', {}, 'Task status board')}>
  <div class="space-y-4 p-4 sm:p-6">
    <header class="space-y-1">
      <h1 class="text-lg font-semibold">{t('task.status_board.title', {}, 'Task status board')}</h1>
      <p class="text-sm text-muted-foreground">{auth?.user?.current_organization_role ?? 'guest'}</p>
    </header>

    {#if conflictMessage}
      <p class="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        {conflictMessage}
      </p>
    {/if}

    {#if errorMessage}
      <p class="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {errorMessage}
      </p>
    {/if}

    <div class="flex gap-2">
      <button type="button" class="rounded border px-3 py-1 text-sm" onclick={refreshSlice}>
        {t('common.refresh', {}, 'Refresh')}
      </button>
      <button type="button" class="rounded border px-3 py-1 text-sm" onclick={runMutationExample}>
        {t('task.status_board.run_mutation', {}, 'Run test update')}
      </button>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" bind:checked={simulateConflict} />
        {t('task.status_board.simulate_conflict', {}, 'Simulate conflict')}
      </label>
    </div>

    <SlicePanel
      items={localItems}
      currentOrganizationRole={auth?.user?.current_organization_role ?? null}
      onRefresh={refreshSlice}
    />
    <UnifiedOffsetPagination
      {pagination}
      baseUrl="/tasks/status-board"
      queryParams={{ limit: pagination.perPage }}
    />
  </div>
</OrganizationLayout>
