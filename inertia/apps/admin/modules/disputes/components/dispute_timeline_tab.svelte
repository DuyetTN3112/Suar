<script lang="ts">
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'
  import { buildOffsetPagination, paginateOffsetItems } from '@/apps/admin/shared/lib/pagination'
  import { format } from 'date-fns'
  import { dateFnsLocale, dateTimePattern } from '@/apps/admin/shared/lib/date_locale'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface TimelineEntry {
    id: string
    kind: 'audit' | 'comment' | 'evidence' | 'case_file' | 'ai_evaluation'
    action: string
    occurred_at: string
    actor_id: string | null
    actor_label: string | null
    summary: string
  }

  interface Props {
    timeline: TimelineEntry[]
  }

  let { timeline }: Props = $props()
  const { t } = useTranslation()
  const perPage = 10
  let currentPage = $state(1)
  const pagination = $derived(buildOffsetPagination({
    page: currentPage,
    perPage,
    total: timeline.length,
  }))
  const paginatedTimeline = $derived(paginateOffsetItems(timeline, pagination))

  function formatTimelineDate(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return format(date, dateTimePattern(), { locale: dateFnsLocale() })
  }
</script>

<Card class="rounded-[28px] border-border/90">
  <CardHeader class="space-y-3">
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t('task.disputes.admin_detail.timeline_tab.eyebrow', {}, 'Audit trail')}
      </p>
      <CardTitle class="mt-2 text-2xl">
        {t('task.disputes.admin_detail.timeline_tab.title', { count: timeline.length }, 'Timeline (:count)')}
      </CardTitle>
    </div>
  </CardHeader>
  <CardContent>
    {#if timeline.length === 0}
      <p class="text-sm text-muted-foreground">
        {t('task.disputes.admin_detail.timeline_tab.empty', {}, 'No events yet.')}
      </p>
    {:else}
      <div class="space-y-3 font-sans">
        {#each paginatedTimeline as entry (entry.id)}
          <div class="rounded-[22px] border border-border bg-card p-4 text-sm shadow-xs">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <Badge variant="outline" class="rounded-full font-mono">{entry.kind}</Badge>
                <span class="font-semibold text-foreground">{entry.action}</span>
              </div>
              <span class="text-xs text-muted-foreground font-mono">
                {formatTimelineDate(entry.occurred_at)}
              </span>
            </div>
            <p class="mt-2 leading-6 text-foreground">{entry.summary}</p>
            <div class="mt-2 text-xs text-muted-foreground font-mono">
              {entry.actor_label ?? entry.actor_id ?? 'system'}
            </div>
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
