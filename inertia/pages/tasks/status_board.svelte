<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import SlicePanel from './_components/status_board_panel.svelte'
  import type { SliceItem, SliceMetadata } from './status_board_types'

  interface Props {
    items: SliceItem[]
    metadata: SliceMetadata
    auth: {
      user: {
        current_organization_role: string | null
      } | null
    }
  }

  const { items, metadata, auth }: Props = $props()

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
      '/api/tasks/status-board',
      {
        total: metadata.total,
        simulate_conflict: simulateConflict,
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

<div class="space-y-4 p-4 sm:p-6">
  <header class="space-y-1">
    <h1 class="text-lg font-semibold">status_board Slice</h1>
    <p class="text-sm text-muted-foreground">Role: {auth.user?.current_organization_role || 'guest'}</p>
  </header>

  {#if conflictMessage}
    <p class="rounded border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900">
      {conflictMessage}
    </p>
  {/if}

  {#if errorMessage}
    <p class="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
      {errorMessage}
    </p>
  {/if}

  <div class="flex gap-2">
    <button type="button" class="rounded border px-3 py-1 text-sm" onclick={refreshSlice}>
      Reload (only)
    </button>
    <button type="button" class="rounded border px-3 py-1 text-sm" onclick={runMutationExample}>
      Mutation Sample
    </button>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={simulateConflict} />
      Simulate conflict (409)
    </label>
  </div>

  <SlicePanel
    items={localItems}
    currentOrganizationRole={auth.user?.current_organization_role ?? null}
    onRefresh={refreshSlice}
  />
</div>
