<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import axios from 'axios'
  import ArrowLeft from 'lucide-svelte/icons/arrow-left'
  import History from 'lucide-svelte/icons/history'
  import LinkIcon from 'lucide-svelte/icons/link'
  import ListTodo from 'lucide-svelte/icons/list-todo'
  import MessageSquare from 'lucide-svelte/icons/message-square'
  import Paperclip from 'lucide-svelte/icons/paperclip'
  import Edit from 'lucide-svelte/icons/pencil'
  import Trash2 from 'lucide-svelte/icons/trash-2'
  import { onMount } from 'svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import { FRONTEND_ROUTES, getTaskDetailRoute } from '@/constants'
import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import TaskDeleteDialog from './components/detail/task_delete_dialog.svelte'
  import TaskDetailsSidebar from './components/detail/task_details_sidebar.svelte'
  import TaskExecutionBrief from './components/detail/task_execution_brief.svelte'
  import SkillRequirementsTab from './components/skill_requirements_tab.svelte'
  import {
    formatAuditChangeValue,
    labelColors,
    priorityColors,
    statusColors,
    type TaskShowProps,
  } from './show_helpers'
  import { formatDateTime } from './utils/task_formatter.svelte'

  const {
    task,
    permissions,
    auditLogs,
    baseRoute = FRONTEND_ROUTES.TASKS,
  }: TaskShowProps = $props()
  const { t } = useTranslation()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const currentUserId = $derived(
    (page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id ?? null
  )

  interface TaskComment {
    id: string
    author_id: string
    author_username?: string | null
    body: string
    visibility: string
    comment_type: string
    created_at: string
  }

  interface TaskAttachment {
    id: string
    file_name: string
    file_path: string
    file_size?: number | null
    mime_type?: string | null
    attachment_type: string
    uploaded_by: string
    uploaded_by_username?: string | null
    created_at: string
  }

  interface TaskCollectionResponse<TItem> {
    data: TItem[]
  }

  let deleteDialogOpen = $state(false)
  let deleting = $state(false)
  let comments = $state<TaskComment[]>([])
  let attachments = $state<TaskAttachment[]>([])
  let loadingComments = $state(false)
  let loadingAttachments = $state(false)
  let savingComment = $state(false)
  let savingAttachment = $state(false)
  let deletingCommentId = $state<string | null>(null)
  let deletingAttachmentId = $state<string | null>(null)
  let detailError = $state('')
  let commentBody = $state('')
  let attachmentForm = $state({
    file_name: '',
    file_path: '',
    attachment_type: 'reference',
    mime_type: '',
    file_size: '',
  })

  const statusLabel = $derived(t(`task.status_${task.status}`, {}, task.status))
  const priorityLabel = $derived(t(`task.priority_${task.priority}`, {}, task.priority))
  const labelLabel = $derived(t(`task.label_${task.label}`, {}, task.label))
  const hasContextCard = $derived(
    Boolean(
      task.task_type ??
        task.acceptance_criteria ??
        task.verification_method ??
        task.context_background ??
        (task.tech_stack?.length ? 'tech-stack' : null) ??
        (task.learning_objectives?.length ? 'learning-objectives' : null) ??
        (task.domain_tags?.length ? 'domain-tags' : null) ??
        task.environment ??
        task.collaboration_type ??
        task.complexity_notes ??
        task.role_in_task ??
        task.autonomy_level ??
        task.problem_category ??
        task.business_domain ??
        task.estimated_users_affected
    )
  )

  function handleBack() {
    router.visit(baseRoute)
  }

  function handleEdit() {
    router.visit(`${getTaskDetailRoute(task.id)}/edit`)
  }

  function handleApply() {
    router.post(
      `${getTaskDetailRoute(task.id)}/apply`,
      {},
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  function confirmDelete() {
    deleting = true
    router.delete(getTaskDetailRoute(task.id), {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        deleteDialogOpen = false
        deleting = false
      },
      onError: () => {
        deleting = false
      },
    })
  }

  function formatBytes(size?: number | null): string {
    if (!size || Number.isNaN(size)) return 'N/A'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  async function loadComments() {
    loadingComments = true
    try {
      const response = await axios.get<TaskCollectionResponse<TaskComment>>(`/api/tasks/${task.id}/comments`)
      comments = Array.isArray(response.data.data) ? response.data.data : []
    } catch (error) {
      console.error('Error loading task comments:', error)
      detailError = 'Không tải được thảo luận công việc.'
    } finally {
      loadingComments = false
    }
  }

  async function loadAttachments() {
    loadingAttachments = true
    try {
      const response = await axios.get<TaskCollectionResponse<TaskAttachment>>(
        `/api/tasks/${task.id}/attachments`
      )
      attachments = Array.isArray(response.data.data) ? response.data.data : []
    } catch (error) {
      console.error('Error loading task attachments:', error)
      detailError = 'Không tải được tệp đính kèm.'
    } finally {
      loadingAttachments = false
    }
  }

  async function submitComment() {
    if (!commentBody.trim() || savingComment) return

    savingComment = true
    detailError = ''

    try {
      await axios.post(`/api/tasks/${task.id}/comments`, {
        body: commentBody.trim(),
        comment_type: 'normal',
        visibility: 'internal',
      })
      commentBody = ''
      await loadComments()
    } catch (error) {
      console.error('Error creating task comment:', error)
      detailError = 'Không gửi được bình luận.'
    } finally {
      savingComment = false
    }
  }

  async function removeComment(commentId: string) {
    deletingCommentId = commentId
    detailError = ''

    try {
      await axios.delete(`/api/tasks/${task.id}/comments/${commentId}`)
      await loadComments()
    } catch (error) {
      console.error('Error deleting task comment:', error)
      detailError = 'Không xóa được bình luận.'
    } finally {
      deletingCommentId = null
    }
  }

  async function submitAttachment() {
    if (!attachmentForm.file_name.trim() || !attachmentForm.file_path.trim() || savingAttachment) {
      return
    }

    savingAttachment = true
    detailError = ''

    try {
      await axios.post(`/api/tasks/${task.id}/attachments`, {
        file_name: attachmentForm.file_name.trim(),
        file_path: attachmentForm.file_path.trim(),
        attachment_type: attachmentForm.attachment_type,
        mime_type: attachmentForm.mime_type.trim() || null,
        file_size: attachmentForm.file_size.trim() ? Number(attachmentForm.file_size) : null,
      })
      attachmentForm = {
        file_name: '',
        file_path: '',
        attachment_type: 'reference',
        mime_type: '',
        file_size: '',
      }
      await loadAttachments()
    } catch (error) {
      console.error('Error creating task attachment:', error)
      detailError = 'Không thêm được tệp đính kèm.'
    } finally {
      savingAttachment = false
    }
  }

  async function removeAttachment(attachmentId: string) {
    deletingAttachmentId = attachmentId
    detailError = ''

    try {
      await axios.delete(`/api/tasks/${task.id}/attachments/${attachmentId}`)
      await loadAttachments()
    } catch (error) {
      console.error('Error deleting task attachment:', error)
      detailError = 'Không xóa được tệp đính kèm.'
    } finally {
      deletingAttachmentId = null
    }
  }

  onMount(async () => {
    await Promise.all([loadComments(), loadAttachments()])
  })

</script>

<svelte:head>
  <title>{task.title}</title>
</svelte:head>

<Layout title={task.title}>
  <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex-1 space-y-3">
        <Button variant="ghost" size="sm" onclick={handleBack}>
          <ArrowLeft class="size-4 mr-1" />
          {t('common.back', {}, 'Quay lại')}
        </Button>

        <h1 class="text-3xl font-black tracking-tight">{task.title}</h1>

        <div class="flex flex-wrap items-center gap-2">
          <Badge class={statusColors[task.status] || ''}>
            {statusLabel}
          </Badge>
          <Badge class={priorityColors[task.priority] || ''}>
            {priorityLabel}
          </Badge>
          <Badge class={labelColors[task.label] || ''}>
            {labelLabel}
          </Badge>
          {#if task.difficulty}
            <Badge variant="outline">{task.difficulty}</Badge>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if permissions.canApply}
          <Button onclick={handleApply}>
            {t('task.apply', {}, 'Ứng tuyển')}
          </Button>
        {/if}
        {#if permissions.canEdit}
          <Button variant="outline" onclick={handleEdit}>
            <Edit class="size-4 mr-1" />
            {t('common.edit', {}, 'Sửa')}
          </Button>
        {/if}
        {#if permissions.canDelete}
          <Button variant="destructive" onclick={() => { deleteDialogOpen = true }}>
            <Trash2 class="size-4 mr-1" />
            {t('common.delete', {}, 'Xóa')}
          </Button>
        {/if}
      </div>
    </div>

    <!-- Main 2-column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left column (wider) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Description -->
        <Card>
          <CardHeader>
            <CardTitle>{t('task.description', {}, 'Mô tả')}</CardTitle>
          </CardHeader>
          <CardContent>
            {#if task.description}
              <div class="prose prose-sm max-w-none whitespace-pre-wrap">
                {task.description}
              </div>
            {:else}
              <p class="text-muted-foreground italic">
                {t('task.no_description', {}, 'Chưa có mô tả.')}
              </p>
            {/if}
          </CardContent>
        </Card>

        <!-- Bối cảnh & Tiêu chí nghiệm thu chi tiết -->
        {#if hasContextCard}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <span class="text-primary font-bold">✦</span> Bối cảnh & Tiêu chí nghiệm thu chi tiết
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-6">
              {#if task.context_background}
                <div class="space-y-1">
                  <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bối cảnh nghiệp vụ</h4>
                  <p class="text-sm bg-muted/30 p-3 rounded-md whitespace-pre-wrap border border-border/50">{task.context_background}</p>
                </div>
              {/if}

              {#if task.acceptance_criteria}
                <div class="space-y-1">
                  <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tiêu chí nghiệm thu (Acceptance Criteria)</h4>
                  <p class="text-sm bg-muted/30 p-3 rounded-md whitespace-pre-wrap border border-border/50">{task.acceptance_criteria}</p>
                </div>
              {/if}

              {#if task.verification_method}
                <div class="space-y-1">
                  <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phương thức xác minh</h4>
                  <p class="text-sm bg-muted/30 p-3 rounded-md whitespace-pre-wrap border border-border/50">{task.verification_method}</p>
                </div>
              {/if}

              <!-- Tech Stack & Tags -->
              <div class="grid gap-4 md:grid-cols-2">
                {#if task.tech_stack && task.tech_stack.length > 0}
                  <div class="space-y-1">
                    <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Công nghệ sử dụng (Tech Stack)</h4>
                    <div class="flex flex-wrap gap-1.5 pt-1">
                      {#each task.tech_stack as tech}
                        <Badge variant="secondary" class="bg-primary/5 text-primary border-primary/20">{tech}</Badge>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if task.domain_tags && task.domain_tags.length > 0}
                  <div class="space-y-1">
                    <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Domain Tags</h4>
                    <div class="flex flex-wrap gap-1.5 pt-1">
                      {#each task.domain_tags as tag}
                        <Badge variant="outline" class="border-indigo-200 text-indigo-700 bg-indigo-50/50">{tag}</Badge>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

              {#if task.learning_objectives && task.learning_objectives.length > 0}
                <div class="space-y-1">
                  <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mục tiêu học tập (Learning Objectives)</h4>
                  <ul class="list-disc list-inside text-sm space-y-1 pl-1 text-muted-foreground">
                    {#each task.learning_objectives as obj}
                      <li><span class="text-foreground">{obj}</span></li>
                    {/each}
                  </ul>
                </div>
              {/if}

              <!-- Advanced Metadata Grid -->
              <div class="border-t pt-4">
                <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Thông tin nâng cao cho AI & Dispute Resolution</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {#if task.task_type}
                    <div class="rounded-md border p-2 bg-muted/10">
                      <span class="text-[10px] text-muted-foreground block font-bold uppercase">Loại Task</span>
                      <span class="font-semibold">{task.task_type}</span>
                    </div>
                  {/if}
                  {#if task.environment}
                    <div class="rounded-md border p-2 bg-muted/10">
                      <span class="text-[10px] text-muted-foreground block font-bold uppercase">Môi trường</span>
                      <span class="font-semibold">{task.environment}</span>
                    </div>
                  {/if}
                  {#if task.collaboration_type}
                    <div class="rounded-md border p-2 bg-muted/10">
                      <span class="text-[10px] text-muted-foreground block font-bold uppercase">Hình thức cộng tác</span>
                      <span class="font-semibold">{task.collaboration_type}</span>
                    </div>
                  {/if}
                  {#if task.role_in_task}
                    <div class="rounded-md border p-2 bg-muted/10">
                      <span class="text-[10px] text-muted-foreground block font-bold uppercase">Vai trò trong task</span>
                      <span class="font-semibold">{task.role_in_task}</span>
                    </div>
                  {/if}
                  {#if task.autonomy_level}
                    <div class="rounded-md border p-2 bg-muted/10">
                      <span class="text-[10px] text-muted-foreground block font-bold uppercase">Mức độ tự chủ</span>
                      <span class="font-semibold">{task.autonomy_level}</span>
                    </div>
                  {/if}
                  {#if task.problem_category}
                    <div class="rounded-md border p-2 bg-muted/10">
                      <span class="text-[10px] text-muted-foreground block font-bold uppercase">Loại vấn đề</span>
                      <span class="font-semibold">{task.problem_category}</span>
                    </div>
                  {/if}
                  {#if task.business_domain}
                    <div class="rounded-md border p-2 bg-muted/10">
                      <span class="text-[10px] text-muted-foreground block font-bold uppercase">Nghiệp vụ</span>
                      <span class="font-semibold">{task.business_domain}</span>
                    </div>
                  {/if}
                  {#if task.estimated_users_affected !== undefined && task.estimated_users_affected !== null}
                    <div class="rounded-md border p-2 bg-muted/10">
                      <span class="text-[10px] text-muted-foreground block font-bold uppercase">Số user ảnh hưởng</span>
                      <span class="font-semibold">{task.estimated_users_affected}</span>
                    </div>
                  {/if}
                  {#if task.complexity_notes}
                    <div class="col-span-full rounded-md border p-2 bg-muted/10">
                      <span class="text-[10px] text-muted-foreground block font-bold uppercase">Ghi chú độ phức tạp</span>
                      <span class="font-semibold">{task.complexity_notes}</span>
                    </div>
                  {/if}
                </div>
              </div>

              <TaskExecutionBrief task={task} />
            </CardContent>
          </Card>
        {/if}

        <!-- Parent Task -->
        {#if task.parentTask}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <LinkIcon class="size-4" />
                {t('task.parent_task', {}, 'Nhiệm vụ cha')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`${baseRoute}/${task.parentTask.id}`}
                class="inline-flex items-center gap-2 font-bold text-primary hover:underline"
              >
                {task.parentTask.title}
                <Badge variant="outline" class="text-xs">{task.parentTask.status}</Badge>
              </a>
            </CardContent>
          </Card>
        {/if}

        <!-- Child Tasks -->
        {#if task.childTasks && task.childTasks.length > 0}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <ListTodo class="size-4" />
                {t('task.child_tasks', {}, 'Nhiệm vụ con')} ({task.childTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                {#each task.childTasks as child (child.id)}
                  <a
                    href={`${baseRoute}/${child.id}`}
                    class="flex items-center justify-between rounded-md border-2 border-border p-3 shadow-xs hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                  >
                    <span class="font-bold">{child.title}</span>
                    <div class="flex items-center gap-2">
                      <Badge class={statusColors[child.status] || ''} >
                        {child.status}
                      </Badge>
                      <Badge class={priorityColors[child.priority] || ''} >
                        {child.priority}
                      </Badge>
                    </div>
                  </a>
                {/each}
              </div>
            </CardContent>
          </Card>
        {/if}

        <Card>
          <CardHeader>
            <CardTitle>Skill requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillRequirementsTab
              taskId={task.id}
              projectId={task.project_id}
              canEdit={permissions.canEdit}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <MessageSquare class="size-4" />
              Thảo luận công việc
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {#if detailError}
              <div class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {detailError}
              </div>
            {/if}

            <div class="space-y-3">
              <Textarea
                bind:value={commentBody}
                rows={4}
                placeholder="Ghi chú tiến độ, câu hỏi, quyết định kỹ thuật..."
              />
              <div class="flex justify-end">
                <Button onclick={submitComment} disabled={savingComment || commentBody.trim().length === 0}>
                  {savingComment ? 'Đang gửi...' : 'Gửi bình luận'}
                </Button>
              </div>
            </div>

            {#if loadingComments}
              <p class="text-sm text-muted-foreground">Đang tải thảo luận...</p>
            {:else if comments.length === 0}
              <p class="text-sm text-muted-foreground">Chưa có bình luận nào cho task này.</p>
            {:else}
              <div class="space-y-3">
                {#each comments as comment (comment.id)}
                  <div class="rounded-md border p-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex flex-wrap items-center gap-2 text-sm">
                        <span class="font-bold">{comment.author_username ?? comment.author_id}</span>
                        <Badge variant="outline" class="text-[10px] uppercase">{comment.comment_type}</Badge>
                        <Badge variant="outline" class="text-[10px] uppercase">{comment.visibility}</Badge>
                        <span class="text-muted-foreground">{formatDateTime(comment.created_at)}</span>
                      </div>
                      {#if currentUserId && comment.author_id === currentUserId}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingCommentId === comment.id}
                          onclick={() => { void removeComment(comment.id) }}
                        >
                          <Trash2 class="size-4" />
                        </Button>
                      {/if}
                    </div>
                    <p class="mt-3 whitespace-pre-wrap text-sm">{comment.body}</p>
                  </div>
                {/each}
              </div>
            {/if}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Paperclip class="size-4" />
              Tệp đính kèm
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-2">
                <Label for="attachment-name">Tên tệp</Label>
                <Input
                  id="attachment-name"
                  bind:value={attachmentForm.file_name}
                  placeholder="architecture-decision.md"
                />
              </div>
              <div class="space-y-2">
                <Label for="attachment-type">Loại tệp</Label>
                <select
                  id="attachment-type"
                  bind:value={attachmentForm.attachment_type}
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="reference">reference</option>
                  <option value="requirement">requirement</option>
                  <option value="design">design</option>
                  <option value="other">other</option>
                </select>
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label for="attachment-path">Đường dẫn / URL</Label>
                <Input
                  id="attachment-path"
                  bind:value={attachmentForm.file_path}
                  placeholder="/uploads/tasks/spec.pdf hoặc https://..."
                />
              </div>
              <div class="space-y-2">
                <Label for="attachment-mime">MIME type</Label>
                <Input
                  id="attachment-mime"
                  bind:value={attachmentForm.mime_type}
                  placeholder="application/pdf"
                />
              </div>
              <div class="space-y-2">
                <Label for="attachment-size">Kích thước byte</Label>
                <Input
                  id="attachment-size"
                  bind:value={attachmentForm.file_size}
                  placeholder="4096"
                  type="number"
                />
              </div>
            </div>
            <div class="flex justify-end">
              <Button
                onclick={submitAttachment}
                disabled={savingAttachment || !attachmentForm.file_name.trim() || !attachmentForm.file_path.trim()}
              >
                {savingAttachment ? 'Đang thêm...' : 'Thêm tệp'}
              </Button>
            </div>

            {#if loadingAttachments}
              <p class="text-sm text-muted-foreground">Đang tải tệp đính kèm...</p>
            {:else if attachments.length === 0}
              <p class="text-sm text-muted-foreground">Chưa có tệp đính kèm nào.</p>
            {:else}
              <div class="space-y-3">
                {#each attachments as attachment (attachment.id)}
                  <div class="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div class="space-y-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <a
                          href={attachment.file_path}
                          target="_blank"
                          rel="noreferrer"
                          class="font-bold text-primary hover:underline"
                        >
                          {attachment.file_name}
                        </a>
                        <Badge variant="outline" class="text-[10px] uppercase">{attachment.attachment_type}</Badge>
                      </div>
                      <div class="text-sm text-muted-foreground">
                        {attachment.uploaded_by_username ?? attachment.uploaded_by}
                        ·
                        {formatDateTime(attachment.created_at)}
                        ·
                        {formatBytes(attachment.file_size)}
                      </div>
                      {#if attachment.mime_type}
                        <div class="text-xs text-muted-foreground">{attachment.mime_type}</div>
                      {/if}
                    </div>
                    {#if currentUserId && attachment.uploaded_by === currentUserId}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingAttachmentId === attachment.id}
                        onclick={() => { void removeAttachment(attachment.id) }}
                      >
                        <Trash2 class="size-4" />
                      </Button>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </CardContent>
        </Card>

        <!-- Audit Log -->
        {#if auditLogs.length > 0}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <History class="size-4" />
                {t('task.audit_log', {}, 'Lịch sử thay đổi')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                {#each auditLogs as log (log.id)}
                  <div class="relative pl-6 pb-4 border-l-2 border-border last:pb-0">
                    <div class="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary border-2 border-border"></div>
                    <div class="flex flex-col gap-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-sm">
                          {log.user?.username ?? t('task.system', {}, 'Hệ thống')}
                        </span>
                        <Badge variant="outline" class="text-xs">{log.action}</Badge>
                        <span class="text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                      {#if Object.keys(log.changes).length > 0}
                        <div class="mt-1 space-y-1">
                          {#each Object.entries(log.changes) as [field, change]}
                            <div class="text-xs text-muted-foreground">
                              <span class="font-bold">{field}:</span>
                              <span class="line-through text-destructive">{formatAuditChangeValue(change.old)}</span>
                              →
                              <span class="text-foreground font-bold">{formatAuditChangeValue(change.new)}</span>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </CardContent>
          </Card>
        {/if}
      </div>

      <TaskDetailsSidebar {task} />
    </div>
  </div>
  <TaskDeleteDialog
    open={deleteDialogOpen}
    {deleting}
    taskTitle={task.title}
    onConfirmDelete={confirmDelete}
    onOpenChange={(open: boolean) => {
      deleteDialogOpen = open
    }}
  />
</Layout>
