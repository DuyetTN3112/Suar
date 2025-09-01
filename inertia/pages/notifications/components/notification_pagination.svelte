<script lang="ts">
  import Button from '@/components/ui/button.svelte'

  interface PaginationMeta {
    last_page: number
  }

  interface Props {
    hasPreviousPage: boolean
    hasNextPage: boolean
    currentPage: number
    paginationMeta?: PaginationMeta
    onPageChange: (nextPage: number) => void
  }

  const { hasPreviousPage, hasNextPage, currentPage, paginationMeta, onPageChange }: Props = $props()
</script>

{#if hasPreviousPage || hasNextPage}
  <div class="flex items-center justify-center gap-3 pt-4">
    <Button
      variant="outline"
      class="font-bold"
      disabled={!hasPreviousPage}
      onclick={() => { onPageChange(currentPage - 1) }}
    >
      Trang trước
    </Button>
    <span class="text-sm text-muted-foreground">
      Trang {currentPage}{#if paginationMeta} / {paginationMeta.last_page}{/if}
    </span>
    <Button
      variant="outline"
      class="font-bold"
      disabled={!hasNextPage}
      onclick={() => { onPageChange(currentPage + 1) }}
    >
      Trang sau
    </Button>
  </div>
{/if}
