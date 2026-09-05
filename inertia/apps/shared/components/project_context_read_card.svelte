<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags -- sanitizedRichContent is allow-listed before rendering */
  import { sanitizeRichContent } from './sanitize_rich_content'
  import type { ProjectContextReadModel } from './project_context_types'

  interface Props {
    projectContext: ProjectContextReadModel | null | undefined
  }

  let { projectContext }: Props = $props()
  const context = $derived(projectContext?.context ?? null)
  const sanitizedRichContent = $derived(context ? sanitizeRichContent(context.rich_content) : '')
</script>

<section class="rounded-2xl border border-border bg-card p-5" aria-label="Project Context">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p class="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Project Context</p>
      <h2 class="mt-2 text-xl font-black text-foreground">{context?.title ?? 'No active Project Context'}</h2>
    </div>
    {#if context}
      <div class="text-right text-xs text-muted-foreground">
        <p>Version {context.version_number}</p>
        <p class="capitalize">{context.privacy_classification}</p>
      </div>
    {/if}
  </div>

  {#if context}
    <p class="mt-3 text-sm text-muted-foreground">{context.summary}</p>
    {#if sanitizedRichContent}
      <!-- eslint-disable svelte/no-at-html-tags -- content is allow-listed by sanitizeRichContent -->
      <div class="prose prose-sm mt-4 max-w-none">{@html sanitizedRichContent}</div>
      <!-- eslint-enable svelte/no-at-html-tags -->
    {:else if context.plain_text_projection}
      <p class="mt-4 whitespace-pre-wrap text-sm text-foreground">{context.plain_text_projection}</p>
    {/if}
  {:else}
    <p class="mt-3 text-sm text-muted-foreground">No published Project Context is available.</p>
  {/if}
</section>
