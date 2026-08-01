<script lang="ts">
  import {
    Building2,
    FolderKanban,
    MessageSquareText,
    SquareCheckBig,
    UserRoundSearch,
    Sparkles,
  } from 'lucide-svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { SearchCenterResult, EntityType, MatchStrength, HighlightSegment } from '../types'

  interface Props {
    result: SearchCenterResult
    onclick: (result: SearchCenterResult) => void
  }

  const { result, onclick }: Props = $props()
  const { t } = useTranslation()

  function iconFor(type: EntityType) {
    switch (type) {
      case 'task':
        return SquareCheckBig
      case 'project':
        return FolderKanban
      case 'comment':
        return MessageSquareText
      case 'talent':
        return UserRoundSearch
      case 'skill':
        return Sparkles
      case 'organization':
        return Building2
    }
  }

  function matchLabel(strength: MatchStrength | undefined): string {
    switch (strength) {
      case 'exact':
        return t('workspace.search.result.match.exact', {}, 'Exact match')
      case 'strong':
        return t('workspace.search.result.match.strong', {}, 'Strong match')
      case 'partial':
        return t('workspace.search.result.match.partial', {}, 'Partial match')
      default:
        return t('workspace.search.result.match.context', {}, 'Context match')
    }
  }

  function snippetSegments(result: SearchCenterResult): HighlightSegment[][] {
    if (result.highlightedSnippets?.length) return result.highlightedSnippets
    return result.snippets.map((snippet) => [{ text: snippet, match: false }])
  }

  function resultBreadcrumb(result: SearchCenterResult): string {
    if (result.breadcrumbs?.length) return result.breadcrumbs.join(' / ')
    return result.parentLabel ?? ''
  }

  function supportingFieldLabels(result: SearchCenterResult): string[] {
    const labels =
      result.matchedFieldLabels && result.matchedFieldLabels.length > 0
        ? result.matchedFieldLabels
        : [result.sourceLabel]

    return labels.filter((label) => label !== result.sourceLabel)
  }

  function matchedFieldCountLabel(result: SearchCenterResult): string {
    const count = result.matchedFields.length
    return t('workspace.search.result.field_count', { count }, ':count fields')
  }

  function entityTypeLabel(type: EntityType): string {
    return t(`workspace.search.tabs.${type}`, {}, type)
  }

  const Icon = $derived(iconFor(result.entityType))
  const breadcrumb = $derived(resultBreadcrumb(result))
</script>

<a
  class="group grid gap-4 rounded-2xl border border-border bg-background p-4 shadow-suar-xs transition hover:border-foreground/50 hover:bg-muted/20"
  href={result.url}
  onclick={() => onclick(result)}
>
  <div class="flex items-start gap-4">
    <span class="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-muted/50">
      <Icon class="size-5 text-foreground" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="flex flex-wrap items-center gap-2">
        <span class="rounded-lg bg-foreground px-2.5 py-1 text-xs font-black uppercase tracking-wide text-background">
          #{result.rank ?? '-'}
        </span>
        <span class="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
          {matchLabel(result.matchStrength)}
        </span>
        <span class="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
          {result.sourceLabel}
        </span>
        <span class="text-xs uppercase text-muted-foreground">
          {entityTypeLabel(result.entityType)}
        </span>
      </span>

      <span class="mt-3 block text-lg font-black text-foreground group-hover:underline">
        {result.title}
      </span>

      {#if breadcrumb}
        <span class="mt-1 block text-xs font-medium text-muted-foreground">{breadcrumb}</span>
      {/if}

      {#if result.secondaryMeta}
        <span class="mt-3 inline-flex rounded-full border border-border bg-muted/35 px-3 py-1 text-xs font-semibold text-foreground">
          {result.secondaryMeta}
        </span>
      {/if}

      {#if supportingFieldLabels(result).length > 0}
        <span class="mt-3 flex flex-wrap gap-2">
          {#each supportingFieldLabels(result) as fieldLabel}
            <span class="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground">
              {fieldLabel}
            </span>
          {/each}
        </span>
      {/if}

      {#if snippetSegments(result).length > 0}
        <span class="mt-3 grid gap-2">
          {#each snippetSegments(result) as snippet}
            <span class="block rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm leading-6 text-muted-foreground">
              {#each snippet as segment}
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
            {t(
              'workspace.search.result.relevance',
              { score: result.score },
              'Relevance :score'
            )}
          </span>
        {/if}
        <span class="rounded-lg bg-muted px-2.5 py-1 font-semibold text-foreground">
          {matchedFieldCountLabel(result)}
        </span>
        <span class="rounded-lg border border-border px-2.5 py-1 font-bold text-foreground">
          {result.primaryActionLabel ?? t('workspace.search.result.open', {}, 'Open')}
        </span>
      </span>
    </span>
    <span class="hidden shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground sm:block">
      {result.primaryActionLabel ?? t('workspace.search.result.open', {}, 'Open')}
    </span>
  </div>
</a>
