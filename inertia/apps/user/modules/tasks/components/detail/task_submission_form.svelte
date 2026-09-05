<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface SubmissionEvidence {
    id?: string
    evidenceType: string
    url: string
    title?: string | null
    description?: string | null
  }

  interface Props {
    summary: string
    implementationNotes: string
    knownLimitations: string
    testNotes: string
    demoUrl: string
    repositoryUrl: string
    pullRequestUrl: string
    evidences: SubmissionEvidence[]
    acceptanceCriteria?: string | null
    /** @deprecated retained for older harnesses; evidence is never a submit gate. */
    verificationMethods?: string[]
    /** @deprecated retained for older harnesses; evidence is never a submit gate. */
    verificationRequiresEvidence?: boolean
    saving: boolean
    submitting: boolean
    onSaveDraft: () => void
    onSubmitPackage: () => void
    onAddEvidence: (evidence: SubmissionEvidence) => void
    onRemoveEvidence: (index: number) => void
  }

  let {
    summary = $bindable(),
    implementationNotes = $bindable(),
    knownLimitations = $bindable(),
    testNotes = $bindable(),
    demoUrl = $bindable(),
    repositoryUrl = $bindable(),
    pullRequestUrl = $bindable(),
    evidences = $bindable(),
    acceptanceCriteria = null,
    saving,
    submitting,
    onSaveDraft,
    onSubmitPackage,
    onAddEvidence,
    onRemoveEvidence,
  }: Props = $props()
  const { t } = useTranslation()

  const evidenceTypeOptions = [
    { value: 'pull_request' },
    { value: 'commit_link' },
    { value: 'demo_recording' },
    { value: 'test_report' },
    { value: 'document_link' },
    { value: 'screenshot' },
    { value: 'metrics_screenshot' },
    { value: 'deployment_link' },
    { value: 'other' },
  ] as const

  type EvidenceType = (typeof evidenceTypeOptions)[number]['value']

  let showAddEvidence = $state(false)
  let evidenceType = $state<EvidenceType>('pull_request')
  let evidenceUrl = $state('')
  let evidenceTitle = $state('')
  let evidenceDescription = $state('')
  let localError = $state('')

  const coverageCriteria = $derived(
    (acceptanceCriteria ?? '')
      .split(/\r?\n/)
      .map((criterion) => criterion.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter((criterion) => criterion.length > 0)
  )
  const coverageGuide = $derived(
    coverageCriteria.length > 0
      ? coverageCriteria
      : ['Describe the actual result and how it was verified.']
  )
  // Evidence is optional governance data; it never gates the normal task flow.
  const submitBlocked = $derived(!summary.trim())

  function handleAddEvidenceLocal() {
    localError = ''
    const normalizedUrl = evidenceUrl.trim()
    if (!normalizedUrl) {
      localError = t('task.submission_form.error_url_required', {}, 'Please enter an evidence URL.')
      return
    }

    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      localError = t('task.submission_form.error_url_scheme', {}, 'Evidence URL must start with http:// or https://')
      return
    }

    onAddEvidence({
      evidenceType,
      url: normalizedUrl,
      title: evidenceTitle.trim() || null,
      description: evidenceDescription.trim() || null,
    })

    evidenceUrl = ''
    evidenceTitle = ''
    evidenceDescription = ''
    showAddEvidence = false
  }
</script>

<div class="space-y-5">
  {#if localError}
    <div class="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {localError}
    </div>
  {/if}

  <section
    class="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4"
    aria-labelledby="completion-readiness-heading"
  >
    <div>
      <h3 id="completion-readiness-heading" class="text-sm font-semibold">
        {t('task.submission_form.readiness_title', {}, 'Completion readiness')}
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        {t(
          'task.submission_form.readiness_draft',
          {},
          'Draft can be saved partially after a result summary is provided.'
        )}
      </p>
    </div>

    <div class="space-y-2" aria-labelledby="completion-coverage-heading">
      <h4 id="completion-coverage-heading" class="text-sm font-medium">
        {t('task.submission_form.coverage_title', {}, 'Completion coverage guide')}
      </h4>
      <p class="text-xs text-muted-foreground">
        {t(
          'task.submission_form.coverage_not_persisted',
          {},
          'This guide is not saved as criterion results. Use the report fields and evidence to explain each item.'
        )}
      </p>
      <ul class="list-disc space-y-1 pl-5 text-sm">
        {#each coverageGuide as criterion}
          <li>{criterion}</li>
        {/each}
      </ul>
    </div>

    <div class="grid gap-2 text-sm sm:grid-cols-2" aria-live="polite">
      <p class={summary.trim() ? 'text-foreground' : 'text-muted-foreground'}>
        {summary.trim()
          ? '✓ Result summary provided'
          : '○ Add a result summary (required for draft and submit)'}
      </p>
      <p class={evidences.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
        {evidences.length > 0
          ? `✓ ${evidences.length} optional governance evidence attached`
          : '○ Evidence is optional; the tester checks the output against acceptance criteria'}
      </p>
    </div>
  </section>

  <div class="space-y-2">
    <Label for="submission-summary">{t('task.submission_form.summary_label', {}, 'Result summary')}</Label>
    <Textarea
      id="submission-summary"
      bind:value={summary}
      rows={4}
      placeholder={t('task.submission_form.summary_placeholder', {}, 'Main result')}
    />
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <div class="space-y-2">
      <Label for="submission-notes">{t('task.submission_form.implementation_notes_label', {}, 'Implementation notes')}</Label>
      <Textarea
        id="submission-notes"
        bind:value={implementationNotes}
        rows={3}
        placeholder={t('task.submission_form.implementation_notes_placeholder', {}, 'Technical details, implementation decisions, trade-offs')}
      />
    </div>

    <div class="space-y-2">
      <Label for="submission-limitations">{t('task.submission_form.known_limitations_label', {}, 'Known limitations')}</Label>
      <Textarea
        id="submission-limitations"
        bind:value={knownLimitations}
        rows={3}
        placeholder={t('task.submission_form.known_limitations_placeholder', {}, 'Limitations, risks, or remaining items')}
      />
    </div>
  </div>

  <div class="space-y-2">
    <Label for="submission-test">{t('task.submission_form.test_notes_label', {}, 'Test notes')}</Label>
    <Textarea
      id="submission-test"
      bind:value={testNotes}
      rows={3}
      placeholder={t('task.submission_form.test_notes_placeholder', {}, 'Tests run')}
    />
  </div>

  <div class="grid gap-4 md:grid-cols-3">
    <div class="space-y-2">
      <Label for="submission-repo">
        {t('ui_misc.tasks.submission.repository_url', {}, 'Repository URL')}
      </Label>
      <Input id="submission-repo" bind:value={repositoryUrl} placeholder="https://github.com/..." />
    </div>

    <div class="space-y-2">
      <Label for="submission-pr">
        {t('ui_misc.tasks.submission.pull_request_url', {}, 'Pull Request URL')}
      </Label>
      <Input id="submission-pr" bind:value={pullRequestUrl} placeholder="https://github.com/.../pull/1" />
    </div>

    <div class="space-y-2">
      <Label for="submission-demo">
        {t('ui_misc.tasks.submission.demo_url', {}, 'Demo URL')}
      </Label>
      <Input id="submission-demo" bind:value={demoUrl} placeholder="https://demo.example.com" />
    </div>
  </div>

  <div class="space-y-4 border-t border-border/50 pt-4">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm font-medium">{t('task.submission_form.evidence_title', {}, 'Verification evidence')}</p>
      <Button
        variant="outline"
        size="sm"
        onclick={() => {
          showAddEvidence = !showAddEvidence
        }}
      >
        {showAddEvidence ? t('task.submission_form.hide_form', {}, 'Hide form') : t('task.submission_form.show_form', {}, 'Add evidence')}
      </Button>
    </div>

    {#if showAddEvidence}
      <div class="grid gap-4 rounded-lg border border-border/60 bg-muted/10 p-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="evidence-type">{t('task.submission_form.evidence_type_label', {}, 'Evidence type')}</Label>
          <select
            id="evidence-type"
            bind:value={evidenceType}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {#each evidenceTypeOptions as option}
              <option value={option.value}>{t(`task.submission_form.evidence_type.${option.value}`, {}, option.value)}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <Label for="evidence-url">{t('task.submission_form.evidence_url_label', {}, 'Evidence URL')}</Label>
          <Input id="evidence-url" bind:value={evidenceUrl} placeholder="https://..." />
        </div>

        <div class="space-y-2">
          <Label for="evidence-title">{t('task.submission_form.title_label', {}, 'Title')}</Label>
          <Input id="evidence-title" bind:value={evidenceTitle} placeholder={t('task.submission_form.title_placeholder', {}, 'Main PR, demo video...')} />
        </div>

        <div class="space-y-2">
          <Label for="evidence-description">{t('task.submission_form.description_label', {}, 'Description')}</Label>
          <Input id="evidence-description" bind:value={evidenceDescription} placeholder={t('task.submission_form.description_placeholder', {}, 'Short description')} />
        </div>

        <div class="md:col-span-2">
          <Button size="sm" onclick={handleAddEvidenceLocal}>{t('task.submission_form.add_confirm', {}, 'Add evidence')}</Button>
        </div>
      </div>
    {/if}

    {#if evidences.length === 0}
      <p class="text-sm text-muted-foreground">{t('task.submission_form.empty_evidence', {}, 'No evidence attached yet.')}</p>
    {:else}
      <div class="grid gap-3 md:grid-cols-2">
        {#each evidences as evidence, index}
          <div class="rounded-lg border border-border/60 p-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase text-primary font-mono">
                  {t(`task.submission_form.evidence_type.${evidence.evidenceType}`, {}, evidence.evidenceType)}
                </p>
                {#if evidence.title}
                  <p class="mt-1 text-sm font-medium">{evidence.title}</p>
                {/if}
                {#if evidence.description}
                  <p class="mt-1 text-sm text-muted-foreground">{evidence.description}</p>
                {/if}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onclick={() => onRemoveEvidence(index)}
              >
                {t('task.submission_form.remove', {}, 'Remove')}
              </Button>
            </div>
            <a class="mt-2 block truncate text-sm text-primary underline" href={evidence.url} target="_blank" rel="noreferrer">
              {evidence.url}
            </a>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-4">
    <Button variant="outline" onclick={onSaveDraft} disabled={saving || submitting}>
      {saving ? t('task.submission_form.saving', {}, 'Saving...') : t('task.submission_form.save_draft', {}, 'Save draft')}
    </Button>
    <Button onclick={onSubmitPackage} disabled={saving || submitting || submitBlocked}>
      {submitting ? t('task.submission_form.submitting', {}, 'Submitting...') : t('task.submission_form.submit_package', {}, 'Submit package')}
    </Button>
  </div>
</div>
