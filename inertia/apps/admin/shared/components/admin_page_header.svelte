<script lang="ts">
  import type { Snippet } from 'svelte'
  import { ShieldCheck } from 'lucide-svelte'

  interface Props {
    title: string
    description?: string
    badgeText?: string
    actions?: Snippet
    stats?: Snippet
  }

  const {
    title,
    description,
  badgeText = 'Admin system',
    actions,
    stats,
  }: Props = $props()
</script>

<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 shadow-suar-md mb-6">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,122,26,0.08),transparent_22rem)]"></div>
  <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div class="space-y-2">
      <div class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold text-foreground tracking-wider uppercase">
        <ShieldCheck class="h-3.5 w-3.5 text-primary" />
        {badgeText}
      </div>
      <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground">
        {title}
      </h1>
      {#if description}
        <p class="text-sm md:text-base text-muted-foreground max-w-2xl font-light">
          {description}
        </p>
      {/if}
    </div>

    {#if stats || actions}
      <div class="flex flex-col gap-4 items-start md:items-end shrink-0">
        {#if actions}
          <div class="flex flex-wrap gap-2">
            {@render actions()}
          </div>
        {/if}

        {#if stats}
          <div class="flex flex-wrap gap-2 shrink-0">
            {@render stats()}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
