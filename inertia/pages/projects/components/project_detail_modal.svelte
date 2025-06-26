<script lang="ts">
  import axios from 'axios'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import { formatDate } from '@/lib/utils'

  interface ProjectDetailData {
    id: string
    name: string
    description?: string
    organization_name?: string
    status?: string
    start_date?: string
    end_date?: string
    creator_id?: string
    manager_id?: string
    members?: Array<{ name?: string; username?: string }>
    auth_user?: { id: string }
    permissions?: {
      canEdit?: boolean
      canDelete?: boolean
    }
  }

  interface ProjectDetailApiResponse {
    project: ProjectDetailData
    members?: Array<{ name?: string; username?: string }>
    permissions?: {
      canEdit?: boolean
      canDelete?: boolean
    }
  }

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId?: string
    onDeleted?: () => void
  }

  const props: Props = $props()

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
    if (props.open && props.projectId && !projectDetail) {
      void loadProjectDetail()
    }
  })

  async function loadProjectDetail() {
    loading = true
    error = null
    const currentProjectId = props.projectId
    try {
      if (!currentProjectId) {
        throw new Error('Project ID is required')
      }
      const response = await axios.get(`/api/projects/${currentProjectId}`)
      const payload = response.data as ProjectDetailApiResponse
      projectDetail = {
        ...payload.project,
        members: payload.members ?? payload.project.members,
      }
      canEdit = Boolean(payload.permissions?.canEdit)
      canDelete = Boolean(payload.permissions?.canDelete)
      editForm = {
        name: projectDetail.name || '',
        description: projectDetail.description || '',
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: unknown } } }
      const rawMessage = apiError.response?.data?.message
      const message = typeof rawMessage === 'string' ? rawMessage : t('common.error_loading_data', {}, 'Lỗi khi tải dữ liệu')
      error = message
      notificationStore.error(error)
    } finally {
      loading = false
    }
  }

  async function handleDelete() {
    if (!props.projectId) return
    if (!confirm(t('common.confirm_delete', {}, 'Bạn có chắc chắn muốn xóa?'))) return

    deleting = true
    try {
      await axios.delete(`/api/projects/${props.projectId}`)
      notificationStore.success(t('project.deleted', {}, 'Dự án đã được xóa'))
      props.onDeleted?.()
      props.onOpenChange(false)
      resetState()
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: unknown } } }
      const rawMessage = apiError.response?.data?.message
      const message = typeof rawMessage === 'string' ? rawMessage : t('common.error_deleting', {}, 'Lỗi khi xóa')
      notificationStore.error(message)
    } finally {
      deleting = false
    }
  }

  async function handleSaveEdit() {
    if (!props.projectId || !projectDetail) return
    saving = true
    try {
      await axios.put(`/api/projects/${props.projectId}`, {
        name: editForm.name,
        description: editForm.description,
      })
      projectDetail = {
        ...projectDetail,
        name: editForm.name,
        description: editForm.description,
      }
      editing = false
      notificationStore.success('Đã cập nhật dự án thành công')
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: unknown } } }
      const rawMessage = apiError.response?.data?.message
      const message = typeof rawMessage === 'string' ? rawMessage : 'Không thể cập nhật dự án'
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
    props.onOpenChange(false)
    resetState()
  }
</script>

<Dialog bind:open={props.open} onOpenChange={props.onOpenChange}>
  <DialogContent class="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        {loading ? t('common.loading', {}, 'Đang tải...') : projectDetail?.name || t('project.project_detail', {}, 'Chi tiết dự án')}
      </DialogTitle>
      <DialogDescription>
        {projectDetail?.organization_name ? `Tổ chức: ${projectDetail.organization_name}` : ''}
      </DialogDescription>
    </DialogHeader>

    {#if error}
      <div class="rounded-lg bg-red-50 p-4 text-red-700 text-sm">
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
            <div class="text-sm font-medium text-gray-700">{t('project.name', {}, 'Tên dự án')}</div>
            {#if editing}
              <Input value={editForm.name} oninput={handleNameInput} />
            {:else}
              <p class="mt-1 text-sm">{projectDetail.name}</p>
            {/if}
          </div>
          <div>
            <div class="text-sm font-medium text-gray-700">{t('common.status', {}, 'Trạng thái')}</div>
            <p class="mt-1 text-sm">{projectDetail.status || '-'}</p>
          </div>
        </div>

        <!-- Description -->
        {#if projectDetail.description}
          <div>
            <div class="text-sm font-medium text-gray-700">{t('common.description', {}, 'Mô tả')}</div>
            {#if editing}
              <Textarea value={editForm.description} oninput={handleDescriptionInput} />
            {:else}
              <p class="mt-1 text-sm text-gray-600">{projectDetail.description}</p>
            {/if}
          </div>
        {/if}

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm font-medium text-gray-700">{t('project.start_date', {}, 'Ngày bắt đầu')}</div>
            <p class="mt-1 text-sm">{projectDetail.start_date ? formatDate(projectDetail.start_date) : '-'}</p>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-700">{t('project.end_date', {}, 'Ngày kết thúc')}</div>
            <p class="mt-1 text-sm">{projectDetail.end_date ? formatDate(projectDetail.end_date) : '-'}</p>
          </div>
        </div>

        <!-- Members -->
        {#if projectDetail.members && projectDetail.members.length > 0}
          <div>
            <div class="text-sm font-medium text-gray-700">{t('project.members', {}, 'Thành viên')}</div>
            <ul class="mt-2 space-y-1 text-sm">
              {#each projectDetail.members as member}
                <li class="text-gray-600">{member.name || member.username || '-'}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}

    <DialogFooter>
      <Button variant="outline" onclick={handleClose} disabled={deleting}>
        {t('common.close', {}, 'Đóng')}
      </Button>
      {#if canEdit && projectDetail}
        {#if editing}
          <Button variant="outline" onclick={() => { editing = false }} disabled={saving || deleting}>
            Hủy sửa
          </Button>
          <Button onclick={() => { void handleSaveEdit() }} disabled={saving || deleting}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        {:else}
          <Button variant="outline" onclick={() => { editing = true }} disabled={deleting}>
            Sửa
          </Button>
        {/if}
      {/if}
      {#if canDelete && projectDetail}
        <Button
          variant="destructive"
          onclick={handleDelete}
          disabled={deleting || loading}
        >
          {deleting ? t('common.deleting', {}, 'Đang xóa...') : t('common.delete', {}, 'Xóa')}
        </Button>
      {/if}
    </DialogFooter>
  </DialogContent>
</Dialog>
