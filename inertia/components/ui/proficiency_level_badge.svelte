<script lang="ts">
  import Tooltip from '@/components/ui/tooltip.svelte'
  import TooltipContent from '@/components/ui/tooltip_content.svelte'
  import TooltipTrigger from '@/components/ui/tooltip_trigger.svelte'

  import { cn } from '$lib/utils-svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    display_name: string
    short_name?: string
    generic_description?: string
  }

  interface Props {
    level: ProficiencyLevel | null | undefined
    size?: 'xs' | 'sm' | 'md'
    showOrdinal?: boolean
    class?: string
  }

  const { level, size = 'sm', showOrdinal = false, class: className = '' }: Props = $props()

  // Color by ordinal: 1-2=slate, 3-4=blue, 5-6=indigo, 7-8=violet
  const colorClass = $derived(() => {
    if (!level) return 'bg-slate-100 text-slate-500 border-slate-200'
    const o = level.ordinal
    if (o <= 2) return 'bg-slate-100 text-slate-600 border-slate-200'
    if (o <= 4) return 'bg-blue-50 text-blue-700 border-blue-200'
    if (o <= 6) return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    return 'bg-violet-50 text-violet-700 border-violet-200'
  })

  const sizeClass = $derived(() => {
    if (size === 'xs') return 'px-1.5 py-0 text-[10px] font-semibold'
    if (size === 'md') return 'px-3 py-1 text-sm font-semibold'
    return 'px-2 py-0.5 text-xs font-semibold'
  })
</script>

{#if level}
  <Tooltip>
    <TooltipTrigger>
      <span
        class={cn(
          'inline-flex items-center gap-1 rounded border whitespace-nowrap transition-colors',
          colorClass(),
          sizeClass(),
          className
        )}
      >
        {#if showOrdinal}
          <span class="opacity-60">L{level.ordinal}</span>
        {/if}
        {level.short_name ?? level.display_name}
      </span>
    </TooltipTrigger>
    {#if level.generic_description}
      <TooltipContent class="max-w-xs text-left font-normal normal-case">
        <p class="font-bold">{level.display_name}</p>
        <p class="mt-0.5 opacity-90">{level.generic_description}</p>
      </TooltipContent>
    {/if}
  </Tooltip>
{:else}
  <span class={cn('inline-flex items-center px-2 py-0.5 rounded border text-xs text-slate-400 border-slate-200 bg-slate-50', className)}>
    —
  </span>
{/if}
