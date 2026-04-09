<script lang="ts">
  import type { SliceItem } from '../status_board_types'
  import { canEditItem } from '../status_board_policy'

  interface Props {
    items: SliceItem[]
    currentOrganizationRole: string | null
    onRefresh: () => void
    onEdit?: (item: SliceItem) => void
  }

  const { items, currentOrganizationRole, onRefresh, onEdit }: Props = $props()
</script>

<section class="space-y-4 rounded border-l-4 border-blue-500 bg-blue-50 p-4">
  <div class="flex items-center justify-between">
    <h2 class="text-base font-semibold">status_board Panel</h2>
    <button
      type="button"
      class="rounded border border-blue-300 bg-blue-100 px-3 py-1 text-sm hover:bg-blue-200"
      onclick={onRefresh}
    >
      Refresh
    </button>
  </div>

  {#if items.length === 0}
    <p class="py-4 text-sm text-gray-500">No items in this slice yet.</p>
  {:else}
    <ul class="space-y-2">
      {#each items as item (item.id)}
        <li class="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
          <span>{item.name}</span>
          {#if canEditItem(item, currentOrganizationRole) && onEdit}
            <button
              type="button"
              class="text-xs text-blue-600 hover:underline"
              onclick={() => {
                onEdit(item)
              }}
            >
              Edit
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
