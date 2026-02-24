<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

  type Props = HTMLAttributes<HTMLElement> & {
    title: string
    description?: string | null
    eyebrow?: string | null
    meta?: string | null
    actions?: Snippet
    class?: string
  }

  const {
    title,
    description = null,
    eyebrow = null,
    meta = null,
    actions,
    class: className,
    ...restProps
  }: Props = $props()
</script>

<header
  data-testid="page-header"
  class={cn('flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between', className)}
  {...restProps}
>
  <div class="min-w-0 space-y-2">
    {#if eyebrow || meta}
      <div class="flex flex-wrap items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {#if eyebrow}
          <span>{eyebrow}</span>
        {/if}
        {#if eyebrow && meta}
          <span aria-hidden="true">•</span>
        {/if}
        {#if meta}
          <span>{meta}</span>
        {/if}
      </div>
    {/if}

    <div class="space-y-2">
      <h1 class="text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {#if description}
        <p class="max-w-3xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
      {/if}
    </div>
  </div>

  {#if actions}
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      {@render actions()}
    </div>
  {/if}
</header>
