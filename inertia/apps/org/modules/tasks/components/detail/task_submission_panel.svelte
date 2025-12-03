<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import { formatTaskVerificationMethodForDisplay } from '@/apps/org/modules/tasks/lib/rules/task_verification_methods'

  import TaskSubmissionView from '@/apps/org/modules/tasks/components/detail/task_submission_view.svelte'
  import TaskSubmissionForm from '@/apps/org/modules/tasks/components/detail/task_submission_form.svelte'

  interface TaskDetailSummary {
    verification_method?: string | null
    acceptance_criteria?: string | null
  }

  interface SubmissionEvidence {
    id?: string
    evidenceType: string
    url: string
    title?: string | null
    description?: string | null
  }

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

  interface SubmissionEnvelope {
    data: TaskSubmission | null
    message?: string
  }

  interface EvidenceEnvelope {
    data: SubmissionEvidence[]
  }

  interface Props {
    taskId: string
    isAssignee: boolean
    task: TaskDetailSummary
    initialLoading?: boolean
    initialSubmission?: TaskSubmission | null
    initialEvidences?: SubmissionEvidence[]
    initialError?: string
  }

  const props: Props = $props()
  const { t } = useTranslation()
  const verificationMethods = $derived(
    formatTaskVerificationMethodForDisplay(props.task.verification_method, t)
  )

  const statusClasses: Record<TaskSubmission['status'], string> = {
    draft: 'border-border/60 bg-secondary text-foreground shadow-suar-xs',
    submitted: 'border-primary/20 bg-primary/10 text-foreground shadow-suar-xs',
    locked: 'border-border bg-foreground text-background shadow-suar-xs',
    accepted_for_review: 'border-primary/20 bg-accent text-accent-foreground shadow-suar-xs',
    needs_changes: 'border-destructive/20 bg-destructive/10 text-destructive shadow-suar-xs',
  }

  const statusFallbackLabels: Record<TaskSubmission['status'], string> = {
    draft: 'Draft',
    submitted: 'Report submitted',
    locked: 'Report locked',
    accepted_for_review: 'Reviewed',
    needs_changes: 'Needs changes',
  }

  let loading = $state(true)
  let submission = $state<TaskSubmission | null>(null)
  let evidences = $state<SubmissionEvidence[]>([])
  let error = $state('')
  let success = $state('')
  let saving = $state(false)
  let submitting = $state(false)
  let locking = $state(false)

  let summary = $state('')
  let implementationNotes = $state('')
  let knownLimitations = $state('')
  let testNotes = $state('')
  let demoUrl = $state('')
  let repositoryUrl = $state('')
  let pullRequestUrl = $state('')

  function syncForm(nextSubmission: TaskSubmission | null) {
    summary = nextSubmission?.summary ?? ''
    implementationNotes = nextSubmission?.implementationNotes ?? ''
    knownLimitations = nextSubmission?.knownLimitations ?? ''
    testNotes = nextSubmission?.testNotes ?? ''
    demoUrl = nextSubmission?.demoUrl ?? ''
    repositoryUrl = nextSubmission?.repositoryUrl ?? ''
    pullRequestUrl = nextSubmission?.pullRequestUrl ?? ''
  }

  function getErrorMessage(cause: unknown, fallback: string) {
    if (
      typeof cause === 'object' &&
      cause !== null &&
      'response' in cause &&
      typeof cause.response === 'object' &&
      cause.response !== null &&
      'data' in cause.response &&
      typeof cause.response.data === 'object' &&
      cause.response.data !== null &&
      'message' in cause.response.data &&
      typeof cause.response.data.message === 'string'
    ) {
      return cause.response.data.message
    }

    if (cause instanceof Error && cause.message.trim()) {
      return cause.message
    }

    return fallback
  }

  async function loadSubmissionData() {
    if (props.initialSubmission !== undefined) {
      loading = false
      return
    }

    loading = true
    error = ''

    try {
      const submissionResponse = await axios.get<SubmissionEnvelope>(
        `/api/v1/tasks/${props.taskId}/submission`
      )
      const nextSubmission = submissionResponse.data.data
      submission = nextSubmission
      syncForm(nextSubmission)

      if (nextSubmission?.id) {
        const evidenceResponse = await axios.get<EvidenceEnvelope>(
          `/api/task-submissions/${nextSubmission.id}/evidences`
        )
        evidences = evidenceResponse.data.data
      } else {
        evidences = []
      }
    } catch (cause) {
      error = getErrorMessage(cause, t('task.submission_panel.load_error', {}, 'Unable to load task completion report.'))
      submission = null
      evidences = []
      syncForm(null)
    } finally {
      loading = false
    }
  }

  function buildPayload() {
    return {
      summary: summary.trim(),
      implementationNotes: implementationNotes.trim() || null,
      knownLimitations: knownLimitations.trim() || null,
      testNotes: testNotes.trim() || null,
      demoUrl: demoUrl.trim() || null,
      repositoryUrl: repositoryUrl.trim() || null,
      pullRequestUrl: pullRequestUrl.trim() || null,
      evidences,
    }
  }

  function validateSummary() {
    if (summary.trim()) {
      return true
    }

    error = t('task.submission_panel.summary_required', {}, 'Please enter a task completion result summary.')
    return false
  }

  async function handleSaveDraft() {
    if (!validateSummary()) {
      return
    }

    saving = true
    error = ''
    success = ''

    try {
      const response = await axios.post<SubmissionEnvelope>(
        `/api/v1/tasks/${props.taskId}/submission`,
        buildPayload()
      )
      submission = response.data.data
      syncForm(submission)
      success = t('task.submission_panel.save_success', {}, 'Report draft saved successfully.')
      await loadSubmissionData()
    } catch (cause) {
      error = getErrorMessage(cause, t('task.submission_panel.save_error', {}, 'Unable to save report draft.'))
    } finally {
      saving = false
    }
  }

  async function handleSubmitPackage() {
    if (!validateSummary()) {
      return
    }

    submitting = true
    error = ''
    success = ''

    try {
      const response = await axios.post<SubmissionEnvelope>(
        `/api/v1/tasks/${props.taskId}/submission/submit`,
        buildPayload()
      )
      submission = response.data.data
      syncForm(submission)
      success = t('task.submission_panel.submit_success', {}, 'Report submitted successfully.')
      await loadSubmissionData()
    } catch (cause) {
      error = getErrorMessage(cause, t('task.submission_panel.submit_error', {}, 'Unable to submit report.'))
    } finally {
      submitting = false
    }
  }

  async function handleLockSubmission() {
    locking = true
    error = ''
    success = ''

    try {
      const response = await axios.post<SubmissionEnvelope>(
        `/api/v1/tasks/${props.taskId}/submission/lock`
      )
      submission = response.data.data
      syncForm(submission)
      success = t('task.submission_panel.lock_success', {}, 'Report locked successfully.')
      await loadSubmissionData()
    } catch (cause) {
      error = getErrorMessage(cause, t('task.submission_panel.lock_error', {}, 'Unable to lock report.'))
    } finally {
      locking = false
    }
  }

  function handleAddEvidence(evidence: SubmissionEvidence) {
    evidences = [...evidences, evidence]
  }

  function handleRemoveEvidence(index: number) {
    evidences = evidences.filter((_, evidenceIndex) => evidenceIndex !== index)
  }

  const isLocked = $derived(submission?.status === 'locked')
  const isSubmitted = $derived(submission?.status === 'submitted')
  const canEdit = $derived(
    props.isAssignee && submission?.status !== 'locked' && submission?.status !== 'submitted'
  )

  onMount(() => {
    loading = props.initialLoading ?? props.initialSubmission === undefined
    submission = props.initialSubmission ?? null
    evidences = props.initialEvidences ?? []
    error = props.initialError ?? ''
    syncForm(props.initialSubmission ?? null)

    if (props.initialSubmission === undefined) {
      void loadSubmissionData()
      return
    }
  })
</script>

<Card class="rounded-xl border border-border/70 bg-card/70 shadow-sm">
  <CardHeader class="space-y-3 border-b border-border/50">
    <div class="flex items-center justify-between gap-3">
      <CardTitle class="text-lg">{t('task.submission_panel.title', {}, 'Task completion report')}</CardTitle>

      {#if submission}
        <Badge class={statusClasses[submission.status]}>
          {t(`task.submission_panel.status.${submission.status}`, {}, statusFallbackLabels[submission.status])}
        </Badge>
      {/if}
    </div>
  </CardHeader>

  <CardContent class="space-y-6 pt-6">
    {#if loading}
      <p class="text-sm text-muted-foreground">{t('task.submission_panel.loading', {}, 'Loading submission information...')}</p>
    {:else}
      {#if error}
        <div class="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive font-sans">
          {error}
        </div>
      {/if}

      {#if success}
        <div class="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-foreground font-sans">
          {success}
        </div>
      {/if}

      <div class="grid gap-4 rounded-lg border border-border/60 bg-muted/20 p-4 md:grid-cols-2">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('task.submission_panel.acceptance_criteria', {}, 'Acceptance criteria')}
          </p>
          <p class="mt-1 text-sm whitespace-pre-wrap">
            {props.task.acceptance_criteria ?? t('task.submission_panel.unset', {}, 'Not set')}
          </p>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('task.submission_panel.verification_method', {}, 'Verification method')}
          </p>
          {#if verificationMethods.length > 0}
            <ul class="mt-1 list-disc space-y-1 pl-4 text-sm">
              {#each verificationMethods as method}
                <li>{method}</li>
              {/each}
            </ul>
          {:else}
            <p class="mt-1 text-sm">{t('task.submission_panel.unset', {}, 'Not set')}</p>
          {/if}
        </div>
      </div>

      {#if !props.isAssignee}
        {#if submission}
          <TaskSubmissionView
            {submission}
            {evidences}
            {isSubmitted}
            {isLocked}
            {locking}
            onLock={handleLockSubmission}
          />
        {:else}
          <div class="rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            {t('task.submission_panel.empty_submission', {}, 'No completion report yet.')}
          </div>
        {/if}
      {:else if canEdit}
        <TaskSubmissionForm
          bind:summary
          bind:implementationNotes
          bind:knownLimitations
          bind:testNotes
          bind:demoUrl
          bind:repositoryUrl
          bind:pullRequestUrl
          bind:evidences
          saving={saving}
          submitting={submitting}
          onSaveDraft={handleSaveDraft}
          onSubmitPackage={handleSubmitPackage}
          onAddEvidence={handleAddEvidence}
          onRemoveEvidence={handleRemoveEvidence}
        />
      {:else if submission}
        <TaskSubmissionView
          {submission}
          {evidences}
          {isSubmitted}
          {isLocked}
          {locking}
          onLock={handleLockSubmission}
        />
      {/if}
    {/if}
  </CardContent>
</Card>
