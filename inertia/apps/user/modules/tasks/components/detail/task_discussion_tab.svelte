<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'
  import MessageSquare from 'lucide-svelte/icons/message-square'
  import Edit from 'lucide-svelte/icons/pencil'
  import Trash2 from 'lucide-svelte/icons/trash-2'
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import { buildOffsetPagination } from '@/apps/user/shared/lib/pagination'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { formatDateTime } from '@/apps/user/modules/tasks/utils/task_formatter.svelte'

  interface Props {
    taskId: string
    currentUserId: string | null
    apiBase?: string
    initialComments?: TaskComment[] | null
    readOnly?: boolean
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
    pagination?: OffsetPagePagination
  }

  const {
    taskId,
    currentUserId,
    apiBase = '/api/v1/tasks',
    initialComments = null,
    readOnly = false,
  }: Props = $props()
  const { t } = useTranslation()
  const commentsEndpoint = $derived(`${apiBase}/${taskId}/comments`)
  const TASK_COMMENT_PER_PAGE = 10

  let comments = $state<TaskComment[]>([])
  let commentPagination = $state<OffsetPagePagination>({
    mode: 'offset',
    page: 1,
    perPage: TASK_COMMENT_PER_PAGE,
    total: 0,
    lastPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  let loadingComments = $state(false)
  let savingComment = $state(false)
  let deletingCommentId = $state<string | null>(null)
  let editingCommentId = $state<string | null>(null)
  let updatingComment = $state(false)
  let detailError = $state('')
  let commentBody = $state('')
  let replyingToComment = $state<TaskComment | null>(null)
  let editCommentBody = $state('')
  const commentMap = $derived.by(() => new Map(comments.map((comment) => [comment.id, comment])))
  const rootComments = $derived.by(() => comments.filter((comment) => !comment.parentCommentId))
  const repliesByParentId = $derived.by(() => {
    const grouped = new Map<string, TaskComment[]>()

    for (const comment of comments) {
      if (!comment.parentCommentId) continue
      const bucket = grouped.get(comment.parentCommentId) ?? []
      bucket.push(comment)
      grouped.set(comment.parentCommentId, bucket)
    }

    return grouped
  })

  async function loadComments(page = commentPagination.page) {
    if (initialComments !== null) return
    loadingComments = true
    try {
      const response = await axios.get<TaskCollectionResponse<TaskComment>>(commentsEndpoint, {
        params: {
          page,
          perPage: TASK_COMMENT_PER_PAGE,
        },
      })
      comments = Array.isArray(response.data.data) ? response.data.data : []
      commentPagination = response.data.pagination
        ? buildOffsetPagination(response.data.pagination)
        : buildOffsetPagination({
            page,
            perPage: TASK_COMMENT_PER_PAGE,
            total: comments.length,
            hasPreviousPage: page > 1,
          })
    } catch (error) {
      console.error('Error loading task comments:', error)
      detailError = t('task.discussion_tab.load_error', {}, 'Unable to load task discussion.')
    } finally {
      loadingComments = false
    }
  }

  async function submitComment() {
    if (!commentBody.trim() || savingComment) return

    savingComment = true
    detailError = ''

    try {
      await axios.post(commentsEndpoint, {
        parentCommentId: replyingToComment?.id ?? null,
        body: commentBody.trim(),
        commentType: 'normal',
        visibility: 'internal',
        reviewRelevance: false,
      })
      commentBody = ''
      replyingToComment = null
      await loadComments(commentPagination.page)
    } catch (error) {
      console.error('Error creating task comment:', error)
      detailError = t('task.discussion_tab.create_error', {}, 'Unable to send comment.')
    } finally {
      savingComment = false
    }
  }

  async function removeComment(commentId: string) {
    deletingCommentId = commentId
    detailError = ''

    try {
      await axios.delete(`${commentsEndpoint}/${commentId}`)
      await loadComments(commentPagination.page)
    } catch (error) {
      console.error('Error deleting task comment:', error)
      detailError = t('task.discussion_tab.delete_error', {}, 'Unable to delete comment.')
    } finally {
      deletingCommentId = null
    }
  }

  function startEditingComment(comment: TaskComment) {
    editingCommentId = comment.id
    editCommentBody = comment.body
    detailError = ''
  }

  function cancelEditingComment() {
    editingCommentId = null
    editCommentBody = ''
  }

  function startReply(comment: TaskComment) {
    replyingToComment = comment
    detailError = ''
  }

  function cancelReply() {
    replyingToComment = null
  }

  async function saveCommentEdit(commentId: string) {
    if (!editCommentBody.trim() || updatingComment) return

    updatingComment = true
    detailError = ''

    try {
      await axios.patch(`${commentsEndpoint}/${commentId}`, {
        body: editCommentBody.trim(),
      })
      cancelEditingComment()
      await loadComments(commentPagination.page)
    } catch (error) {
      console.error('Error updating task comment:', error)
      detailError = t('task.discussion_tab.update_error', {}, 'Unable to update comment.')
    } finally {
      updatingComment = false
    }
  }

  onMount(async () => {
    if (initialComments !== null) {
      comments = initialComments
      commentPagination = buildOffsetPagination({
        page: 1,
        perPage: TASK_COMMENT_PER_PAGE,
        total: initialComments.length,
      })
      return
    }
    await loadComments()
  })

  function parentCommentPreview(comment: TaskComment): string | null {
    if (!comment.parentCommentId) return null
    return commentMap.get(comment.parentCommentId)?.body ?? null
  }

  async function changeCommentPage(page: number) {
    if (page === commentPagination.page || loadingComments) {
      return
    }

    await loadComments(page)
  }
</script>

<Card>
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      <MessageSquare class="size-4" />
      {t('task.discussion_tab.title', {}, 'Task discussion')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if detailError}
      <div class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {detailError}
      </div>
    {/if}

    {#if loadingComments}
      <p class="text-sm text-muted-foreground">{t('task.discussion_tab.loading', {}, 'Loading discussion...')}</p>
    {:else if comments.length === 0}
      <p class="text-sm text-muted-foreground">{t('task.discussion_tab.empty', {}, 'No comments yet.')}</p>
    {:else}
      <div class="space-y-3">
        {#each rootComments as comment (comment.id)}
          <div class="rounded-md border p-4" data-testid={`task-comment-${comment.id}`}>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="font-bold">{comment.authorUsername ?? comment.authorId}</span>
                <Badge variant="outline" class="text-[10px] uppercase">{t(`task.discussion_tab.comment_type.${comment.commentType}`, {}, comment.commentType)}</Badge>
                <Badge variant="outline" class="text-[10px] uppercase">{t(`task.discussion_tab.visibility.${comment.visibility}`, {}, comment.visibility)}</Badge>
                {#if comment.parentCommentId}
                  <Badge variant="secondary" class="text-[10px] uppercase">{t('task.discussion_tab.reply_badge', {}, 'Reply')}</Badge>
                {/if}
                <span class="text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
                {#if comment.editedAt}
                  <span class="text-muted-foreground text-xs">({t('task.discussion_tab.edited', {}, 'edited')})</span>
                {/if}
              </div>
              <div class="flex items-center gap-1">
                {#if !readOnly}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updatingComment || deletingCommentId === comment.id}
                    onclick={() => { startReply(comment) }}
                  >
                    {t('task.discussion_tab.reply', {}, 'Reply')}
                  </Button>
                {/if}
                {#if currentUserId && comment.authorId === currentUserId}
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
                {/if}
              </div>
            </div>
            {#if editingCommentId === comment.id}
              <div class="mt-3 space-y-3">
                <Textarea bind:value={editCommentBody} rows={4} />
                <div class="flex justify-end gap-2">
                  <Button variant="outline" onclick={cancelEditingComment} disabled={updatingComment}>
                    {t('task.discussion_tab.cancel', {}, 'Cancel')}
                  </Button>
                  <Button
                    onclick={() => { void saveCommentEdit(comment.id) }}
                    disabled={updatingComment || editCommentBody.trim().length === 0}
                  >
                    {updatingComment ? t('task.discussion_tab.saving', {}, 'Saving...') : t('task.discussion_tab.save', {}, 'Save')}
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

            {#if repliesByParentId.get(comment.id)?.length}
              <div class="mt-4 space-y-3 border-l-2 border-border/70 pl-4">
                {#each repliesByParentId.get(comment.id) ?? [] as reply (reply.id)}
                  <div class="rounded-md border border-border/80 bg-muted/10 p-4" data-testid={`task-comment-${reply.id}`}>
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex flex-wrap items-center gap-2 text-sm">
                        <span class="font-bold">{reply.authorUsername ?? reply.authorId}</span>
                        <Badge variant="outline" class="text-[10px] uppercase">{t(`task.discussion_tab.comment_type.${reply.commentType}`, {}, reply.commentType)}</Badge>
                        <Badge variant="outline" class="text-[10px] uppercase">{t(`task.discussion_tab.visibility.${reply.visibility}`, {}, reply.visibility)}</Badge>
                        <Badge variant="secondary" class="text-[10px] uppercase">{t('task.discussion_tab.reply_badge', {}, 'Reply')}</Badge>
                        <span class="text-muted-foreground">{formatDateTime(reply.createdAt)}</span>
                        {#if reply.editedAt}
                          <span class="text-muted-foreground text-xs">({t('task.discussion_tab.edited', {}, 'edited')})</span>
                        {/if}
                      </div>
                      <div class="flex items-center gap-1">
                        {#if !readOnly}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updatingComment || deletingCommentId === reply.id}
                            onclick={() => { startReply(reply) }}
                          >
                            {t('task.discussion_tab.reply', {}, 'Reply')}
                          </Button>
                        {/if}
                        {#if currentUserId && reply.authorId === currentUserId}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updatingComment || deletingCommentId === reply.id}
                            onclick={() => { startEditingComment(reply) }}
                          >
                            <Edit class="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingCommentId === reply.id || updatingComment}
                            onclick={() => { void removeComment(reply.id) }}
                          >
                            <Trash2 class="size-4" />
                          </Button>
                        {/if}
                      </div>
                    </div>
                    {#if editingCommentId === reply.id}
                      <div class="mt-3 space-y-3">
                        <Textarea bind:value={editCommentBody} rows={4} />
                        <div class="flex justify-end gap-2">
                          <Button variant="outline" onclick={cancelEditingComment} disabled={updatingComment}>
                            {t('task.discussion_tab.cancel', {}, 'Cancel')}
                          </Button>
                          <Button
                            onclick={() => { void saveCommentEdit(reply.id) }}
                            disabled={updatingComment || editCommentBody.trim().length === 0}
                          >
                            {updatingComment ? t('task.discussion_tab.saving', {}, 'Saving...') : t('task.discussion_tab.save', {}, 'Save')}
                          </Button>
                        </div>
                      </div>
                    {:else}
                      {#if parentCommentPreview(reply)}
                        <div class="mt-3 rounded-md border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                          {t('task.discussion_tab.replying_to_preview', { body: parentCommentPreview(reply) }, `Replying to: ${parentCommentPreview(reply)}`)}
                        </div>
                      {/if}
                      <p class="mt-3 whitespace-pre-wrap text-sm">{reply.body}</p>
                      {#if reply.mentions && reply.mentions.length > 0}
                        <div class="mt-3 flex flex-wrap gap-2">
                          {#each reply.mentions as mention}
                            <Badge variant="secondary" class="text-[10px]">@{mention.username}</Badge>
                          {/each}
                        </div>
                      {/if}
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <UnifiedOffsetPagination
        pagination={commentPagination}
        onPageChange={changeCommentPage}
      />
    {/if}

    <div class="space-y-3 pt-4">
      {#if replyingToComment}
        <div class="rounded-lg border border-border bg-secondary/40 px-3 py-3 text-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-foreground">
                {t('task.discussion_tab.replying_to', { name: replyingToComment.authorUsername ?? replyingToComment.authorId }, `Replying to ${replyingToComment.authorUsername ?? replyingToComment.authorId}`)}
              </p>
              <p class="mt-1 line-clamp-2 text-muted-foreground">{replyingToComment.body}</p>
            </div>
            <Button variant="outline" size="sm" onclick={cancelReply}>{t('task.discussion_tab.cancel_reply', {}, 'Cancel reply')}</Button>
          </div>
        </div>
      {/if}

      <Textarea
        bind:value={commentBody}
        rows={4}
        placeholder={t('task.discussion_tab.placeholder', {}, 'Progress notes, questions, technical decisions... Use @username to tag.')}
      />
      <div class="flex justify-end">
        <Button onclick={submitComment} disabled={savingComment || commentBody.trim().length === 0}>
          {savingComment ? t('task.discussion_tab.sending', {}, 'Sending...') : t('task.discussion_tab.send', {}, 'Send comment')}
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
