<script lang="ts">
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { FieldFacet, FilterType, SourceStatus } from '../types'

  interface Props {
    tabs: Array<{ type: FilterType; label: string }>
    activeFilter: FilterType
    fieldFacets: FieldFacet[]
    activeField: string | null
    sourceStatuses: SourceStatus[]
    domainCountLabel: (type: FilterType) => string
    selectFilter: (type: FilterType) => void
    selectField: (label: string | null) => void
  }

  const {
    tabs,
    activeFilter,
    fieldFacets,
    activeField,
    sourceStatuses,
    domainCountLabel,
    selectFilter,
    selectField,
  }: Props = $props()
  const { t } = useTranslation()

  function sourceStatusClass(status: SourceStatus['status']): string {
    if (status === 'ok') return 'bg-primary/10 text-foreground'
    if (status === 'skipped') return 'bg-muted text-muted-foreground'
    return 'bg-secondary/40 text-foreground'
  }

  function sourceHitLabel(count: number): string {
    return count === 1
      ? t('workspace.search.filters.hit_one', {}, '1 hit')
      : t('workspace.search.filters.hit_many', { count }, ':count hits')
  }

  function sourceStatusLabel(status: SourceStatus['status']): string {
    if (status === 'ok') return t('workspace.search.filters.status.ok', {}, 'Available')
    if (status === 'skipped') return t('workspace.search.filters.status.skipped', {}, 'Skipped')
    if (status === 'failed') return t('workspace.search.filters.status.failed', {}, 'Failed')
    return t('workspace.search.filters.status.timed_out', {}, 'Timed out')
  }
</script>

<aside class="space-y-3">
  <div class="rounded-2xl border border-border bg-background p-3">
    <div class="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
      {t('workspace.search.filters.domains', {}, 'Domains')}
    </div>
    <div
      class="grid gap-2"
      aria-label={t('workspace.search.filters.domains_aria', {}, 'Search result filters')}
    >
      {#each tabs as tab}
        <button
          class={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
            activeFilter === tab.type
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
          type="button"
          onclick={() => selectFilter(tab.type)}
        >
          <span>{tab.label}</span>
          <span class="font-mono text-xs">{domainCountLabel(tab.type)}</span>
        </button>
      {/each}
    </div>
  </div>
  {#if fieldFacets.length > 0}
    <div class="rounded-2xl border border-border bg-background p-3">
      <div class="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {t('workspace.search.filters.match_map', {}, 'Match map')}
      </div>
      <div
        class="grid gap-2"
        aria-label={t(
          'workspace.search.filters.match_map_aria',
          {},
          'Search match field breakdown'
        )}
      >
        {#each fieldFacets as facet}
          <button
            class={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
              activeField === facet.label
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-muted/20 text-foreground hover:border-foreground/50'
            }`}
            type="button"
            onclick={() => selectField(facet.label)}
          >
            <span class="min-w-0">
              <span class="block truncate font-semibold">{facet.label}</span>
              <span
                class={`block text-[11px] uppercase ${
                  activeField === facet.label ? 'text-background/70' : 'text-muted-foreground'
                }`}
              >
                {facet.entityType}
              </span>
            </span>
            <span class="font-mono text-xs font-bold">{facet.count}</span>
          </button>
        {/each}
      </div>
      {#if activeField}
        <button
          class="mt-3 w-full rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
          type="button"
          onclick={() => selectField(null)}
        >
          {t('workspace.search.filters.clear_field', {}, 'Clear field filter')}
        </button>
      {/if}
    </div>
  {/if}
  {#if sourceStatuses.length > 0}
    <div class="rounded-2xl border border-border bg-background p-3">
      <div class="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {t('workspace.search.filters.source_health', {}, 'Source health')}
      </div>
      <div
        class="grid gap-2"
        aria-label={t(
          'workspace.search.filters.source_health_aria',
          {},
          'Search source health'
        )}
      >
        {#each sourceStatuses as source}
          <div class="rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm">
            <div class="flex items-center justify-between gap-3">
              <span class="font-semibold text-foreground">{source.source}</span>
              <span
                class={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${sourceStatusClass(source.status)}`}
              >
                {sourceStatusLabel(source.status)}
              </span>
            </div>
            <div class="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{sourceHitLabel(source.resultCount)}</span>
              <span>
                {t(
                  'workspace.search.filters.duration_ms',
                  { duration: source.durationMs ?? 0 },
                  ':duration ms'
                )}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  <div class="rounded-2xl border border-border bg-muted/25 p-4 text-sm leading-6 text-muted-foreground">
    {t(
      'workspace.search.filters.ranking_note',
      {},
      'Results are ranked by identity fields first, then description, context, and comment matches. Data fanout is capped per source to avoid heavy search bursts.'
    )}
  </div>
</aside>
