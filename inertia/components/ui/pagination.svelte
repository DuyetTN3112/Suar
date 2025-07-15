<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { ChevronLeft, ChevronRight } from 'lucide-svelte'

  import Button from './button.svelte'

  interface Props {
    currentPage: number
    totalPages: number
    baseUrl: string
    queryParams?: Record<string, unknown>
  }

  const {
    currentPage,
    totalPages,
    baseUrl,
    queryParams = {}
  }: Props = $props()

  function buildQueryString(page: number): string {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'page') {
        const strValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value)
        params.append(key, strValue)
      }
    })
    return params.toString()
  }

  function createPageUrl(page: number): string {
    const queryString = buildQueryString(page)
    return `${baseUrl}?${queryString}`
  }

  function navigateTo(page: number) {
    router.visit(createPageUrl(page))
  }

  const pages = $derived.by(() => {
    const result: (number | null)[] = []
    const maxVisiblePages = 3

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        result.push(i)
      }
    } else {
      result.push(1)

      let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2))
      const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3)

      if (endPage === totalPages - 1) {
        startPage = Math.max(2, endPage - (maxVisiblePages - 3))
      }

      if (startPage > 2) {
        result.push(null)
      }

      for (let i = startPage; i <= endPage; i++) {
        result.push(i)
      }

      if (endPage < totalPages - 1) {
        result.push(null)
      }

      result.push(totalPages)
    }
    return result
  })
</script>

<div class="flex items-center justify-center space-x-0.5">
  <!-- First page button -->
  <Button
    variant="outline"
    size="icon"
    disabled={currentPage === 1}
    class="w-5 h-5"
    onclick={() => { navigateTo(1); }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m11 17-5-5 5-5"/>
      <path d="m18 17-5-5 5-5"/>
    </svg>
  </Button>

  <!-- Previous page button -->
  <Button
    variant="outline"
    size="icon"
    disabled={currentPage === 1}
    class="w-5 h-5"
    onclick={() => { navigateTo(currentPage - 1); }}
  >
    <ChevronLeft class="h-3 w-3" />
  </Button>

  {#each pages as page}
    {#if page === null}
      <Button variant="outline" size="icon" disabled class="w-5 h-5 text-[10px]">
        ...
      </Button>
    {:else}
      <Button
        variant={currentPage === page ? 'default' : 'outline'}
        size="icon"
        class="w-5 h-5 text-[10px]"
        onclick={() => { navigateTo(page); }}
      >
        {page}
      </Button>
    {/if}
  {/each}

  <!-- Next page button -->
  <Button
    variant="outline"
    size="icon"
    disabled={currentPage === totalPages}
    class="w-5 h-5"
    onclick={() => { navigateTo(currentPage + 1); }}
  >
    <ChevronRight class="h-3 w-3" />
  </Button>

  <!-- Last page button -->
  <Button
    variant="outline"
    size="icon"
    disabled={currentPage === totalPages}
    class="w-5 h-5"
    onclick={() => { navigateTo(totalPages); }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m13 17 5-5-5-5"/>
      <path d="m6 17 5-5-5-5"/>
    </svg>
  </Button>
</div>
