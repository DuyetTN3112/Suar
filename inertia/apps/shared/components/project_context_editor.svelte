<script lang="ts">
  import axios from 'axios'

  import type { ProjectContextReadModel } from './project_context_types'

  interface PublishedContextVersion {
    id: string
    versionNumber: number
  }

  interface ConflictReloadCallbacks {
    onSuccess: () => void
    onError: () => void
  }

  interface Props {
    projectId: string
    projectContext: ProjectContextReadModel | null | undefined
    canEdit: boolean
    onPublished?: (version: PublishedContextVersion) => void
    onConflict?: (callbacks: ConflictReloadCallbacks) => void
  }

  let {
    projectId,
    projectContext,
    canEdit,
    onPublished,
    onConflict,
  }: Props = $props()

  let editing = $state(false)
  let saving = $state(false)
  let error = $state('')
  let success = $state('')
  let conflict = $state(false)
  let reloading = $state(false)
  let reloadError = $state('')
  let draft = $state({
    title: '',
    summary: '',
    plainTextProjection: '',
    richContent: '',
    changeReason: '',
  })

  $effect(() => {
    if (!editing) {
      const context = projectContext?.context
      draft.title = context?.title ?? ''
      draft.summary = context?.summary ?? ''
      draft.plainTextProjection = context?.plain_text_projection ?? ''
      draft.richContent = typeof context?.rich_content === 'string' ? context.rich_content : ''
      draft.changeReason = ''
    }
  })

  function startEditing() {
    error = ''
    success = ''
    conflict = false
    reloadError = ''
    editing = true
  }

  function cancelEditing() {
    error = ''
    conflict = false
    reloadError = ''
    editing = false
  }

  function validateDraft() {
    if (!draft.title.trim() || !draft.summary.trim() || !draft.plainTextProjection.trim()) {
      error = 'Title, summary and plain-text projection are required.'
      return false
    }
    return true
  }

  async function publishContext(event: SubmitEvent) {
    event.preventDefault()
    if (!validateDraft()) return

    saving = true
    error = ''
    success = ''
    conflict = false
    reloadError = ''
    try {
      const response = await axios.post<{ contextVersion: PublishedContextVersion }>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/context-versions`,
        {
          expectedActiveVersionId: projectContext?.active_version_id ?? null,
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          plainTextProjection: draft.plainTextProjection.trim(),
          richContent: draft.richContent,
          structuredDefaults: {},
          supportingReferences: [],
          confirmed: true,
          changeClass: projectContext?.context ? 'material_scope' : 'initial',
          changeReason: draft.changeReason.trim() || null,
          privacyClassification: projectContext?.context?.privacy_classification ?? 'internal',
        }
      )
      success = 'Project Context published.'
      editing = false
      onPublished?.(response.data.contextVersion)
    } catch (cause) {
      const status =
        typeof cause === 'object' && cause !== null && 'response' in cause &&
        typeof cause.response === 'object' && cause.response !== null &&
        'status' in cause.response && typeof cause.response.status === 'number'
          ? cause.response.status
          : null
      conflict = status === 409
      error = conflict
        ? 'Project Context changed. Reload before publishing again.'
        : cause instanceof Error && cause.message.trim()
          ? cause.message
          : 'Unable to publish Project Context. Reload and retry.'
    } finally {
      saving = false
    }
  }

  function reloadAfterConflict() {
    if (!onConflict) return
    reloading = true
    reloadError = ''
    onConflict({
      onSuccess: () => {
        reloading = false
      },
      onError: () => {
        reloading = false
        reloadError = 'Unable to reload Project Context. Your draft is still here.'
      },
    })
  }
</script>

{#if canEdit}
  {#if !editing}
    <button
      type="button"
      class="mt-4 rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
      onclick={startEditing}
    >
      {projectContext?.context ? 'Edit Project Context' : 'Create Project Context'}
    </button>
  {:else}
    <form class="mt-4 space-y-4 rounded-xl border border-border bg-muted/20 p-4" onsubmit={publishContext}>
      <div>
        <label for="project-context-title" class="text-sm font-semibold">Title</label>
        <input id="project-context-title" class="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" bind:value={draft.title} />
      </div>
      <div>
        <label for="project-context-summary" class="text-sm font-semibold">Summary</label>
        <textarea id="project-context-summary" class="mt-1 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" bind:value={draft.summary}></textarea>
      </div>
      <div>
        <label for="project-context-plain-text" class="text-sm font-semibold">Plain-text projection</label>
        <textarea id="project-context-plain-text" class="mt-1 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" bind:value={draft.plainTextProjection}></textarea>
      </div>
      <div>
        <label for="project-context-rich-content" class="text-sm font-semibold">Rich content</label>
        <textarea id="project-context-rich-content" class="mt-1 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm" bind:value={draft.richContent}></textarea>
      </div>
      <div>
        <label for="project-context-change-reason" class="text-sm font-semibold">Change reason</label>
        <input id="project-context-change-reason" class="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" bind:value={draft.changeReason} />
      </div>
      {#if error}<p class="text-sm text-destructive" role="alert">{error}</p>{/if}
      {#if conflict}
        <p class="text-sm text-muted-foreground">Remote active version: {projectContext?.active_version_number ?? 0}</p>
        {#if reloadError}<p class="text-sm text-destructive" role="alert">{reloadError}</p>{/if}
      {/if}
      {#if success}<p class="text-sm text-primary" role="status">{success}</p>{/if}
      <div class="flex gap-2">
        <button type="button" class="rounded-md border border-border px-3 py-2 text-sm" onclick={cancelEditing} disabled={saving}>Cancel</button>
        {#if conflict}
          <button type="button" class="rounded-md border border-border px-3 py-2 text-sm" onclick={reloadAfterConflict} disabled={reloading}>
            {reloading ? 'Reloading...' : 'Reload Project Context'}
          </button>
        {/if}
        <button type="submit" class="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" disabled={saving}>
          {saving ? 'Publishing...' : 'Publish context'}
        </button>
      </div>
    </form>
  {/if}
  {#if !editing && success}
    <p class="mt-2 text-sm text-primary" role="status">{success}</p>
  {/if}
{/if}
