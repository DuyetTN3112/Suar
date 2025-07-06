<script lang="ts">
  /**
   * MarketplaceFilters — filter bar for marketplace task listing.
   * Emits changes via Inertia router.get to reload with server-side filtering.
   */
  import { router } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import { Search, X } from 'lucide-svelte'
  import { DIFFICULTY_CONFIG, SORT_OPTIONS, type MarketplaceFilters as Filters } from '../types.svelte'

  interface Props {
    filters: Filters
  }

  const props: Props = $props()
  const filters = $derived(props.filters)

  let keyword = $state('')
  let difficulty = $state('')
  let minBudget = $state('')
  let maxBudget = $state('')
  let sortBy = $state('created_at')
  let sortOrder = $state('desc')
  let validationError = $state('')

  $effect(() => {
    keyword = filters.keyword ?? ''
    difficulty = filters.difficulty ?? ''
    minBudget = filters.min_budget?.toString() ?? ''
    maxBudget = filters.max_budget?.toString() ?? ''
    sortBy = filters.sort_by
    sortOrder = filters.sort_order
  })

  function parseBudgetValue(raw: string): number | null {
    if (!raw.trim()) {
      return null
    }

    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }

  function validateFilters(): boolean {
    validationError = ''

    const min = parseBudgetValue(minBudget)
    const max = parseBudgetValue(maxBudget)

    if (min !== null && min < 0) {
      validationError = 'Ngân sách tối thiểu không được nhỏ hơn 0.'
      return false
    }

    if (max !== null && max < 0) {
      validationError = 'Ngân sách tối đa không được nhỏ hơn 0.'
      return false
    }

    if (min !== null && max !== null && max < min) {
      validationError = 'Ngân sách tối đa không được nhỏ hơn ngân sách tối thiểu.'
      return false
    }

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

    const min = parseBudgetValue(minBudget)
    const max = parseBudgetValue(maxBudget)
    if (min !== null) params.min_budget = min
    if (max !== null) params.max_budget = max

    router.get('/marketplace/tasks', params, {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function clearFilters() {
    keyword = ''
    difficulty = ''
    minBudget = ''
    maxBudget = ''
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
      !!minBudget ||
      !!maxBudget ||
      sortBy !== 'created_at' ||
      sortOrder !== 'desc'
  )

  const difficulties = Object.entries(DIFFICULTY_CONFIG) as [string, { labelVi: string }][]
</script>

<div class="flex flex-wrap items-end gap-3">
  <!-- Keyword -->
  <div class="space-y-1">
    <label for="keyword-filter" class="text-xs font-medium text-muted-foreground">Từ khóa</label>
    <Input
      id="keyword-filter"
      type="text"
      placeholder="Tên hoặc mô tả nhiệm vụ"
      class="w-56 h-9"
      value={keyword}
      oninput={(event: Event) => {
        keyword = (event.currentTarget as HTMLInputElement).value
      }}
      onkeydown={handleKeywordKeydown}
    />
  </div>

  <!-- Difficulty -->
  <div class="space-y-1">
    <label for="difficulty-filter" class="text-xs font-medium text-muted-foreground">Độ khó</label>
    <select
      id="difficulty-filter"
      bind:value={difficulty}
      onchange={applyFilters}
      class="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">Tất cả</option>
      {#each difficulties as [value, config]}
        <option {value}>{config.labelVi}</option>
      {/each}
    </select>
  </div>

  <!-- Min Budget -->
  <div class="space-y-1">
    <label for="min-budget" class="text-xs font-medium text-muted-foreground">Ngân sách tối thiểu</label>
    <Input
      id="min-budget"
      type="number"
      min="0"
      placeholder="0"
      class="w-32 h-9"
      value={minBudget}
      oninput={(event: Event) => {
        minBudget = (event.currentTarget as HTMLInputElement).value
      }}
    />
  </div>

  <!-- Max Budget -->
  <div class="space-y-1">
    <label for="max-budget" class="text-xs font-medium text-muted-foreground">Ngân sách tối đa</label>
    <Input
      id="max-budget"
      type="number"
      min="0"
      placeholder="∞"
      class="w-32 h-9"
      value={maxBudget}
      oninput={(event: Event) => {
        maxBudget = (event.currentTarget as HTMLInputElement).value
      }}
    />
  </div>

  <!-- Sort -->
  <div class="space-y-1">
    <label for="sort-filter" class="text-xs font-medium text-muted-foreground">Sắp xếp</label>
    <select
      id="sort-filter"
      bind:value={sortBy}
      onchange={applyFilters}
      class="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {#each SORT_OPTIONS as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>

  <!-- Sort order -->
  <Button
    variant="outline"
    size="sm"
    class="h-9"
    onclick={() => { sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'; applyFilters() }}
  >
    {sortOrder === 'desc' ? '↓ Giảm dần' : '↑ Tăng dần'}
  </Button>

  <!-- Apply / Clear -->
  <Button size="sm" class="h-9" onclick={applyFilters}>
    <Search class="h-3.5 w-3.5 mr-1" />
    Lọc
  </Button>

  {#if hasActiveFilters}
    <Button variant="ghost" size="sm" class="h-9" onclick={clearFilters}>
      <X class="h-3.5 w-3.5 mr-1" />
      Xóa bộ lọc
    </Button>
  {/if}

  {#if validationError}
    <p class="w-full text-xs text-destructive">{validationError}</p>
  {/if}
</div>
