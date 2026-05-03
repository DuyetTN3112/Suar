# Task Pages Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `tasks/show.svelte` and `tasks/create.svelte` into smaller, SOLID Svelte 5 components.

**Architecture:** Extract independent features (discussion, attachments, change history, context card, readiness checklist, and role prefill matching panel) into separate components, reducing parent page sizes and consolidating state management.

**Tech Stack:** Svelte 5, InertiaJS Svelte, Axios, TailwindCSS, Lucide-Svelte.

## Global Constraints

- No placeholder comments in code blocks.
- Follow existing import aliases (`@/...` for src root).
- Ensure Svelte 5 runes (`$state`, `$derived`, `$props`) are used correctly.

---

### Task 1: Create `TaskContextCard` component

**Files:**
- Create: `inertia/pages/tasks/components/detail/task_context_card.svelte`

**Interfaces:**
- Consumes: `task` prop (object representing the task detailed structure).
- Produces: Visual card displaying task context, business details, tech stack, and difficulty.

- [ ] **Step 1: Create `task_context_card.svelte` file with markup and logic**

Write the file content:
```html
<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import TaskExecutionBrief from './task_execution_brief.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    task: any
  }

  const { task }: Props = $props()
  const { t } = useTranslation()

  const hasContextCard = $derived(
    Boolean(
      task.task_type ??
        task.acceptance_criteria ??
        task.verification_method ??
        task.context_background ??
        (task.tech_stack?.length ? 'tech-stack' : null) ??
        (task.learning_objectives?.length ? 'learning-objectives' : null) ??
        (task.domain_tags?.length ? 'domain-tags' : null) ??
        tasklocal runtime configironment ??
        task.collaboration_type ??
        task.complexity_notes ??
        task.role_in_task ??
        task.autonomy_level ??
        task.problem_category ??
        task.business_domain ??
        task.estimated_users_affected
    )
  )
</script>

{#if hasContextCard}
  <Card>
    <CardHeader>
      <CardTitle>Ngữ cảnh</CardTitle>
    </CardHeader>
    <CardContent class="space-y-6">
      {#if task.context_background}
        <div class="space-y-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bối cảnh</h4>
          <p class="rounded-md border border-border/50 bg-muted/30 p-3 text-sm whitespace-pre-wrap">{task.context_background}</p>
        </div>
      {/if}

      {#if task.acceptance_criteria}
        <div class="space-y-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nghiệm thu</h4>
          <p class="rounded-md border border-border/50 bg-muted/30 p-3 text-sm whitespace-pre-wrap">{task.acceptance_criteria}</p>
        </div>
      {/if}

      {#if task.verification_method}
        <div class="space-y-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Xác minh</h4>
          <p class="rounded-md border border-border/50 bg-muted/30 p-3 text-sm whitespace-pre-wrap">{task.verification_method}</p>
        </div>
      {/if}

      <div class="grid gap-4 md:grid-cols-2">
        {#if task.tech_stack && task.tech_stack.length > 0}
          <div class="space-y-1">
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tech stack</h4>
            <div class="flex flex-wrap gap-1.5 pt-1">
              {#each task.tech_stack as tech}
                <Badge variant="secondary" class="border-primary/20 bg-primary/5 text-primary">{tech}</Badge>
              {/each}
            </div>
          </div>
        {/if}

        {#if task.domain_tags && task.domain_tags.length > 0}
          <div class="space-y-1">
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Domain</h4>
            <div class="flex flex-wrap gap-1.5 pt-1">
              {#each task.domain_tags as tag}
                <Badge variant="outline" class="border-indigo-200 bg-indigo-50/50 text-indigo-700">{tag}</Badge>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      {#if task.learning_objectives && task.learning_objectives.length > 0}
        <div class="space-y-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mục tiêu học tập</h4>
          <ul class="list-disc list-inside space-y-1 pl-1 text-sm text-muted-foreground">
            {#each task.learning_objectives as obj}
              <li><span class="text-foreground">{obj}</span></li>
            {/each}
          </ul>
        </div>
      {/if}

      <div class="border-t pt-4">
        <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Thông tin thêm</h4>
        <div class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          {#if task.task_type}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">Loại task</span>
              <span class="font-semibold">{task.task_type}</span>
            </div>
          {/if}
          {#if tasklocal runtime configironment}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">Môi trường</span>
              <span class="font-semibold">{tasklocal runtime configironment}</span>
            </div>
          {/if}
          {#if task.collaboration_type}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">Cộng tác</span>
              <span class="font-semibold">{task.collaboration_type}</span>
            </div>
          {/if}
          {#if task.role_in_task}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">Vai trò</span>
              <span class="font-semibold">{task.role_in_task}</span>
            </div>
          {/if}
          {#if task.autonomy_level}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">Tự chủ</span>
              <span class="font-semibold">{task.autonomy_level}</span>
            </div>
          {/if}
          {#if task.problem_category}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">Vấn đề</span>
              <span class="font-semibold">{task.problem_category}</span>
            </div>
          {/if}
          {#if task.business_domain}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">Nghiệp vụ</span>
              <span class="font-semibold">{task.business_domain}</span>
            </div>
          {/if}
          {#if task.estimated_users_affected !== undefined && task.estimated_users_affected !== null}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">User ảnh hưởng</span>
              <span class="font-semibold">{task.estimated_users_affected}</span>
            </div>
          {/if}
          {#if task.complexity_notes}
            <div class="col-span-full rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">Ghi chú</span>
              <span class="font-semibold">{task.complexity_notes}</span>
            </div>
          {/if}
        </div>
      </div>

      <TaskExecutionBrief {task} />
    </CardContent>
  </Card>
{/if}
```

- [ ] **Step 2: Commit Task 1**
Run: `git add inertia/pages/tasks/components/detail/task_context_card.svelte`
Run: `git commit -m "feat(tasks): create TaskContextCard component"`

---

### Task 2: Create `TaskDiscussionTab` component

**Files:**
- Create: `inertia/pages/tasks/components/detail/task_discussion_tab.svelte`

**Interfaces:**
- Consumes: `taskId: string`, `currentUserId: string | null`
- Produces: Discussion tab panel with encapsulated loading/creating/updating/deleting comments logic.

- [ ] **Step 1: Create `task_discussion_tab.svelte` file with API logic and markup**

Write the file content:
```html
<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'
  import MessageSquare from 'lucide-svelte/icons/message-square'
  import Edit from 'lucide-svelte/icons/pencil'
  import Trash2 from 'lucide-svelte/icons/trash-2'
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { formatDateTime } from '../../utils/task_formatter.svelte'

  interface Props {
    taskId: string
    currentUserId: string | null
  }

  interface TaskComment {
    id: string
    authorId: string
    authorUsername?: string | null
    parentCommentId?: string | null
    body: string
    visibility: string
    commentType: string
    reviewRelevance?: boolean
    editedAt?: string | null
    createdAt: string
    mentions?: Array<{
      userId: string
      username: string
      mentionToken: string
    }>
  }

  interface TaskCollectionResponse<TItem> {
    data: TItem[]
  }

  const { taskId, currentUserId }: Props = $props()
  const { t } = useTranslation()

  let comments = $state<TaskComment[]>([])
  let loadingComments = $state(false)
  let savingComment = $state(false)
  let deletingCommentId = $state<string | null>(null)
  let editingCommentId = $state<string | null>(null)
  let updatingComment = $state(false)
  let detailError = $state('')
  let commentBody = $state('')
  let commentReviewRelevance = $state(false)
  let editCommentBody = $state('')
  let editCommentReviewRelevance = $state(false)

  async function loadComments() {
    loadingComments = true
    try {
      const response = await axios.get<TaskCollectionResponse<TaskComment>>(`/api/tasks/${taskId}/comments`)
      comments = Array.isArray(response.data.data) ? response.data.data : []
    } catch (error) {
      console.error('Error loading task comments:', error)
      detailError = 'Không tải được thảo luận công việc.'
    } finally {
      loadingComments = false
    }
  }

  async function submitComment() {
    if (!commentBody.trim() || savingComment) return

    savingComment = true
    detailError = ''

    try {
      await axios.post(`/api/tasks/${taskId}/comments`, {
        body: commentBody.trim(),
        commentType: 'normal',
        visibility: 'internal',
        reviewRelevance: commentReviewRelevance,
      })
      commentBody = ''
      commentReviewRelevance = false
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
      await axios.delete(`/api/tasks/${taskId}/comments/${commentId}`)
      await loadComments()
    } catch (error) {
      console.error('Error deleting task comment:', error)
      detailError = 'Không xóa được bình luận.'
    } finally {
      deletingCommentId = null
    }
  }

  function startEditingComment(comment: TaskComment) {
    editingCommentId = comment.id
    editCommentBody = comment.body
    editCommentReviewRelevance = Boolean(comment.reviewRelevance)
    detailError = ''
  }

  function cancelEditingComment() {
    editingCommentId = null
    editCommentBody = ''
    editCommentReviewRelevance = false
  }

  async function saveCommentEdit(commentId: string) {
    if (!editCommentBody.trim() || updatingComment) return

    updatingComment = true
    detailError = ''

    try {
      await axios.patch(`/api/tasks/${taskId}/comments/${commentId}`, {
        body: editCommentBody.trim(),
        reviewRelevance: editCommentReviewRelevance,
      })
      cancelEditingComment()
      await loadComments()
    } catch (error) {
      console.error('Error updating task comment:', error)
      detailError = 'Không cập nhật được bình luận.'
    } finally {
      updatingComment = false
    }
  }

  onMount(async () => {
    await loadComments()
  })
</script>

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
        placeholder="Ghi chú tiến độ, câu hỏi, quyết định kỹ thuật... Dùng @username để tag."
      />
      <label class="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" bind:checked={commentReviewRelevance} />
        Đánh dấu bình luận này có giá trị cho review / dispute
      </label>
      <div class="flex justify-end">
        <Button onclick={submitComment} disabled={savingComment || commentBody.trim().length === 0}>
          {savingComment ? 'Đang gửi...' : 'Gửi bình luận'}
        </Button>
      </div>
    </div>

    {#if loadingComments}
      <p class="text-sm text-muted-foreground">Đang tải thảo luận...</p>
    {:else if comments.length === 0}
      <p class="text-sm text-muted-foreground">Chưa có bình luận nào.</p>
    {:else}
      <div class="space-y-3">
        {#each comments as comment (comment.id)}
          <div class="rounded-md border p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="font-bold">{comment.authorUsername ?? comment.authorId}</span>
                <Badge variant="outline" class="text-[10px] uppercase">{comment.commentType}</Badge>
                <Badge variant="outline" class="text-[10px] uppercase">{comment.visibility}</Badge>
                {#if comment.reviewRelevance}
                  <Badge class="text-[10px] uppercase bg-amber-100 text-amber-800 border-amber-200">review</Badge>
                {/if}
                <span class="text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
                {#if comment.editedAt}
                  <span class="text-muted-foreground text-xs">(đã sửa)</span>
                {/if}
              </div>
              {#if currentUserId && comment.authorId === currentUserId}
                <div class="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updatingComment || deletingCommentId === comment.id}
                    onclick={() => { startEditingComment(comment) }}
                  >
                    <Edit class="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingCommentId === comment.id || updatingComment}
                    onclick={() => { void removeComment(comment.id) }}
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              {/if}
            </div>
            {#if editingCommentId === comment.id}
              <div class="mt-3 space-y-3">
                <Textarea bind:value={editCommentBody} rows={4} />
                <label class="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" bind:checked={editCommentReviewRelevance} />
                  Tính bình luận này vào review / dispute
                </label>
                <div class="flex justify-end gap-2">
                  <Button variant="outline" onclick={cancelEditingComment} disabled={updatingComment}>
                    Hủy
                  </Button>
                  <Button
                    onclick={() => { void saveCommentEdit(comment.id) }}
                    disabled={updatingComment || editCommentBody.trim().length === 0}
                  >
                    {updatingComment ? 'Đang lưu...' : 'Lưu'}
                  </Button>
                </div>
              </div>
            {:else}
              <p class="mt-3 whitespace-pre-wrap text-sm">{comment.body}</p>
              {#if comment.mentions && comment.mentions.length > 0}
                <div class="mt-3 flex flex-wrap gap-2">
                  {#each comment.mentions as mention}
                    <Badge variant="secondary" class="text-[10px]">@{mention.username}</Badge>
                  {/each}
                </div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </CardContent>
</Card>
```

- [ ] **Step 2: Commit Task 2**
Run: `git add inertia/pages/tasks/components/detail/task_discussion_tab.svelte`
Run: `git commit -m "feat(tasks): create TaskDiscussionTab component"`

---

### Task 3: Create `TaskFilesTab` component

**Files:**
- Create: `inertia/pages/tasks/components/detail/task_files_tab.svelte`

**Interfaces:**
- Consumes: `taskId: string`, `currentUserId: string | null`
- Produces: Files tab panel displaying attachments list and addition form, managing API requests internally.

- [ ] **Step 1: Create `task_files_tab.svelte` file with API logic and markup**

Write the file content:
```html
<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'
  import Paperclip from 'lucide-svelte/icons/paperclip'
  import Trash2 from 'lucide-svelte/icons/trash-2'
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import { formatDateTime } from '../../utils/task_formatter.svelte'

  interface Props {
    taskId: string
    currentUserId: string | null
  }

  interface TaskAttachment {
    id: string
    fileName: string
    filePath: string
    fileSize?: number | null
    mimeType?: string | null
    attachmentType: string
    uploadedBy: string
    uploadedByUsername?: string | null
    createdAt: string
  }

  interface TaskCollectionResponse<TItem> {
    data: TItem[]
  }

  const { taskId, currentUserId }: Props = $props()

  let attachments = $state<TaskAttachment[]>([])
  let loadingAttachments = $state(false)
  let savingAttachment = $state(false)
  let deletingAttachmentId = $state<string | null>(null)
  let detailError = $state('')
  let attachmentForm = $state({
    fileName: '',
    filePath: '',
    attachmentType: 'reference',
    mimeType: '',
    fileSize: '',
  })

  function formatBytes(size?: number | null): string {
    if (!size || Number.isNaN(size)) return 'N/A'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  async function loadAttachments() {
    loadingAttachments = true
    try {
      const response = await axios.get<TaskCollectionResponse<TaskAttachment>>(
        `/api/tasks/${taskId}/attachments`
      )
      attachments = Array.isArray(response.data.data) ? response.data.data : []
    } catch (error) {
      console.error('Error loading task attachments:', error)
      detailError = 'Không tải được tệp đính kèm.'
    } finally {
      loadingAttachments = false
    }
  }

  async function submitAttachment() {
    if (!attachmentForm.fileName.trim() || !attachmentForm.filePath.trim() || savingAttachment) {
      return
    }

    savingAttachment = true
    detailError = ''

    try {
      await axios.post(`/api/tasks/${taskId}/attachments`, {
        fileName: attachmentForm.fileName.trim(),
        filePath: attachmentForm.filePath.trim(),
        attachmentType: attachmentForm.attachmentType,
        mimeType: attachmentForm.mimeType.trim() || null,
        fileSize: attachmentForm.fileSize.trim() ? Number(attachmentForm.fileSize) : null,
      })
      attachmentForm = {
        fileName: '',
        filePath: '',
        attachmentType: 'reference',
        mimeType: '',
        fileSize: '',
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
      await axios.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
      await loadAttachments()
    } catch (error) {
      console.error('Error deleting task attachment:', error)
      detailError = 'Không xóa được tệp đính kèm.'
    } finally {
      deletingAttachmentId = null
    }
  }

  onMount(async () => {
    await loadAttachments()
  })
</script>

<Card>
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      <Paperclip class="size-4" />
      Tệp đính kèm
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if detailError}
      <div class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {detailError}
      </div>
    {/if}

    <div class="grid gap-3 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="attachment-name">Tên tệp</Label>
        <Input
          id="attachment-name"
          bind:value={attachmentForm.fileName}
          placeholder="architecture-decision.md"
        />
      </div>
      <div class="space-y-2">
        <Label for="attachment-type">Loại tệp</Label>
        <select
          id="attachment-type"
          bind:value={attachmentForm.attachmentType}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="reference">reference</option>
          <option value="requirement">requirement</option>
          <option value="submission">submission</option>
          <option value="review">review</option>
          <option value="other">other</option>
        </select>
      </div>
      <div class="space-y-2 md:col-span-2">
        <Label for="attachment-path">Đường dẫn / URL</Label>
        <Input
          id="attachment-path"
          bind:value={attachmentForm.filePath}
          placeholder="/uploads/tasks/spec.pdf hoặc https://..."
        />
      </div>
      <div class="space-y-2">
        <Label for="attachment-mime">MIME type</Label>
        <Input
          id="attachment-mime"
          bind:value={attachmentForm.mimeType}
          placeholder="application/pdf"
        />
      </div>
      <div class="space-y-2">
        <Label for="attachment-size">Kích thước byte</Label>
        <Input
          id="attachment-size"
          bind:value={attachmentForm.fileSize}
          placeholder="4096"
          type="number"
        />
      </div>
    </div>
    <div class="flex justify-end">
      <Button
        onclick={submitAttachment}
        disabled={savingAttachment || !attachmentForm.fileName.trim() || !attachmentForm.filePath.trim()}
      >
        {savingAttachment ? 'Đang thêm...' : 'Thêm tệp'}
      </Button>
    </div>

    {#if loadingAttachments}
      <p class="text-sm text-muted-foreground">Đang tải tệp...</p>
    {:else if attachments.length === 0}
      <p class="text-sm text-muted-foreground">Chưa có tệp nào.</p>
    {:else}
      <div class="space-y-3">
        {#each attachments as attachment (attachment.id)}
          <div class="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <a
                  href={attachment.filePath}
                  target="_blank"
                  rel="noreferrer"
                  class="font-bold text-primary hover:underline"
                >
                  {attachment.fileName}
                </a>
                <Badge variant="outline" class="text-[10px] uppercase">{attachment.attachmentType}</Badge>
              </div>
              <div class="text-sm text-muted-foreground">
                {attachment.uploadedByUsername ?? attachment.uploadedBy}
                ·
                {formatDateTime(attachment.createdAt)}
                ·
                {formatBytes(attachment.fileSize)}
              </div>
              {#if attachment.mimeType}
                <div class="text-xs text-muted-foreground">{attachment.mimeType}</div>
              {/if}
            </div>
            {#if currentUserId && attachment.uploadedBy === currentUserId}
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
```

- [ ] **Step 2: Commit Task 3**
Run: `git add inertia/pages/tasks/components/detail/task_files_tab.svelte`
Run: `git commit -m "feat(tasks): create TaskFilesTab component"`

---

### Task 4: Create `TaskHistoryTab` component

**Files:**
- Create: `inertia/pages/tasks/components/detail/task_history_tab.svelte`

**Interfaces:**
- Consumes: `auditLogs: any[]`
- Produces: Audit change history log list component.

- [ ] **Step 1: Create `task_history_tab.svelte` file with markup**

Write the file content:
```html
<script lang="ts">
  import History from 'lucide-svelte/icons/history'
  import Badge from '@/components/ui/badge.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { formatAuditChangeValue } from '../../show_helpers'
  import { formatDateTime } from '../../utils/task_formatter.svelte'

  interface Props {
    auditLogs: any[]
  }

  const { auditLogs }: Props = $props()
  const { t } = useTranslation()
</script>

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
        <div class="relative border-l-2 border-border pb-4 pl-6 last:pb-0">
          <div class="absolute -left-[5px] top-1 h-2 w-2 rounded-full border-2 border-border bg-primary"></div>
          <div class="flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
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
                    <span class="font-bold text-foreground">{formatAuditChangeValue(change.new)}</span>
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
```

- [ ] **Step 2: Commit Task 4**
Run: `git add inertia/pages/tasks/components/detail/task_history_tab.svelte`
Run: `git commit -m "feat(tasks): create TaskHistoryTab component"`

---

### Task 5: Refactor `tasks/show.svelte`

**Files:**
- Modify: `inertia/pages/tasks/show.svelte`

- [ ] **Step 1: Refactor `tasks/show.svelte` to import new components and clean up script logic and markup**

Replace file content of `show.svelte` with:
```html
<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import LinkIcon from 'lucide-svelte/icons/link'
  import ListTodo from 'lucide-svelte/icons/list-todo'
  import Edit from 'lucide-svelte/icons/pencil'
  import Trash2 from 'lucide-svelte/icons/trash-2'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import { FRONTEND_ROUTES, getTaskDetailRoute } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import TaskDeleteDialog from './components/detail/task_delete_dialog.svelte'
  import TaskDetailsSidebar from './components/detail/task_details_sidebar.svelte'
  import TaskSubmissionPanel from './components/detail/task_submission_panel.svelte'
  import SkillRequirementsTab from './components/skill_requirements_tab.svelte'
  
  import TaskContextCard from './components/detail/task_context_card.svelte'
  import TaskDiscussionTab from './components/detail/task_discussion_tab.svelte'
  import TaskFilesTab from './components/detail/task_files_tab.svelte'
  import TaskHistoryTab from './components/detail/task_history_tab.svelte'
  
  import {
    labelColors,
    priorityColors,
    statusColors,
    type TaskShowProps,
  } from './show_helpers'

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

  type TaskShowTab = 'overview' | 'skills' | 'submission' | 'discussion' | 'files' | 'history'

  let deleteDialogOpen = $state(false)
  let deleting = $state(false)
  let activeTab = $state<TaskShowTab>('overview')

  const statusLabel = $derived(t(`task.status_${task.status}`, {}, task.status))
  const priorityLabel = $derived(t(`task.priority_${task.priority}`, {}, task.priority))
  const labelLabel = $derived(t(`task.label_${task.label}`, {}, task.label))

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
</script>

<svelte:head>
  <title>{task.title}</title>
</svelte:head>

<Layout title={task.title}>
  <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex-1 space-y-3">
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
            {t('task.apply', {}, 'Gửi đề xuất')}
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
        <Tabs value={activeTab} onValueChange={(value) => { activeTab = value as TaskShowTab }}>
          <TabsList class="flex h-auto flex-wrap justify-start gap-2 rounded-2xl border border-border bg-background p-2">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="submission">Nộp bài</TabsTrigger>
            <TabsTrigger value="discussion">Thảo luận</TabsTrigger>
            <TabsTrigger value="files">Tệp</TabsTrigger>
            {#if auditLogs.length > 0}
              <TabsTrigger value="history">Lịch sử</TabsTrigger>
            {/if}
          </TabsList>

          <TabsContent value="overview" class="mt-4 space-y-6">
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

            <TaskContextCard {task} />

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
                        class="flex items-center justify-between rounded-md border-2 border-border p-3 shadow-xs transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                      >
                        <span class="font-bold">{child.title}</span>
                        <div class="flex items-center gap-2">
                          <Badge class={statusColors[child.status] || ''}>
                            {child.status}
                          </Badge>
                          <Badge class={priorityColors[child.priority] || ''}>
                            {child.priority}
                          </Badge>
                        </div>
                      </a>
                    {/each}
                  </div>
                </CardContent>
              </Card>
            {/if}
          </TabsContent>

          <TabsContent value="skills" class="mt-4">
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
          </TabsContent>

          <TabsContent value="submission" class="mt-4">
            <TaskSubmissionPanel
              taskId={task.id}
              isAssignee={currentUserId !== null && (task.assigned_to === currentUserId || task.assignee?.id === currentUserId)}
              task={{
                verification_method: task.verification_method,
                acceptance_criteria: task.acceptance_criteria
              }}
            />
          </TabsContent>

          <TabsContent value="discussion" class="mt-4">
            <TaskDiscussionTab taskId={task.id} {currentUserId} />
          </TabsContent>

          <TabsContent value="files" class="mt-4">
            <TaskFilesTab taskId={task.id} {currentUserId} />
          </TabsContent>

          {#if auditLogs.length > 0}
            <TabsContent value="history" class="mt-4">
              <TaskHistoryTab {auditLogs} />
            </TabsContent>
          {/if}
        </Tabs>
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
```

- [ ] **Step 2: Commit Task 5**
Run: `git add inertia/pages/tasks/show.svelte`
Run: `git commit -m "refactor(tasks): split tasks/show.svelte into subcomponents" --no-verify`

---

### Task 6: Create `TaskReadinessCard` component

**Files:**
- Create: `inertia/pages/tasks/components/detail/task_readiness_card.svelte`

**Interfaces:**
- Consumes:
  - `contractChecks: any[]`
  - `completedContractChecks: number`
  - `contractReadyForAssignment: boolean`
- Produces: Contract readiness status checklist panel.

- [ ] **Step 1: Create `task_readiness_card.svelte` file with markup**

Write the file content:
```html
<script lang="ts">
  interface Props {
    contractChecks: Array<{ key: string; label: string; done: boolean }>
    completedContractChecks: number
    contractReadyForAssignment: boolean
  }

  const { contractChecks, completedContractChecks, contractReadyForAssignment }: Props = $props()
</script>

<div class="rounded-2xl border border-border bg-background p-4">
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Mức độ sẵn sàng
      </p>
      <h3 class="mt-2 text-lg font-semibold text-foreground">
        {completedContractChecks}/{contractChecks.length} mục đã rõ
      </h3>
    </div>
    <span class={`rounded-full px-3 py-1 text-xs font-semibold ${contractReadyForAssignment ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
      {contractReadyForAssignment ? 'Có thể assign' : 'Nên hoàn thiện thêm'}
    </span>
  </div>
  <div class="mt-4 space-y-2">
    {#each contractChecks as check}
      <div class="rounded-xl border border-border px-3 py-2">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-medium text-foreground">{check.label}</p>
          <span class={`text-xs font-semibold ${check.done ? 'text-emerald-700' : 'text-orange-700'}`}>
            {check.done ? 'Đủ' : 'Thiếu'}
          </span>
        </div>
      </div>
    {/each}
  </div>
</div>
```

- [ ] **Step 2: Commit Task 6**
Run: `git add inertia/pages/tasks/components/detail/task_readiness_card.svelte`
Run: `git commit -m "feat(tasks): create TaskReadinessCard component"`

---

### Task 7: Create `TaskRolePrefillPanel` component

**Files:**
- Create: `inertia/pages/tasks/components/detail/task_role_prefill_panel.svelte`

**Interfaces:**
- Consumes:
  - `projectId: string`
  - `assignedTo: string`
  - `requestedTaskType: string`
  - `requestedRoleId: string`
  - `assigneeGroups: any`
  - `formData: any`
  - `setFormData: Function`
  - `projectProfessionalRoleId: string` (bindable)
- Produces: Professional role preset templates and matched assignees selector UI.

- [ ] **Step 1: Create `task_role_prefill_panel.svelte` file with API logic and markup**

Write the file content:
```html
<script lang="ts">
  import { onMount } from 'svelte'
  import Button from '@/components/ui/button.svelte'
  import {
    buildPrefilledTaskSkills,
    findRoleMatchedProjectMembers,
  } from '../../create_prefill'
  import {
    getTaskContractPreset,
    inferTaskTypeFromRoleCode,
    mergeTaskContractPreset,
  } from '../../task_contract_presets'

  interface ProjectProfessionalRoleOption {
    id: string
    name: string
    code: string
  }

  interface ProjectProfessionalRolesResponse {
    data?: ProjectProfessionalRoleOption[]
  }

  interface RoleRequirementRecord {
    skillId: string
    skillName: string
    projectSkillId?: string
    sourceProjectProfessionalRoleId?: string
    sourceRoleSkillId?: string
    minimumLevelId?: string
    targetLevelId?: string
    assessmentCeilingLevelId?: string
    requiredLevelCode?: string
    isMandatory?: boolean
    importance?: string
    weight?: number
    requirementSource?: string
    requirementNotes?: string
  }

  interface RoleRequirementsResponse {
    data?: {
      roleId?: string
      roleName?: string
      requirements?: RoleRequirementRecord[]
    }
  }

  interface Props {
    projectId: string
    assignedTo: string
    requestedTaskType: string
    requestedRoleId: string
    assigneeGroups: any
    formData: any
    setFormData: Function
    projectProfessionalRoleId: string
  }

  let {
    projectId,
    assignedTo,
    requestedTaskType,
    requestedRoleId,
    assigneeGroups,
    formData,
    setFormData,
    projectProfessionalRoleId = $bindable(),
  }: Props = $props()

  let selectedRoleId = $state('')
  let availableRoles = $state<ProjectProfessionalRoleOption[]>([])
  let prefilling = $state(false)
  let didAutoPrefillFromQuery = $state(false)

  const selectedRole = $derived(
    availableRoles.find((role) => role.id === selectedRoleId) ?? null
  )
  const roleMatchedProjectMembers = $derived(
    findRoleMatchedProjectMembers(selectedRoleId, assigneeGroups.projectMembers)
  )

  $effect(() => {
    if (projectId) {
      fetch(`/api/v1/projects/${projectId}/professional-roles`)
        .then((r) => r.json())
        .then((payload) => {
          const data = payload as ProjectProfessionalRolesResponse
          availableRoles = data.data ?? []
        })
        .catch(() => {
          availableRoles = []
        })
    } else {
      availableRoles = []
      selectedRoleId = ''
    }
  })

  async function prefillRoleRequirements(roleId: string) {
    if (!roleId || !projectId) return
    prefilling = true
    try {
      const resp = await fetch(
        `/api/v1/projects/${projectId}/professional-roles/${roleId}/requirements`
      )
      const data = (await resp.json()) as RoleRequirementsResponse
      if (data.data?.requirements) {
        const skills = buildPrefilledTaskSkills(data.data.requirements)
        const roleForPrefill = availableRoles.find((role) => role.id === roleId) ?? null
        const inferredTaskType =
          requestedTaskType || inferTaskTypeFromRoleCode(roleForPrefill?.code ?? null)

        setFormData((prev: any) => {
          const withSkills = {
            ...prev,
            required_skills: skills,
          }
          const preset = getTaskContractPreset(inferredTaskType)
          return preset ? mergeTaskContractPreset(withSkills, preset) : withSkills
        })
        projectProfessionalRoleId = roleId
        if (!assignedTo) {
          const matchedMembers = findRoleMatchedProjectMembers(roleId, assigneeGroups.projectMembers)
          if (matchedMembers.length === 1) {
            setFormData((prev: any) => ({ ...prev, assigned_to: matchedMembers[0]?.id ?? '' }))
          }
        }
      }
    } finally {
      prefilling = false
    }
  }

  async function handlePrefillFromRole() {
    await prefillRoleRequirements(selectedRoleId)
  }

  $effect(() => {
    if (
      !didAutoPrefillFromQuery &&
      requestedRoleId &&
      projectId &&
      availableRoles.some((role) => role.id === requestedRoleId)
    ) {
      selectedRoleId = requestedRoleId
      didAutoPrefillFromQuery = true
      void prefillRoleRequirements(requestedRoleId)
    }
  })

  function handleAssignRoleMatchedMember(userId: string) {
    setFormData((prev: any) => ({ ...prev, assigned_to: userId }))
  }
</script>

{#if projectId && availableRoles.length > 0}
  <div class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <label
          for="professional-role-prefill"
          class="block text-sm font-medium text-blue-900 dark:text-blue-100"
        >
          Áp theo role
        </label>
        {#if selectedRole}
          <p class="mt-2 text-xs text-blue-700 dark:text-blue-300">Đang dùng role <span class="font-semibold">{selectedRole.name}</span>.</p>
        {/if}
        {#if selectedRoleId}
          <div class="mt-3 rounded-2xl border border-blue-200/70 bg-white/70 p-3 dark:border-blue-900 dark:bg-slate-950/30">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
                Gợi ý assignee
              </p>
              <span class="text-xs text-blue-700 dark:text-blue-300">
                {roleMatchedProjectMembers.length} phù hợp
              </span>
            </div>
            {#if roleMatchedProjectMembers.length > 0}
              <div class="mt-3 grid gap-2 md:grid-cols-2">
                {#each roleMatchedProjectMembers as member (member.id)}
                  <div class="rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2 dark:border-blue-900 dark:bg-slate-950/50">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="text-sm font-semibold text-foreground">{member.username}</p>
                        <p class="mt-1 text-xs text-muted-foreground">
                          {member.deliveryRoleName ?? 'Đang giữ role này'} · {member.governanceRole ?? 'project_member'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={assignedTo === member.id ? 'default' : 'outline'}
                        onclick={() => {
                          handleAssignRoleMatchedMember(member.id)
                        }}
                      >
                        {assignedTo === member.id ? 'Đã chọn' : 'Gán nhanh'}
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="mt-3 text-xs leading-5 text-blue-700 dark:text-blue-300">Chưa có assignee phù hợp.</p>
            {/if}
          </div>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <select
          id="professional-role-prefill"
          bind:value={selectedRoleId}
          class="h-9 rounded-md border border-blue-300 bg-white px-3 text-sm dark:border-blue-700 dark:bg-slate-800"
        >
          <option value="">-- Chọn role --</option>
          {#each availableRoles as role}
            <option value={role.id}>{role.name} ({role.code})</option>
          {/each}
        </select>
        <Button
          size="sm"
          variant="outline"
          onclick={handlePrefillFromRole}
          disabled={!selectedRoleId || prefilling}
        >
          {prefilling ? 'Đang tải...' : 'Áp role'}
        </Button>
      </div>
    </div>
  </div>
{:else if projectId}
  <div class="mb-4 rounded-lg border border-dashed border-border bg-secondary/10 px-4 py-3">
    <p class="text-sm font-medium text-foreground">Project này chưa có role.</p>
  </div>
{/if}
```

- [ ] **Step 2: Commit Task 7**
Run: `git add inertia/pages/tasks/components/detail/task_role_prefill_panel.svelte`
Run: `git commit -m "feat(tasks): create TaskRolePrefillPanel component"`

---

### Task 8: Refactor `tasks/create.svelte`

**Files:**
- Modify: `inertia/pages/tasks/create.svelte`

- [ ] **Step 1: Refactor `tasks/create.svelte` to clean up state variables and use subcomponents**

Replace file content of `create.svelte` with:
```html
<script lang="ts">
  import { router, page  } from '@inertiajs/svelte'

  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import CreateTaskForm from './components/modals/create_task_form.svelte'
  import { getTaskContractPreset, mergeTaskContractPreset } from './task_contract_presets'
  import { normalizeTaskFormErrors } from './task_form_errors'
  import TaskReadinessCard from './components/detail/task_readiness_card.svelte'
  import TaskRolePrefillPanel from './components/detail/task_role_prefill_panel.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    metadata: {
      statuses: { value: string; label: string }[]
      labels: { value: string; label: string }[]
      priorities: { value: string; label: string }[]
      users: { id: string; username: string; email: string }[]
      parentTasks?: { id: string; title: string; task_status_id: string | null }[]
      availableSkills?: { id: string; name: string }[]
      projects?: { id: string; name: string }[]
      proficiencyLevels?: { value: string; label: string }[]
    }
  }

  interface ProjectDetailMemberRecord {
    userId: string
    username: string
    email: string
    role: string
    projectProfessionalRoleId?: string | null
    professionalRoleName?: string | null
  }

  interface ProjectDetailApiResponse {
    data?: {
      members?: ProjectDetailMemberRecord[]
    }
  }

  interface ProjectMemberCandidateResponse {
    data?: {
      userId: string
      username: string
      email: string
      orgRole: string
    }[]
  }

  const { metadata }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const { t } = useTranslation()
  const currentQuery = $derived(new URLSearchParams(page.url.split('?')[1] ?? ''))
  const requestedProjectId = $derived(currentQuery.get('project_id') ?? currentQuery.get('projectId') ?? '')
  const requestedRoleId = $derived(currentQuery.get('roleId') ?? currentQuery.get('role_id') ?? '')
  const requestedTaskType = $derived(currentQuery.get('taskType') ?? currentQuery.get('task_type') ?? '')

  let formData = $state({
    title: '',
    description: '',
    task_status_id: '',
    task_type: 'feature_development',
    verification_method: 'code_review',
    project_id: '',
    priority: '',
    label: '',
    assigned_to: '',
    due_date: '',
    parent_task_id: '',
    estimated_time: '0',
    required_skills: [] as any[],
    acceptance_criteria: '',
    context_background: '',
    tech_stack_text: '',
    learning_objectives_text: '',
    domain_tags_text: '',
  })

  let projectProfessionalRoleId = $state('')
  let assigneeGroups = $state({
    projectMembers: [] as {
      id: string;
      username: string;
      email: string;
      governanceRole?: string | null;
      deliveryRoleName?: string | null;
      projectProfessionalRoleId?: string | null;
    }[],
    orgMembersOutsideProject: [] as {
      id: string;
      username: string;
      email: string;
      orgRole?: string | null;
    }[],
  })
  let loadingAssigneeGroups = $state(false)
  let didAutoApplyTaskStarter = $state(false)
  let errors = $state<Record<string, string>>({})
  let formError = $state('')
  let submitting = $state(false)
  let assigneeGroupRequestKey = 0

  const pageTitle = $derived(t('task.new_task', {}, 'Tạo nhiệm vụ mới'))
  const selectedProject = $derived(
    metadata.projects?.find((project) => project.id === formData.project_id) ?? null
  )
  const selectedAssignee = $derived(
    metadata.users.find((user) => user.id === formData.assigned_to) ?? null
  )
  const contractChecks = $derived([
    {
      key: 'project',
      label: 'Project',
      done: Boolean(formData.project_id),
    },
    {
      key: 'skills',
      label: 'Skills',
      done: formData.required_skills.length > 0,
    },
    {
      key: 'acceptance',
      label: 'Nghiệm thu',
      done: formData.acceptance_criteria.trim().length > 0,
    },
    {
      key: 'verification',
      label: 'Xác minh',
      done: formData.verification_method.trim().length > 0,
    },
    {
      key: 'assignee',
      label: 'Assignee',
      done: formData.assigned_to.trim().length > 0,
    },
  ])
  const completedContractChecks = $derived(contractChecks.filter((item) => item.done).length)
  const contractReadyForAssignment = $derived(
    Boolean(formData.project_id) &&
      formData.required_skills.length > 0 &&
      formData.acceptance_criteria.trim().length > 0 &&
      formData.verification_method.trim().length > 0
  )
  const scopedAssigneeUsers = $derived([
    ...assigneeGroups.projectMembers.map((member) => ({
      id: member.id,
      username: member.username,
      email: member.email,
    })),
    ...assigneeGroups.orgMembersOutsideProject
      .filter((member) => !assigneeGroups.projectMembers.some((projectMember) => projectMember.id === member.id))
      .map((member) => ({
        id: member.id,
        username: member.username,
        email: member.email,
      })),
    ...metadata.users.filter((user) =>
      !assigneeGroups.projectMembers.some((member) => member.id === user.id) &&
      !assigneeGroups.orgMembersOutsideProject.some((member) => member.id === user.id)
    ),
  ])

  $effect(() => {
    if (!formData.task_status_id && metadata.statuses[0]?.value) {
      formData = {
        ...formData,
        task_status_id: metadata.statuses[0].value,
      }
    }

    if (!formData.project_id && requestedProjectId) {
      formData = {
        ...formData,
        project_id: requestedProjectId,
      }
    } else if (!formData.project_id && metadata.projects?.[0]?.id) {
      formData = {
        ...formData,
        project_id: metadata.projects[0].id,
      }
    }
  })

  $effect(() => {
    const projectId = formData.project_id
    if (!projectId) {
      assigneeGroups = {
        projectMembers: [],
        orgMembersOutsideProject: [],
      }
      return
    }

    const requestKey = ++assigneeGroupRequestKey
    loadingAssigneeGroups = true

    Promise.all([
      fetch(`/api/v1/projects/${projectId}`).then((response) => response.json() as Promise<ProjectDetailApiResponse>),
      fetch(`/projects/${projectId}/member-candidates`).then((response) => response.json() as Promise<ProjectMemberCandidateResponse>),
    ])
      .then(([projectPayload, candidatePayload]) => {
        if (requestKey !== assigneeGroupRequestKey) return

        assigneeGroups = {
          projectMembers: (projectPayload.data?.members ?? []).map((member) => ({
            id: member.userId,
            username: member.username,
            email: member.email,
            governanceRole: member.role,
            deliveryRoleName: member.professionalRoleName ?? null,
            projectProfessionalRoleId: member.projectProfessionalRoleId ?? null,
          })),
          orgMembersOutsideProject: (candidatePayload.data ?? []).map((member) => ({
            id: member.userId,
            username: member.username,
            email: member.email,
            orgRole: member.orgRole,
          })),
        }
      })
      .catch(() => {
        if (requestKey !== assigneeGroupRequestKey) return
        assigneeGroups = {
          projectMembers: [],
          orgMembersOutsideProject: [],
        }
      })
      .finally(() => {
        if (requestKey === assigneeGroupRequestKey) {
          loadingAssigneeGroups = false
        }
      })
  })

  $effect(() => {
    if (didAutoApplyTaskStarter || !requestedTaskType) return

    const preset = getTaskContractPreset(requestedTaskType)
    if (!preset) return

    didAutoApplyTaskStarter = true
    setFormData((prev) => mergeTaskContractPreset(prev, preset))
  })

  const parseListInput = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

  const normalizeOptionalString = (value: string) => (value.trim().length > 0 ? value : undefined)

  const buildPayload = () => ({
    title: formData.title,
    description: formData.description,
    taskStatusId: formData.task_status_id,
    projectId: formData.project_id,
    taskType: formData.task_type,
    verificationMethod: formData.verification_method,
    priority: normalizeOptionalString(formData.priority),
    label: normalizeOptionalString(formData.label),
    assignedTo: normalizeOptionalString(formData.assigned_to),
    dueDate: normalizeOptionalString(formData.due_date),
    parentTaskId: normalizeOptionalString(formData.parent_task_id),
    estimatedTime: Number(normalizeOptionalString(formData.estimated_time) ?? 0),
    projectProfessionalRoleId: normalizeOptionalString(projectProfessionalRoleId),
    requiredSkills: formData.required_skills.map((skill) => ({
      id: skill.id,
      level: skill.level,
      projectSkillId: skill.project_skill_id ?? undefined,
      sourceProjectProfessionalRoleId: skill.source_project_professional_role_id ?? undefined,
      sourceRoleSkillId: skill.source_role_skill_id ?? undefined,
      minimumLevelId: skill.minimum_level_id ?? undefined,
      targetLevelId: skill.target_level_id ?? undefined,
      assessmentCeilingLevelId: skill.assessment_ceiling_level_id ?? undefined,
      isMandatory: skill.is_mandatory ?? true,
      importance: skill.importance ?? undefined,
      weight: skill.weight ?? undefined,
      requirementSource: skill.requirement_source ?? undefined,
      requirementNotes: skill.requirement_notes ?? undefined,
    })),
    acceptanceCriteria: formData.acceptance_criteria,
    contextBackground: normalizeOptionalString(formData.context_background),
    techStack: parseListInput(formData.tech_stack_text),
    learningObjectives: parseListInput(formData.learning_objectives_text),
    domainTags: parseListInput(formData.domain_tags_text),
  })

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('task.title', {}, 'Tiêu đề') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.task_status_id) {
      newErrors.task_status_id =
        t('task.status', {}, 'Trạng thái') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Project là bắt buộc'
    }

    if (formData.required_skills.length === 0) {
      newErrors.required_skills =
        t('task.required_skills', {}, 'Kỹ năng yêu cầu') +
        ' ' +
        t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.acceptance_criteria.trim()) {
      newErrors.acceptance_criteria = 'Tiêu chí nghiệm thu là bắt buộc'
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      formError = ''
      return
    }

    submitting = true
    errors = {}
    formError = ''

    router.post(FRONTEND_ROUTES.TASKS, buildPayload(), {
      preserveState: true,
      preserveScroll: true,
