<script lang="ts">
  import { ScanSearch } from 'lucide-svelte'

  import { useSearch } from '@/stores/search.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import { cn } from '$lib/utils-svelte'

  import Button from './ui/button.svelte'


  interface Props {
    class?: string
    type?: string
    placeholder?: string
  }

  const { class: className = '', placeholder }: Props = $props()

  const search = useSearch()
  const { t } = useTranslation()

  const searchPlaceholder = $derived(placeholder ?? t('common.search', {}, 'Tìm kiếm...'))
</script>

<Button
  variant="outline"
  class={cn(
    'bg-muted/25 text-muted-foreground hover:bg-muted/50 relative h-8 w-full flex-1 justify-start rounded-md text-sm font-normal shadow-none sm:pr-12 md:w-40 md:flex-none lg:w-56 xl:w-64',
    className
  )}
  onclick={() => { search.open(); }}
>
  <ScanSearch
    aria-hidden="true"
    class="absolute top-1/2 left-1.5 -translate-y-1/2"
  />
  <span class="ml-3">{searchPlaceholder}</span>
  <kbd class="bg-muted pointer-events-none absolute top-[0.3rem] right-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
    <span class="text-xs">⌘</span>K
  </kbd>
</Button>
