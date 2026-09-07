<script lang="ts">
  import {
    Building2,
    FolderKanban,
    MessageSquareText,
    SquareCheckBig,
    UserRoundSearch,
    Sparkles,
  } from 'lucide-svelte'
  import { defaultTranslate, type TranslateFn } from '../lib/translation'
  import type { DiscoveryPresentationHit } from '../discovery_presentation'
  import type { EntityType, HighlightSegment } from '../types'

  interface Props {
    query: string
    result: DiscoveryPresentationHit
    onclick: (result: DiscoveryPresentationHit) => void
    t?: TranslateFn
  }

  const { query, result, onclick, t = defaultTranslate }: Props = $props()

  function iconFor(type: EntityType) {
    switch (type) {
      case 'task': return SquareCheckBig
      case 'project': return FolderKanban
      case 'comment': return MessageSquareText
      case 'talent': return UserRoundSearch
      case 'skill': return Sparkles
      case 'organization': return Building2
    }
  }

  function highlightSegments(value: string): HighlightSegment[] {
    const foldedQuery = foldSearchText(query.trim())
    if (!foldedQuery) return [{ text: value, match: false }]

    const foldedValue = foldSearchText(value)
    const matchIndex = foldedValue.indexOf(foldedQuery)
    if (matchIndex < 0) return [{ text: value, match: false }]

    const end = matchIndex + foldedQuery.length
    return [
      ...(matchIndex > 0 ? [{ text: value.slice(0, matchIndex), match: false }] : []),
      { text: value.slice(matchIndex, end), match: true },
      ...(end < value.length ? [{ text: value.slice(end), match: false }] : []),
    ]
  }

  function foldSearchText(value: string): string {
    return value
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
  }

  const Icon = $derived(iconFor(result.entityType))
  const titleSegments = $derived(highlightSegments(result.presentation?.title ?? ''))
</script>

<a
  class="group grid gap-4 rounded-2xl border border-border bg-background p-4 shadow-suar-xs transition hover:border-foreground/50 hover:bg-muted/20"
  href={result.presentation?.url}
  onclick={() => onclick(result)}
  data-search-result-mode="discovery"
>
  <div class="flex items-start gap-4">
    <span class="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-muted/50">
      <Icon class="size-5 text-foreground" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="flex flex-wrap items-center gap-2">
        <span class="rounded-lg bg-foreground px-2.5 py-1 text-xs font-black uppercase tracking-wide text-background">
          #{result.rank}
        </span>
        <span class="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
          {result.presentation?.sourceLabel}
        </span>
        <span class="text-xs uppercase text-muted-foreground">
          {t(`workspace.search.tabs.${result.entityType}`, {}, result.entityType)}
        </span>
      </span>

      <span class="mt-3 block text-lg font-black text-foreground group-hover:underline">
        {#each titleSegments as segment}
          {#if segment.match}
            <mark class="rounded bg-primary/20 px-1 font-semibold text-foreground">{segment.text}</mark>
          {:else}
            {segment.text}
          {/if}
        {/each}
      </span>

      {#if result.presentation?.breadcrumbs.length}
        <span class="mt-1 block text-xs font-medium text-muted-foreground">
          {result.presentation.breadcrumbs.join(' / ')}
        </span>
      {/if}

      {#if result.presentation?.snippets.length}
        <span class="mt-3 grid gap-2">
          {#each result.presentation.snippets as snippet}
            <span class="block rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm leading-6 text-muted-foreground">
              {#each highlightSegments(snippet) as segment}
                {#if segment.match}
                  <mark class="rounded bg-primary/20 px-1 font-semibold text-foreground">{segment.text}</mark>
                {:else}
                  {segment.text}
                {/if}
              {/each}
            </span>
          {/each}
        </span>
      {/if}

      <span
        class="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-xs"
        aria-label={t('workspace.search.result.evidence_aria', {}, 'Result evidence')}
      >
        {#if typeof result.score === 'number'}
          <span class="rounded-lg bg-muted px-2.5 py-1 font-semibold text-foreground">
            {t('workspace.search.result.relevance', { score: result.score }, 'Relevance :score')}
          </span>
        {/if}
        <span class="rounded-lg border border-border px-2.5 py-1 font-bold text-foreground">
          {result.presentation?.primaryActionLabel}
        </span>
      </span>
    </span>
  </div>
</a>
