<script lang="ts">
  import { Clock3 } from 'lucide-svelte'

  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface RequirementVersion {
    id: string
    versionNumber: number
    reason: string
    createdBy: string | null
    createdAt: string | null
    itemsCount: number
    diff: {
      addedSkillIds: string[]
      removedSkillIds: string[]
      modifiedSkillIds: string[]
    }
  }

  interface Props {
    versions: RequirementVersion[]
    loading: boolean
  }

  let { versions, loading }: Props = $props()

  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateFormatter = $derived(new Intl.DateTimeFormat(documentLocale, { dateStyle: 'medium', timeStyle: 'short' }))

  function formatVersionDate(value: string | null): string {
    if (!value) return t('task.skill_history.unknown_time', {}, 'Unknown time')

    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? t('common.invalid_date', {}, 'Invalid date')
      : dateFormatter.format(date)
  }

  function reasonLabel(reason: string): string {
    const knownReasons: Record<string, string> = {
      task_created: t('task.skill_history.reason.task_created', {}, 'Task created'),
      task_assigned: t('task.skill_history.reason.task_assigned', {}, 'Task assigned'),
      submission_sent: t('task.skill_history.reason.submission_sent', {}, 'Submission sent'),
      review_started: t('task.skill_history.reason.review_started', {}, 'Review started'),
      dispute_opened: t('task.skill_history.reason.dispute_opened', {}, 'Dispute opened'),
      manual_edit: t('task.skill_history.reason.manual_edit', {}, 'Manual edit'),
    }

    return knownReasons[reason] ?? reason
  }
</script>

<div class="rounded-lg border bg-muted/20 p-3">
  <div class="mb-3 flex items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <Clock3 class="h-4 w-4 text-muted-foreground" />
      <span class="text-sm font-semibold">{t('task.skill_history.title', {}, 'Requirement version history')}</span>
    </div>
    <span class="text-xs text-muted-foreground">{t('task.skill_history.snapshots', { count: versions.length }, ':count snapshots')}</span>
  </div>

  {#if loading}
    <p class="text-xs text-muted-foreground">{t('task.skill_history.loading', {}, 'Loading version history...')}</p>
  {:else if versions.length === 0}
    <p class="text-xs text-muted-foreground">{t('task.skill_history.empty', {}, 'No requirement snapshot yet.')}</p>
  {:else}
    <div class="space-y-2 max-h-[250px] overflow-y-auto pr-1">
      {#each versions.slice().reverse() as version (version.id)}
        <div class="rounded-md border bg-background p-2 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2 font-sans">
              <span class="font-bold">v{version.versionNumber}</span>
              <span class="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground font-sans">
                {reasonLabel(version.reason)}
              </span>
              <span class="text-muted-foreground">{t('task.skill_history.skills', { count: version.itemsCount }, ':count skills')}</span>
            </div>
            <span class="text-muted-foreground">{formatVersionDate(version.createdAt)}</span>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5 text-[10px]">
            <span class="rounded bg-muted/40 px-1.5 py-0.5 text-foreground font-sans">
              {t('task.skill_history.added', { count: version.diff.addedSkillIds.length }, '+:count added')}
            </span>
            <span class="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-300 font-sans">
              {t('task.skill_history.modified', { count: version.diff.modifiedSkillIds.length }, '~:count modified')}
            </span>
            <span class="rounded border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 text-destructive font-sans">
              {t('task.skill_history.removed', { count: version.diff.removedSkillIds.length }, '-:count removed')}
            </span>
            {#if version.createdBy}
              <span class="text-muted-foreground font-sans">{t('task.skill_history.by', {}, 'by')} {version.createdBy}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
