<script lang="ts">
  import { Search } from 'lucide-svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type { MatchStrength, SearchCenterResult } from '../types'

  interface Props {
    searchInput: string
    totalResults: number
    nonEmptyDomainCount: number
    strongestResult: SearchCenterResult | null
    submitSearch: (event: SubmitEvent) => void
  }

  let {
    searchInput = $bindable(),
    totalResults,
    nonEmptyDomainCount,
    strongestResult,
    submitSearch,
  }: Props = $props()
  const { t } = useTranslation()

  function matchLabel(strength: MatchStrength | undefined): string {
    switch (strength) {
      case 'exact':
        return t('common.search_center.match.exact', {}, 'Exact match')
      case 'strong':
        return t('common.search_center.match.strong', {}, 'Strong match')
      case 'partial':
        return t('common.search_center.match.partial', {}, 'Partial match')
      default:
        return t('common.search_center.match.context', {}, 'Context match')
    }
  }
</script>

<div class="rounded-2xl border border-border bg-card p-5 shadow-suar-xs">
  <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div class="max-w-3xl">
      <p class="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">
        {t('common.search_center.eyebrow', {}, 'Search intelligence')}
      </p>
      <h1 class="mt-2 text-4xl font-black tracking-normal text-foreground">
        {t('common.search_center.title', {}, 'Search Center')}
      </h1>

    </div>
    <div class="grid min-w-[260px] grid-cols-2 gap-2 text-sm">
      <div class="rounded-xl border border-border bg-background p-3">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t('common.search_center.coverage', {}, 'Coverage')}
        </div>
        <div class="mt-1 text-lg font-black text-foreground">
          {t('common.search_center.coverage_value', { results: totalResults, domains: nonEmptyDomainCount }, ':results results across :domains domains')}
        </div>
      </div>
      <div class="rounded-xl border border-border bg-background p-3">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t('common.search_center.top_signal', {}, 'Top signal')}
        </div>
        <div class="mt-1 truncate text-lg font-black text-foreground">
          {strongestResult ? matchLabel(strongestResult.matchStrength) : t('common.search_center.no_query', {}, 'No query')}
        </div>
      </div>
    </div>
  </div>

  <form class="relative" onsubmit={submitSearch}>
    <Search class="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
    <input
      bind:value={searchInput}
      class="h-14 w-full rounded-md border border-border bg-background pl-12 pr-28 text-base shadow-sm outline-none transition focus:border-foreground focus:ring-2 focus:ring-ring"
      name="q"
      placeholder={t('common.search_center.placeholder', {}, 'Search tasks, projects, comments, talent, skills, organizations...')}
    />
    <button
      class="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/90"
      type="submit"
    >
      {t('common.search_center.search_button', {}, 'Search')}
    </button>
  </form>
</div>
