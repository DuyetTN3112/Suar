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

