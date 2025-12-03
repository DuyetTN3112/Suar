<script lang="ts">
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface TaskSubmission {
    id: string
    status: 'draft' | 'submitted' | 'locked' | 'accepted_for_review' | 'needs_changes'
    summary: string
    implementationNotes?: string | null
    knownLimitations?: string | null
    testNotes?: string | null
    demoUrl?: string | null
    repositoryUrl?: string | null
    pullRequestUrl?: string | null
    lockedAt?: string | null
  }

  interface SubmissionEvidence {
    id?: string
    evidenceType: string
    url: string
    title?: string | null
    description?: string | null
  }

  interface Props {
    submission: TaskSubmission
    evidences: SubmissionEvidence[]
    isSubmitted: boolean
    isLocked: boolean
    locking: boolean
    onLock: () => void
  }

  let {
    submission,
    evidences,
    isSubmitted,
    isLocked,
    locking,
    onLock,
  }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  function formatLockedAt(value: string | null | undefined): string {
    if (!value) {
      return ''
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed)
  }

  const lockedAtLabel = $derived.by(() => {
    const date = formatLockedAt(submission.lockedAt)
    return t('task.submission_view.locked_at', { date }, date ? `Report locked at ${date}.` : 'Report locked.')
  })
</script>

<div class="space-y-4">
  <div class="rounded-lg border border-border/60 bg-muted/10 p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {t('task.submission_view.summary_label', {}, 'Result summary')}
    </p>
    <p class="mt-2 text-sm whitespace-pre-wrap">{submission.summary}</p>
  </div>

  {#if submission.implementationNotes}
    <div class="rounded-lg border border-border/60 bg-muted/10 p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('task.submission_view.implementation_notes_label', {}, 'Implementation notes')}
      </p>
      <p class="mt-2 text-sm whitespace-pre-wrap">{submission.implementationNotes}</p>
    </div>
  {/if}

  {#if evidences.length > 0}
    <div class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('task.submission_view.evidence_title', {}, 'Attached evidence')}
      </p>
      <div class="grid gap-3 md:grid-cols-2">
        {#each evidences as evidence}
          <div class="rounded-lg border border-border/60 p-3">
            <p class="text-xs font-semibold uppercase text-primary font-mono">
              {t(`task.submission_form.evidence_type.${evidence.evidenceType}`, {}, evidence.evidenceType)}
            </p>
            {#if evidence.title}
              <p class="mt-1 text-sm font-medium">{evidence.title}</p>
            {/if}
            {#if evidence.description}
              <p class="mt-1 text-sm text-muted-foreground">{evidence.description}</p>
            {/if}
            <a class="mt-2 block truncate text-sm text-primary underline" href={evidence.url} target="_blank" rel="noreferrer">
              {evidence.url}
            </a>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if isSubmitted}
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <p class="text-sm text-foreground">
        {t('task.submission_view.submitted_notice', {}, 'Report has been submitted. Lock it when this should be the final version.')}
      </p>
      <Button variant="outline" onclick={onLock} disabled={locking}>
        {locking ? t('task.submission_view.locking', {}, 'Locking...') : t('task.submission_view.lock_button', {}, 'Lock report')}
      </Button>
    </div>
  {/if}

  {#if isLocked}
    <p class="text-xs text-muted-foreground">
      {lockedAtLabel}
    </p>
  {/if}
</div>
