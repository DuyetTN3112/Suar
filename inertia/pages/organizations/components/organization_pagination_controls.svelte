<script lang="ts">
  import { ChevronLeft, ChevronRight } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'

  interface Props {
    page: number
    totalPages: number
    onPrev: () => void
    onNext: () => void
    dark?: boolean
  }

  const { page, totalPages, onPrev, onNext, dark = false }: Props = $props()
</script>

{#if totalPages > 1}
  <div class="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      class={`h-10 rounded-full px-3 text-xs font-black ${dark ? '!border-white/20 !bg-white/10 !text-white hover:!bg-white/15' : 'bg-card'}`}
      onclick={onPrev}
      disabled={page === 1}
    >
      <ChevronLeft class="h-3.5 w-3.5" />
    </Button>

    <div class={`rounded-full border-2 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] shadow-xs ${dark ? 'border-white/20 bg-white/10 text-white/80' : 'border-border bg-card text-muted-foreground'}`}>
      {page} / {totalPages}
    </div>

    <Button
      variant="outline"
      size="sm"
      class={`h-10 rounded-full px-3 text-xs font-black ${dark ? '!border-white/20 !bg-white/10 !text-white hover:!bg-white/15' : 'bg-card'}`}
      onclick={onNext}
      disabled={page === totalPages}
    >
      <ChevronRight class="h-3.5 w-3.5" />
    </Button>
  </div>
{/if}
