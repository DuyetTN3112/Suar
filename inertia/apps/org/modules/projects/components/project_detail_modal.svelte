<script lang="ts">
  import axios from 'axios'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/org/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import { confirmDialogStore } from '@/apps/org/shared/stores/confirm_dialog_store.svelte'
  import { formatDate } from '@/apps/org/shared/lib/utils'
  import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface ProjectDetailData {
    id: string
    name: string
    description?: string
    organizationName?: string
    status?: string
    startDate?: string
    endDate?: string
    creatorId?: string
    managerId?: string
    members?: { username?: string; email?: string }[]
  }

  interface ProjectDetailApiResponse {
    data: {
      project: ProjectDetailData
      members?: { username?: string; email?: string }[]
      permissions?: {
        canEdit?: boolean
        canDelete?: boolean
      }
    }
  }

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId?: string
    onDeleted?: () => void
  }

  let { open = $bindable(), onOpenChange, projectId, onDeleted }: Props = $props()

  const { t } = useTranslation()

  let loading = $state(false)
  let deleting = $state(false)
  let saving = $state(false)
  let projectDetail = $state<ProjectDetailData | null>(null)
  let error = $state<string | null>(null)
  let canEdit = $state(false)
  let canDelete = $state(false)
  let editing = $state(false)
  let editForm = $state({
    name: '',
    description: '',
  })

  function handleNameInput(event: Event) {
    const target = event.target as HTMLInputElement
    editForm.name = target.value
  }

  function handleDescriptionInput(event: Event) {
    const target = event.target as HTMLTextAreaElement
    editForm.description = target.value
  }

  $effect(() => {
    if (open && projectId && !projectDetail) {
      void loadProjectDetail()
    }
  })

  async function loadProjectDetail() {
    loading = true
    error = null
    const currentProjectId = projectId
    try {
      if (!currentProjectId) {
        throw new Error('Project ID is required')
      }
      // APPROVED: GroupC - project-detail-modal-live-fetch
      const response = await axios.get(`/api/v1/projects/${currentProjectId}`)
      const payload = response.data as ProjectDetailApiResponse
      const detail = payload.data
      projectDetail = {
        ...detail.project,
        members: detail.members ?? detail.project.members,
      }
      canEdit = Boolean(detail.permissions?.canEdit)
      canDelete = Boolean(detail.permissions?.canDelete)
      editForm = {
        name: projectDetail.name || '',
        description: projectDetail.description ?? '',
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: unknown } } }
      const rawMessage = apiError.response?.data?.message
      const message = typeof rawMessage === 'string' ? rawMessage : t('common.error_loading_data', {}, 'Unable to load data')
      error = message
      notificationStore.error(error)
    } finally {
      loading = false
    }
  }

  async function handleDelete() {
    if (!projectId) return
    const confirmed = await confirmDialogStore.request({
      title: t('project.detail_modal.confirm_delete_title', {}, 'Delete project'),
      desc: t('project.detail_modal.confirm_delete_desc', {}, 'Delete this project?'),
      confirmText: t('common.delete', {}, 'Delete'),
      cancelBtnText: t('common.cancel', {}, 'Cancel'),
      destructive: true,
    })
    if (!confirmed) return

    deleting = true
    try {
      // APPROVED: GroupC - project-detail-modal-inline-delete
      await axios.delete(`/api/v1/projects/${projectId}`)
      notificationStore.success(t('project.deleted', {}, 'Project deleted'))
      onDeleted?.()
      onOpenChange(false)
      resetState()
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: unknown } } }
      const rawMessage = apiError.response?.data?.message
      const message = typeof rawMessage === 'string' ? rawMessage : t('common.error_deleting', {}, 'Unable to delete')
      notificationStore.error(message)
    } finally {
      deleting = false
    }
  }

  async function handleSaveEdit() {
    if (!projectId || !projectDetail) return
    saving = true
    try {
      // APPROVED: GroupC - project-detail-modal-inline-edit
      await axios.patch(`/api/v1/projects/${projectId}`, {
        name: editForm.name,
        description: editForm.description,
      })
      projectDetail = {
        ...projectDetail,
        name: editForm.name,
        description: editForm.description,
      }
      editing = false
      notificationStore.success(t('project.detail_modal.update_success', {}, 'Project updated successfully'))
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: unknown } } }
      const rawMessage = apiError.response?.data?.message
      const message = typeof rawMessage === 'string' ? rawMessage : t('project.detail_modal.update_error', {}, 'Unable to update project')
      notificationStore.error(message)
    } finally {
      saving = false
    }
  }

  function resetState() {
    projectDetail = null
    error = null
    loading = false
    editing = false
    saving = false
    canEdit = false
    canDelete = false
  }

  function handleClose() {
    onOpenChange(false)
    resetState()
  }
</script>

<Dialog bind:open onOpenChange={onOpenChange}>
  <DialogContent class="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        {loading ? t('common.loading', {}, 'Loading...') : projectDetail?.name ?? t('project.project_detail', {}, 'Project details')}
      </DialogTitle>
      <DialogDescription>
        {projectDetail?.organizationName ? `${t('project.detail_modal.organization_prefix', {}, 'Organization')}: ${projectDetail.organizationName}` : ''}
      </DialogDescription>
    </DialogHeader>

    {#if error}
      <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
        {error}
      </div>
    {:else if loading}
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin">...</div>
      </div>
    {:else if projectDetail}
      <div class="grid gap-4 py-4">
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm font-medium text-foreground/80">{t('project.name', {}, 'Project Name')}</div>
            {#if editing}
              <Input value={editForm.name} oninput={handleNameInput} />
            {:else}
              <p class="mt-1 text-sm">{projectDetail.name}</p>
            {/if}
          </div>
          <div>
            <div class="text-sm font-medium text-foreground/80">{t('common.status', {}, 'Status')}</div>
            <p class="mt-1 text-sm">{projectDetail.status ?? '-'}</p>
          </div>
        </div>

        <!-- Description -->
        {#if projectDetail.description}
          <div>
            <div class="text-sm font-medium text-foreground/80">{t('common.description', {}, 'Description')}</div>
            {#if editing}
              <Textarea value={editForm.description} oninput={handleDescriptionInput} />
            {:else}
              <p class="mt-1 text-sm text-muted-foreground">{projectDetail.description}</p>
            {/if}
          </div>
        {/if}

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm font-medium text-foreground/80">{t('project.start_date', {}, 'Start Date')}</div>
            <p class="mt-1 text-sm">{projectDetail.startDate ? formatDate(projectDetail.startDate) : '-'}</p>
          </div>
          <div>
            <div class="text-sm font-medium text-foreground/80">{t('project.end_date', {}, 'End Date')}</div>
            <p class="mt-1 text-sm">{projectDetail.endDate ? formatDate(projectDetail.endDate) : '-'}</p>
          </div>
        </div>

        <!-- Members -->
        {#if projectDetail.members && projectDetail.members.length > 0}
          <div>
            <div class="text-sm font-medium text-foreground/80">{t('project.members', {}, 'Members')}</div>
            <ul class="mt-2 space-y-1 text-sm">
              {#each projectDetail.members as member}
                <li class="text-muted-foreground">{(member.username ?? member.email) ?? '-'}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={deleting}>
        {t('common.close', {}, 'Close')}
      </Button>
      {#if canEdit && projectDetail}
        {#if editing}
          <Button variant="outline" onclick={() => { editing = false }} disabled={saving || deleting}>
            {t('project.detail_modal.cancel_edit', {}, 'Cancel edit')}
          </Button>
          <Button onclick={() => { void handleSaveEdit() }} disabled={saving || deleting}>
            {saving ? t('project.detail_modal.saving', {}, 'Saving...') : t('project.detail_modal.save', {}, 'Save')}
          </Button>
        {:else}
          <Button variant="outline" onclick={() => { editing = true }} disabled={deleting}>
            {t('project.detail_modal.edit', {}, 'Edit')}
          </Button>
        {/if}
      {/if}
      {#if canDelete && projectDetail}
        <Button
          variant="destructive"
          onclick={() => { void handleDelete() }}
          disabled={deleting || loading}
        >
          {deleting ? t('common.deleting', {}, 'Deleting...') : t('common.delete', {}, 'Delete')}
        </Button>
      {/if}
    </DialogFooter>
  </DialogContent>
</Dialog>
