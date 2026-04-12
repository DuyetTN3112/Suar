<script lang="ts">
  /**
   * SimplePagination — prev/next pagination controls with page info.
   */
  import { router } from '@inertiajs/svelte'
  import { ChevronLeft, ChevronRight } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'

  import type { PaginationMeta } from '../types.svelte'

  interface Props {
    meta: PaginationMeta
    baseUrl: string
  }

  const { meta, baseUrl }: Props = $props()

  const hasPrev = $derived(meta.current_page > 1)
  const hasNext = $derived(meta.current_page < meta.last_page)

  function goToPage(page: number) {
    router.get(baseUrl, { page }, { preserveScroll: true, preserveState: true })
  }
</script>

{#if meta.last_page > 1}
  <div class="flex items-center justify-between pt-4">
    <span class="text-sm text-muted-foreground">
      Trang {meta.current_page}/{meta.last_page} · {meta.total} kết quả
    </span>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={!hasPrev}
        onclick={() => { goToPage(meta.current_page - 1); }}
      >
        <ChevronLeft class="h-4 w-4" />
        Trước
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNext}
        onclick={() => { goToPage(meta.current_page + 1); }}
      >
        Sau
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
{/if}
