<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import axios from 'axios'

  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    displayName: string
  }

  interface RubricLevel {
    id: string
    proficiencyLevel: ProficiencyLevel
    summary: string | null
    knowledgeExpectations: string[] | string | null
    observableBehaviors: string[] | string | null
    independenceExpectations: string | null
    complexityExpectations: string | null
    impactScopeExpectations: string | null
    positiveExamples: string[] | string | null
    negativeExamples: string[] | string | null
    evidenceGuidance: string | null
    expectedExecution: string | null
    autonomyDescriptor: string | null
    complexityDescriptor: string | null
    qualityDescriptor: string | null
    collaborationDescriptor: string | null
    ceilingGuidance: string | null
  }

  interface Props {
    skill: {
      id: string
      skillName: string
      skillCode: string
      categoryCode: string
      description: string | null
    }
    rubric: {
      id: string
      version: number
      status: string
      effectiveFrom: string | null
      effectiveTo: string | null
      changeSummary: string | null
      levels: RubricLevel[]
      createdAt: string
      updatedAt: string
    }
  }

  const { skill, rubric }: Props = $props()
  const { t } = useTranslation()

  const goBack = () => { router.get("/admin/proficiency") }

  type EditableLevel = RubricLevel & {
    summaryText: string
    knowledgeText: string
    behaviorsText: string
    evidenceText: string
  }

  let draftVersionId = $state('')
  let draftStatus = $state('')
  let saving = $state(false)
  let publishing = $state(false)
  let errorMessage = $state('')
  let successMessage = $state('')
  let editableLevels = $state<EditableLevel[]>([])
  let initialized = $state(false)

  $effect(() => {
    if (initialized) return

    draftVersionId = rubric.status === 'draft' ? rubric.id : ''
    draftStatus = rubric.status
    editableLevels = rubric.levels.map((level) => ({
      ...level,
      summaryText: level.summary ?? '',
      knowledgeText: stringifyList(level.knowledgeExpectations),
      behaviorsText: stringifyList(level.observableBehaviors),
      evidenceText: level.evidenceGuidance ?? '',
    }))
    initialized = true
  })

  function stringifyList(value: string[] | string | null): string {
    if (Array.isArray(value)) return value.join('\n')
    return value ?? ''
  }

  function parseList(value: string): string[] {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  async function createDraft() {
    saving = true
    errorMessage = ''
    successMessage = ''
    try {
      const response = await axios.post<{ data: { id?: string; status?: string } }>(
        `/admin/proficiency/rubrics/${skill.id}/drafts`,
        {
          changeSummary: t(
            'admin_ui.proficiency.rubric.default_change_summary',
            {},
            'Admin rubric draft'
          ),
        }
      )
      const draft = response.data.data
      draftVersionId = draft?.id ?? ''
      draftStatus = draft?.status ?? 'draft'
      successMessage = t('admin_ui.proficiency.rubric.draft_created', {}, 'Draft created')
    } catch {
      errorMessage = t('admin_ui.proficiency.rubric.draft_error', {}, 'Unable to create draft')
    } finally {
      saving = false
    }
  }

  async function saveDraft() {
    if (!draftVersionId) {
      await createDraft()
    }
    if (!draftVersionId) return

    saving = true
    errorMessage = ''
    successMessage = ''
    try {
      for (const level of editableLevels) {
        await axios.put(
          `/admin/proficiency/rubrics/versions/${draftVersionId}/levels/${level.proficiencyLevel.id}`,
          {
            summary: level.summaryText || null,
            knowledgeExpectations: parseList(level.knowledgeText),
            observableBehaviors: parseList(level.behaviorsText),
            evidenceGuidance: level.evidenceText || null,
          }
        )
      }
      successMessage = t('admin_ui.proficiency.rubric.saved', {}, 'Draft saved')
    } catch {
      errorMessage = t('admin_ui.proficiency.rubric.save_error', {}, 'Unable to save draft')
    } finally {
      saving = false
    }
  }

  async function publishDraft() {
    if (!draftVersionId) return

    publishing = true
    errorMessage = ''
    successMessage = ''
    try {
      await saveDraft()
      if (errorMessage) return

      await axios.post(`/admin/proficiency/rubrics/versions/${draftVersionId}/publish`, {})
      successMessage = t('admin_ui.proficiency.rubric.published', {}, 'Rubric published')
      router.reload({ only: ['skill', 'rubric', 'flash'] })
    } catch {
      errorMessage = t('admin_ui.proficiency.rubric.publish_error', {}, 'Unable to publish rubric')
    } finally {
      publishing = false
    }
  }
</script>

<svelte:head>
  <title>{t('admin_ui.proficiency.rubric.page_title', { skill: skill.skillName }, ':skill Rubric — Admin')}</title>
</svelte:head>


  <div class="space-y-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between">
      <button onclick={goBack} class="text-sm text-muted-foreground underline">
        ← {t('admin_ui.proficiency.rubric.back', {}, 'Back to Proficiency')}
      </button>
    </div>

    <div class="rounded-lg border p-4 bg-muted/20">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold">{skill.skillName}</h1>
        <span class="rounded-full border px-2 py-0.5 text-xs">{skill.skillCode}</span>
        <span class="rounded-full border px-2 py-0.5 text-xs">{skill.categoryCode}</span>
      </div>
      {#if skill.description}
        <p class="mt-2 text-sm text-muted-foreground">{skill.description}</p>
      {/if}
    </div>

    <div class="rounded-lg border p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h2 class="text-lg font-semibold">{t('admin_ui.proficiency.rubric.version', { version: rubric.version }, 'Rubric v:version')}</h2>
            <span class="rounded-full border px-2 py-0.5 text-xs">{draftStatus}</span>
          </div>
          {#if rubric.changeSummary}
            <p class="text-sm text-muted-foreground">{rubric.changeSummary}</p>
          {/if}
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            disabled={saving || Boolean(draftVersionId)}
            onclick={createDraft}
          >
            {t('admin_ui.proficiency.rubric.create_draft', {}, 'Create draft')}
          </button>
          <button
            type="button"
            class="rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            disabled={saving}
            onclick={() => { void saveDraft() }}
          >
            {saving ? t('common.saving', {}, 'Saving...') : t('admin_ui.proficiency.rubric.save_draft', {}, 'Save draft')}
          </button>
          <button
            type="button"
            class="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            disabled={publishing || !draftVersionId}
            onclick={() => { void publishDraft() }}
          >
            {publishing ? t('common.publishing', {}, 'Publishing...') : t('admin_ui.proficiency.rubric.publish', {}, 'Publish')}
          </button>
        </div>
      </div>

      {#if errorMessage}
        <p class="mt-3 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>
      {/if}
      {#if successMessage}
        <p class="mt-3 rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">{successMessage}</p>
      {/if}
    </div>

    <div class="space-y-4">
      {#each editableLevels as level (level.id)}
        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold">
              {level.proficiencyLevel.displayName}
            </span>
            <span class="text-xs text-muted-foreground font-mono">
              {level.proficiencyLevel.code}
            </span>
          </div>

          <div class="mb-3">
            <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1" for={`summary-${level.id}`}>{t('admin_ui.proficiency.fields.summary', {}, 'Summary')}</label>
            <textarea
              id={`summary-${level.id}`}
              aria-label={`${level.proficiencyLevel.displayName} summary`}
              class="mt-1 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
              bind:value={level.summaryText}
            ></textarea>
          </div>

          <div class="mb-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1" for={`knowledge-${level.id}`}>{t('admin_ui.proficiency.fields.knowledge', {}, 'Knowledge')}</label>
            <textarea
              id={`knowledge-${level.id}`}
              aria-label={`${level.proficiencyLevel.displayName} knowledge`}
              class="mt-1 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground"
              bind:value={level.knowledgeText}
            ></textarea>
          </div>

          <div class="mb-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1" for={`behaviors-${level.id}`}>{t('admin_ui.proficiency.fields.observable_behaviors', {}, 'Observable Behaviors')}</label>
            <textarea
              id={`behaviors-${level.id}`}
              aria-label={`${level.proficiencyLevel.displayName} observable behaviors`}
              class="mt-1 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground"
              bind:value={level.behaviorsText}
            ></textarea>
          </div>

          {#if level.expectedExecution}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t('admin_ui.proficiency.fields.expected_execution', {}, 'Expected Execution')}</p>
              <p class="text-sm text-muted-foreground">{level.expectedExecution}</p>
            </div>
          {/if}

          {#if level.autonomyDescriptor}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t('admin_ui.proficiency.fields.autonomy_descriptor', {}, 'Autonomy Descriptor')}</p>
              <p class="text-sm text-muted-foreground">{level.autonomyDescriptor}</p>
            </div>
          {/if}

          {#if level.complexityDescriptor}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t('admin_ui.proficiency.fields.complexity_descriptor', {}, 'Complexity Descriptor')}</p>
              <p class="text-sm text-muted-foreground">{level.complexityDescriptor}</p>
            </div>
          {/if}

          {#if level.qualityDescriptor}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t('admin_ui.proficiency.fields.quality_descriptor', {}, 'Quality Descriptor')}</p>
              <p class="text-sm text-muted-foreground">{level.qualityDescriptor}</p>
            </div>
          {/if}

          {#if level.collaborationDescriptor}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t('admin_ui.proficiency.fields.collaboration_descriptor', {}, 'Collaboration Descriptor')}</p>
              <p class="text-sm text-muted-foreground">{level.collaborationDescriptor}</p>
            </div>
          {/if}

          <div class="mt-3 rounded border border-border bg-muted/20 p-3">
            <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1" for={`evidence-${level.id}`}>{t('admin_ui.proficiency.fields.evidence_guidance', {}, 'Evidence Guidance')}</label>
            <textarea
              id={`evidence-${level.id}`}
              aria-label={`${level.proficiencyLevel.displayName} evidence guidance`}
              class="mt-1 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
              bind:value={level.evidenceText}
            ></textarea>
          </div>

          {#if level.ceilingGuidance}
            <div class="mt-3 rounded border border-border bg-secondary/40 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t('admin_ui.proficiency.fields.ceiling_guidance', {}, 'Ceiling Guidance')}</p>
              <p class="text-sm text-foreground">{level.ceilingGuidance}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
 
