<script lang="ts">
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'
  import { buildOffsetPagination, paginateOffsetItems } from '@/apps/admin/shared/lib/pagination'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Evidence {
    id: string
    evidenceType: string
    url: string
    title: string | null
    description: string | null
  }

  interface Props {
    evidences: Evidence[]
    latestCaseFile?: {
      case_version: number
      completeness_score: number
      evidences_snapshot?: Array<{
        title?: string | null
        evidence_type?: string | null
      }>
    } | null
  }

  let { evidences, latestCaseFile = null }: Props = $props()
  const { t } = useTranslation()
  const perPage = 10
  let currentPage = $state(1)
  const pagination = $derived(buildOffsetPagination({
    page: currentPage,
    perPage,
    total: evidences.length,
  }))
  const paginatedEvidences = $derived(paginateOffsetItems(evidences, pagination))
</script>

<Card class="rounded-[28px] border-border/90">
  <CardHeader class="space-y-3">
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t('task.disputes.admin_detail.evidence_tab.eyebrow', {}, 'Evidence stack')}
      </p>
      <CardTitle class="mt-2 text-2xl">{t('task.disputes.admin_detail.evidence_tab.title', { count: evidences.length }, 'Evidence (:count)')}</CardTitle>
      <p class="mt-2 text-sm text-muted-foreground">
        {t('task.disputes.admin_detail.evidence_tab.description', {}, 'Files, links, and related comments are collected so admins can reason from evidence instead of guesswork.')}
      </p>
    </div>
  </CardHeader>
  <CardContent>
    {#if latestCaseFile}
      <div class="mb-4 rounded-2xl border border-border/70 bg-muted/40 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold text-foreground">{t('task.disputes.admin_detail.evidence_tab.snapshot_title', {}, 'Evidence snapshot in dossier')}</p>
            <p class="mt-1 text-sm text-muted-foreground">
              {t(
                'task.disputes.admin_detail.resolve.case_file_version',
                { version: latestCaseFile.case_version },
                'Case file v:version'
              )}
            </p>
          </div>
          <span class="rounded-full border border-border/70 bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">
            {t(
              'task.disputes.admin_detail.resolve.completeness',
              { score: latestCaseFile.completeness_score },
              ':score% complete'
            )}
          </span>
        </div>

        {#if (latestCaseFile.evidences_snapshot ?? []).length > 0}
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            {#each latestCaseFile.evidences_snapshot ?? [] as snapshot, index}
              <div class="rounded-xl border border-border/70 bg-card p-3 text-sm">
                <div class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t('task.disputes.admin_detail.evidence_tab.snapshot_item', { index: index + 1 }, 'Snapshot #:index')}</div>
                <p class="mt-2 font-semibold text-foreground">{snapshot.title ?? t('task.disputes.admin_detail.evidence_tab.untitled', {}, 'Untitled')}</p>
                <p class="mt-1 text-xs text-muted-foreground">{snapshot.evidence_type ?? 'unknown_type'}</p>
              </div>
            {/each}
          </div>
        {:else}
          <p class="mt-3 text-sm text-muted-foreground">{t('task.disputes.admin_detail.evidence_tab.snapshot_empty', {}, 'This case file has no evidence snapshot yet.')}</p>
        {/if}
      </div>
    {/if}

    {#if evidences.length === 0}
      <p class="text-sm text-muted-foreground">{t('task.disputes.admin_detail.evidence_tab.empty', {}, 'No evidence yet.')}</p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2 font-sans">
        {#each paginatedEvidences as ev (ev.id)}
          <div class="rounded-[22px] border border-border bg-card p-4 text-sm shadow-xs">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-foreground">{ev.title ?? ev.evidenceType}</p>
              <span class="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {ev.evidenceType}
              </span>
            </div>
            {#if ev.description}
              <p class="mt-2 text-xs leading-5 text-muted-foreground">{ev.description}</p>
            {/if}
            <a href={ev.url} target="_blank" rel="noreferrer" class="mt-3 inline-block text-xs font-semibold text-foreground hover:underline font-mono">
              {t('task.disputes.admin_detail.evidence_tab.open', {}, 'Open evidence')}
            </a>
          </div>
        {/each}
      </div>
      <UnifiedOffsetPagination
        {pagination}
        onPageChange={(page: number) => {
          currentPage = page
        }}
      />
    {/if}
  </CardContent>
</Card>
