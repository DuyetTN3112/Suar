#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --help|-h)
      echo "Usage: bash scripts/generate_page_slice.sh [--dry-run] [--force] <module> <slice>"
      echo "Example: bash scripts/generate_page_slice.sh tasks status_board"
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

if [[ $# -lt 2 ]]; then
  echo "Usage: bash scripts/generate_page_slice.sh <module> <slice>"
  echo "Example: bash scripts/generate_page_slice.sh tasks status_board"
  exit 1
fi

MODULE_RAW="$1"
SLICE_RAW="$2"

normalize() {
  local value
  value="$(echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/_/g; s/^_+|_+$//g')"
  if [[ -z "$value" ]]; then
    echo "invalid"
    return 1
  fi
  echo "$value"
}

MODULE="$(normalize "$MODULE_RAW")"
SLICE="$(normalize "$SLICE_RAW")"

BASE_DIR="inertia/pages/${MODULE}"
COMPONENT_DIR="${BASE_DIR}/_components"
PAGE_FILE="${BASE_DIR}/${SLICE}.svelte"
TYPES_FILE="${BASE_DIR}/${SLICE}_types.ts"
POLICY_FILE="${BASE_DIR}/${SLICE}_policy.ts"
VIEW_FILE="${COMPONENT_DIR}/${SLICE}_panel.svelte"
GENERATED_DIR="inertia/generated"
GENERATED_DATA_FILE="${GENERATED_DIR}/data.ts"

mkdir -p "$COMPONENT_DIR"
mkdir -p "$GENERATED_DIR"

for file in "$PAGE_FILE" "$TYPES_FILE" "$POLICY_FILE" "$VIEW_FILE"; do
  if [[ -f "$file" && $FORCE -eq 0 ]]; then
    echo "Refusing to overwrite existing file: $file"
    exit 1
  fi
done

if [[ ! -f "$GENERATED_DATA_FILE" ]]; then
  cat > "$GENERATED_DATA_FILE" <<'EOF'
export namespace Data {
  export interface SliceItem {
    id: string
    name: string
    createdById?: string
  }

  export interface SliceMetadata {
    total: number
  }
}
EOF
fi

if [[ $DRY_RUN -eq 1 ]]; then
  echo "[dry-run] Would generate page slice scaffold:"
  echo "- $PAGE_FILE"
  echo "- $TYPES_FILE"
  echo "- $POLICY_FILE"
  echo "- $VIEW_FILE"
  echo "- $GENERATED_DATA_FILE (create if missing)"
  exit 0
fi

cat > "$TYPES_FILE" <<'EOF'
import type { Data } from '~/generated/data'

export type SliceItem = Data.SliceItem
export type SliceMetadata = Data.SliceMetadata
EOF

cat > "$POLICY_FILE" <<'EOF'
import type { SliceItem } from './__SLICE___types'

export function canEditItem(item: SliceItem, role: string | null): boolean {
  void item

  if (!role) {
    return false
  }

  return role === 'org_owner' || role === 'org_admin'
}
EOF

cat > "$VIEW_FILE" <<'EOF'
<script lang="ts">
  import type { SliceItem } from '../__SLICE___types'
  import { canEditItem } from '../__SLICE___policy'

  interface Props {
    items: SliceItem[]
    currentOrganizationRole: string | null
    onRefresh: () => void
    onEdit?: (item: SliceItem) => void
  }

  let { items, currentOrganizationRole, onRefresh, onEdit }: Props = $props()
</script>

<section class="space-y-4 rounded border-l-4 border-blue-500 bg-blue-50 p-4">
  <div class="flex items-center justify-between">
    <h2 class="text-base font-semibold">__SLICE__ Panel</h2>
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
              onclick={() => onEdit?.(item)}
            >
              Edit
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
EOF

cat > "$PAGE_FILE" <<'EOF'
<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import SlicePanel from './_components/__SLICE___panel.svelte'
  import type { SliceItem, SliceMetadata } from './__SLICE___types'

  interface Props {
    items: SliceItem[]
    metadata: SliceMetadata
    auth: {
      user: {
        current_organization_role: string | null
      } | null
    }
  }

  let { items, metadata, auth }: Props = $props()

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
      '/api/__MODULE__/__SLICE_DASH__',
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
    <h1 class="text-lg font-semibold">__SLICE__ Slice</h1>
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
EOF

# Apply normalized slice placeholder replacements.
sed -i "s/__SLICE__/${SLICE}/g" "$PAGE_FILE" "$TYPES_FILE" "$POLICY_FILE" "$VIEW_FILE"
sed -i "s/__MODULE__/${MODULE}/g" "$PAGE_FILE"
sed -i "s/__SLICE_DASH__/$(echo "$SLICE" | tr '_' '-')/g" "$PAGE_FILE"

echo "Generated page slice scaffold:"
echo "- $PAGE_FILE"
echo "- $TYPES_FILE"
echo "- $POLICY_FILE"
echo "- $VIEW_FILE"
