<script lang="ts">
  import Label from '@/apps/user/shared/ui/label.svelte'
  import type { TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface AuthoringContextResponse {
    data?: {
      activeProjectContext: {
        id: string
        versionNumber: number
        title: string
        summary: string
        privacyClassification: string
      } | null
      workPackages: {
        id: string
        key: string
        title: string
        summary: string
        status: 'ready' | 'no_active_version'
        activeVersion: {
          id: string
          versionNumber: number
          title: string
          summary: string
          projectContextVersionId: string | null
          privacyClassification: string
        } | null
      }[]
    }
  }

  interface Props {
    projectId: string
    projectContextVersionId?: string
    workPackageVersionId?: string
    setFormData: (updater: (previous: TaskCreateFormData) => TaskCreateFormData) => void
  }

  const props: Props = $props()
  const { t } = useTranslation()
  let loading = $state(false)
  let error = $state('')
  let context = $state<AuthoringContextResponse['data'] | null>(null)
  let lastProjectId = ''
  let requestKey = 0

  $effect(() => {
    const projectId = props.projectId
    const currentRequest = ++requestKey

    if (lastProjectId !== projectId) {
      lastProjectId = projectId
      props.setFormData((previous) => ({
        ...previous,
        project_context_version_id: undefined,
        work_package_version_id: undefined,
      }))
    }

    context = null
    error = ''
    if (!projectId) {
      loading = false
      return
    }

    loading = true
    fetch(`/api/v1/projects/${projectId}/task-authoring-context`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load authoring context')
        return (await response.json()) as AuthoringContextResponse
      })
      .then((payload) => {
        if (currentRequest !== requestKey) return
        context = payload.data ?? null
      })
      .catch(() => {
        if (currentRequest !== requestKey) return
        error = t('task.create.authoring_context_load_error', {}, 'Không thể tải ngữ cảnh soạn thảo của project.')
      })
      .finally(() => {
        if (currentRequest === requestKey) loading = false
      })
  })

  function selectContext(event: Event) {
    const value = (event.target as HTMLSelectElement).value
    props.setFormData((previous) => ({
      ...previous,
      project_context_version_id: value || undefined,
    }))
  }

  function selectWorkPackage(event: Event) {
    const value = (event.target as HTMLSelectElement).value
    const selected = context?.workPackages.find((item) => item.activeVersion?.id === value)
    props.setFormData((previous) => ({
      ...previous,
      work_package_version_id: value || undefined,
      ...(selected?.activeVersion?.projectContextVersionId
        ? { project_context_version_id: selected.activeVersion.projectContextVersionId }
        : {}),
    }))
  }
</script>

<div data-testid="task-authoring-context-selector" class="grid gap-3 rounded-lg border border-dashed bg-background/60 p-3">
  <div>
    <p class="text-sm font-semibold">{t('task.create.authoring_context_title', {}, 'Ngữ cảnh soạn thảo của project')}</p>
    <p class="text-xs text-muted-foreground">{t('task.create.authoring_context_description', {}, 'Chọn ngữ cảnh hiện hành của tenant để gắn vào contract của task.')}</p>
  </div>

  {#if loading}
    <p class="text-sm text-muted-foreground" role="status">{t('task.create.loading_project_context', {}, 'Đang tải ngữ cảnh project…')}</p>
  {:else if error}
    <p class="text-sm text-destructive" role="alert">{error}</p>
  {:else if !props.projectId}
    <p class="text-sm text-muted-foreground">{t('task.create.choose_project_for_context', {}, 'Chọn project để tải ngữ cảnh soạn thảo.')}</p>
  {:else if context}
    <div class="grid gap-3 md:grid-cols-2">
      <div class="grid gap-2">
        <Label for="project_context_version_id">{t('task.create.project_context', {}, 'Ngữ cảnh project')}</Label>
        <select id="project_context_version_id" class="h-10 rounded-md border bg-background px-3 text-sm" value={props.projectContextVersionId ?? ''} onchange={selectContext}>
          <option value="">{t('task.create.no_active_project_context', {}, 'Không có ngữ cảnh project hiện hành')}</option>
          {#if context.activeProjectContext}
            <option value={context.activeProjectContext.id}>
              v{context.activeProjectContext.versionNumber} · {context.activeProjectContext.title}
            </option>
          {/if}
        </select>
      </div>

      <div class="grid gap-2">
        <Label for="work_package_version_id">{t('task.create.work_package', {}, 'Gói công việc')}</Label>
        <select id="work_package_version_id" class="h-10 rounded-md border bg-background px-3 text-sm" value={props.workPackageVersionId ?? ''} onchange={selectWorkPackage}>
          <option value="">{t('task.create.no_work_package', {}, 'Không có gói công việc')}</option>
          {#each context.workPackages as workPackage (workPackage.id)}
            <option value={workPackage.activeVersion?.id ?? ''} disabled={!workPackage.activeVersion}>
              {workPackage.key} · {workPackage.title}{workPackage.activeVersion ? ` v${workPackage.activeVersion.versionNumber}` : ` · ${t('task.create.no_active_version', {}, 'chưa có phiên bản hiện hành')}`}
            </option>
          {/each}
        </select>
      </div>
    </div>
  {:else}
    <p class="text-sm text-muted-foreground">{t('task.create.no_authoring_context', {}, 'Không có ngữ cảnh soạn thảo của project.')}</p>
  {/if}
</div>
