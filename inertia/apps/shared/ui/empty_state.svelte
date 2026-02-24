<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

  type Props = HTMLAttributes<HTMLElement> & {
    title: string
    description?: string | null
    eyebrow?: string | null
    icon?: Snippet
    action?: Snippet
    class?: string
  }

  const {
    title,
    description = null,
    eyebrow = null,
    icon,
    action,
    class: className,
    ...restProps
  }: Props = $props()
</script>

<section
  data-testid="empty-state"
  class={cn(
    'rounded-3xl border border-dashed border-border bg-card/80 px-6 py-10 text-center text-card-foreground shadow-sm',
    className
  )}
  {...restProps}
>
  <div class="mx-auto flex max-w-md flex-col items-center gap-4">
    <div class="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted text-lg font-black text-muted-foreground">
      {#if icon}
        {@render icon()}
      {:else}
        <span aria-hidden="true">∅</span>
      {/if}
    </div>

    <div class="space-y-2">
      {#if eyebrow}
        <p class="text-[0.68rem] font-black uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      {/if}
      <h2 class="text-balance text-xl font-black tracking-tight text-foreground">{title}</h2>
      {#if description}
        <p class="text-pretty text-sm leading-6 text-muted-foreground">{description}</p>
      {/if}
    </div>

    {#if action}
      <div class="pt-1">
        {@render action()}
      </div>
    {/if}
  </div>
</section>
