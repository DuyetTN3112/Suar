<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import { ChevronLeft, ChevronRight } from 'lucide-svelte'

  interface Props {
    page: number
    totalPages: number
    onPrev: () => void
    onNext: () => void
  }

  const { page, totalPages, onPrev, onNext }: Props = $props()
</script>

{#if totalPages > 1}
  <div class="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      class="h-7 text-xs"
      onclick={onPrev}
      disabled={page === 1}
    >
      <ChevronLeft class="h-3 w-3 mr-1" />
      Truoc
    </Button>

    <div class="text-xs">
      <span class="font-medium">{page}</span> / {totalPages}
    </div>

    <Button
      variant="outline"
      size="sm"
      class="h-7 text-xs"
      onclick={onNext}
      disabled={page === totalPages}
    >
      Sau
      <ChevronRight class="h-3 w-3 ml-1" />
    </Button>
  </div>
{/if}
