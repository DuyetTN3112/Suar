<script lang="ts">
  /**
   * MarketplaceFilters — filter bar for marketplace task listing.
   * Emits changes via Inertia router.get to reload with server-side filtering.
   */
  import { router } from '@inertiajs/svelte'
  import { Search, X } from 'lucide-svelte'

  import { DIFFICULTY_CONFIG, SORT_OPTIONS, type MarketplaceFilters as Filters } from '../types.svelte'

  interface Props {
    filters: Filters
  }

  const props: Props = $props()
  const filters = $derived(props.filters)

  let keyword = $state('')
  let difficulty = $state('')
  let sortBy = $state('created_at')
  let sortOrder = $state('desc')
  let validationError = $state('')

  $effect(() => {
    keyword = filters.keyword ?? ''
    difficulty = filters.difficulty ?? ''
    sortBy = filters.sort_by
    sortOrder = filters.sort_order
  })

  function validateFilters(): boolean {
    validationError = ''
    return true
  }

  function applyFilters() {
    if (!validateFilters()) {
      return
    }

    const params: Record<string, string | number> = {
      sort_by: sortBy,
      sort_order: sortOrder,
    }
    if (keyword.trim()) params.keyword = keyword.trim()
    if (difficulty) params.difficulty = difficulty

    router.get('/marketplace/tasks', params, {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function clearFilters() {
    keyword = ''
    difficulty = ''
    sortBy = 'created_at'
    sortOrder = 'desc'
    validationError = ''
    router.get('/marketplace/tasks', {}, { preserveScroll: true })
  }

  function handleKeywordKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      applyFilters()
    }
  }

  const hasActiveFilters = $derived(
    !!keyword.trim() ||
      !!difficulty ||
      sortBy !== 'created_at' ||
      sortOrder !== 'desc'
  )

  const difficulties = Object.entries(DIFFICULTY_CONFIG) as [string, { labelVi: string }][]
</script>

<div class="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-muted/20 p-4 mt-6">
  <div class="space-y-1.5 flex flex-col flex-1 min-w-[200px]">
    <label for="keyword-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Từ khóa</label>
    <div class="relative">
      <input
        id="keyword-filter"
        type="text"
        class="flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden focus:ring-1 focus:ring-foreground"
        placeholder="Tên hoặc mô tả nhiệm vụ..."
        value={keyword}
        oninput={(event: Event) => {
          keyword = (event.currentTarget as HTMLInputElement).value
        }}
        onkeydown={handleKeywordKeydown}
      />
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <Search class="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  </div>

  <div class="space-y-1.5 flex flex-col min-w-[140px]">
    <label for="difficulty-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Độ khó</label>
    <select
      id="difficulty-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={difficulty}
      onchange={applyFilters}
    >
      <option value="">Tất cả</option>
      {#each difficulties as [value, config]}
        <option {value}>{config.labelVi}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-1.5 flex flex-col min-w-[140px]">
    <label for="sort-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Sắp xếp</label>
    <select
      id="sort-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={sortBy}
      onchange={applyFilters}
    >
      {#each SORT_OPTIONS as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>

  <button
    class="flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted/50 cursor-pointer"
    type="button"
    onclick={() => { sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'; applyFilters() }}
  >
    {sortOrder === 'desc' ? '↓ Giảm dần' : '↑ Tăng dần'}
  </button>

  <button
    class="flex h-10 items-center gap-1.5 rounded-xl bg-black text-white px-5 py-2 text-sm font-bold transition-all hover:bg-black/90 cursor-pointer"
    type="button"
    onclick={applyFilters}
  >
    Lọc
  </button>

  {#if hasActiveFilters}
    <button
      class="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background text-muted-foreground px-4 py-2 text-sm font-bold transition-all hover:bg-muted/50 hover:text-foreground cursor-pointer"
      type="button"
      onclick={clearFilters}
    >
      <X class="h-4 w-4" />
      Xóa lọc
    </button>
  {/if}

  {#if validationError}
    <p class="text-sm text-destructive font-medium w-full mt-2">{validationError}</p>
  {/if}
</div>
