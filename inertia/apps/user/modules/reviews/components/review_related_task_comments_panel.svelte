<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import { buildOffsetPagination } from '@/apps/user/shared/lib/pagination'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { ReviewRelatedTaskComment } from '../types.svelte'

  type DateLike = string | Date | { toISO?: () => string | null; toString?: () => string } | null | undefined

  interface TaskCollectionResponse<TItem = ReviewRelatedTaskComment> {
    data: TItem[]
    pagination?: OffsetPagePagination
  }

  interface Props {
    taskId: string | null
    title?: string
    description?: string
    initialComments?: ReviewRelatedTaskComment[]
    mode?: 'review_relevant' | 'all'
    perPage?: number
  }

  let {
    taskId,
    title = '',
    description = '',
    initialComments = [],
    perPage = 10,
  }: Props = $props()

  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  )

  let remoteComments = $state<ReviewRelatedTaskComment[]>([])
  let currentPage = $state(1)
  let remotePagination = $state<OffsetPagePagination>({
    mode: 'offset',
    page: 1,
    perPage: 10,
    total: 0,
    lastPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  let loading = $state(false)
  let errorMessage = $state('')
  const sourceComments = $derived(initialComments.length > 0 ? initialComments : remoteComments)
  const commentMap = $derived.by(() =>
    new Map(sourceComments.map((comment) => [comment.id, comment]))
  )
  const displayTitle = $derived(
    title || t('task.reviews.related_comments.title', {}, 'Related task discussion')
  )
  const displayDescription = $derived(
    description ||
      t(
        'task.reviews.related_comments.description',
        {},
        'This is operational task commentary attached as context. Review discussion and dispute exchange are separate flows.'
      )
  )

  const filteredComments = $derived.by(() =>
    sourceComments
      .slice()
      .sort(
        (left, right) =>
          getDateTime(right.createdAt) - getDateTime(left.createdAt)
    )
  )

  const localPagination = $derived.by(() => {
    const totalRoots = filteredComments.filter((comment) => !comment.parentCommentId).length

    return buildOffsetPagination({
      page: currentPage,
      perPage,
      total: totalRoots,
    })
  })

  const pagination = $derived(
    initialComments.length > 0 ? localPagination : remotePagination
  )

  const visibleComments = $derived.by(() => {
    if (initialComments.length === 0) {
      return filteredComments
    }

    const rootOnly = filteredComments.filter((comment) => !comment.parentCommentId)
    const start = (pagination.page - 1) * perPage
    const currentRoots = rootOnly.slice(start, start + perPage)
    const rootIds = new Set(currentRoots.map((comment) => comment.id))

    return filteredComments.filter(
      (comment) =>
        (!comment.parentCommentId && rootIds.has(comment.id)) ||
        (comment.parentCommentId !== null && rootIds.has(comment.parentCommentId))
    )
  })

  const rootComments = $derived.by(() => visibleComments.filter((comment) => !comment.parentCommentId))
  const repliesByParentId = $derived.by(() => {
    const grouped = new Map<string, ReviewRelatedTaskComment[]>()

    for (const comment of visibleComments) {
      if (!comment.parentCommentId) continue
      const bucket = grouped.get(comment.parentCommentId) ?? []
      bucket.push(comment)
      grouped.set(comment.parentCommentId, bucket)
    }

    return grouped
  })

  function normalizeDate(value: DateLike): Date | null {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

    const raw =
      typeof value === 'string'
        ? value
        : typeof value.toISO === 'function'
          ? value.toISO()
          : typeof value.toString === 'function'
            ? value.toString()
            : null
    if (!raw) return null

    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? null : date
  }

  function getDateTime(value: DateLike) {
    return normalizeDate(value)?.getTime() ?? 0
  }

  function formatDate(date: DateLike) {
    const normalized = normalizeDate(date)
    return normalized ? dateFormatter.format(normalized) : ''
  }

  function parentCommentPreview(comment: ReviewRelatedTaskComment): string | null {
    if (!comment.parentCommentId) return null
    return commentMap.get(comment.parentCommentId)?.body ?? null
  }

  async function loadComments(page = currentPage) {
    if (!taskId) {
      remoteComments = []
      return
    }

    loading = true
    errorMessage = ''

    try {
      const response = await axios.get<TaskCollectionResponse>(
        `/api/v1/tasks/${taskId}/comments`,
        {
          params: {
            page,
            perPage,
          },
        }
      )
      remoteComments = Array.isArray(response.data.data) ? response.data.data : []
      currentPage = page
      const fallbackTotal = remoteComments.filter((comment) => !comment.parentCommentId).length
      remotePagination = response.data.pagination
        ? buildOffsetPagination(response.data.pagination)
        : buildOffsetPagination({
            page,
            perPage,
            total: fallbackTotal,
            hasPreviousPage: page > 1,
          })
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      errorMessage = message ?? t('task.reviews.related_comments.load_error', {}, 'Unable to load related comments.')
    } finally {
      loading = false
    }
  }

  onMount(() => {
    if (initialComments.length === 0) {
      void loadComments()
    }
  })

  async function handlePageChange(page: number) {
    if (page === currentPage || loading) {
      return
    }

    if (initialComments.length === 0) {
      await loadComments(page)
      return
    }

    currentPage = page
  }
</script>

<section class="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div class="space-y-1">
      <h4 class="text-sm font-semibold text-foreground">{displayTitle}</h4>
      {#if displayDescription}
        <p class="text-sm text-muted-foreground">{displayDescription}</p>
      {/if}
    </div>

    {#if taskId}
      <div class="flex gap-2">
        <Button variant="outline" size="sm" onclick={() => { void loadComments() }} disabled={loading}>
          {loading
            ? t('task.reviews.related_comments.loading', {}, 'Loading...')
            : t('task.reviews.related_comments.reload', {}, 'Reload')}
        </Button>
        <a
          class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          href={`/tasks/${taskId}`}
        >
          {t('task.reviews.related_comments.open_task', {}, 'Open task')}
        </a>
      </div>
    {/if}
  </div>

  {#if errorMessage}
    <div class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {errorMessage}
    </div>
  {:else if loading}
    <div class="rounded-md border border-dashed border-amber-500/30 bg-background/80 px-3 py-4 text-sm text-muted-foreground">
      {t('task.reviews.related_comments.loading_comments', {}, 'Loading related comments...')}
    </div>
  {:else if !taskId}
    <div class="rounded-md border border-dashed border-amber-500/30 bg-background/80 px-3 py-4 text-sm text-muted-foreground">
      {t('task.reviews.related_comments.no_task', {}, 'No task selected for this review session.')}
    </div>
  {:else if visibleComments.length === 0}
    <div class="rounded-md border border-dashed border-amber-500/30 bg-background/80 px-3 py-4 text-sm text-muted-foreground">
      {t('task.reviews.related_comments.no_comments', {}, 'No comments yet on this task.')}
    </div>
  {:else}
    <div class="space-y-3">
      {#each rootComments as comment (comment.id)}
        <article class="rounded-lg border border-amber-500/20 bg-background p-4" data-testid={`review-task-comment-${comment.id}`}>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="font-semibold">{comment.authorUsername ?? comment.authorId}</span>
              <Badge variant="outline" class="text-[10px] uppercase">{comment.commentType}</Badge>
              <Badge variant="outline" class="text-[10px] uppercase">{comment.visibility}</Badge>
              <span class="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
              {#if comment.editedAt}
                <span class="text-xs text-muted-foreground">{t('task.reviews.related_comments.edited', {}, 'edited')}</span>
              {/if}
            </div>
          </div>

          <p class="mt-3 whitespace-pre-wrap text-sm">{comment.body}</p>

          {#if comment.mentions && comment.mentions.length > 0}
            <div class="mt-3 flex flex-wrap gap-2">
              {#each comment.mentions as mention}
                <Badge variant="secondary" class="text-[10px]">@{mention.username}</Badge>
              {/each}
            </div>
          {/if}

          {#if repliesByParentId.get(comment.id)?.length}
            <div class="mt-4 space-y-3 border-l-2 border-amber-500/20 pl-4">
              {#each repliesByParentId.get(comment.id) ?? [] as reply (reply.id)}
                <article class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4" data-testid={`review-task-comment-${reply.id}`}>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex flex-wrap items-center gap-2 text-sm">
                      <span class="font-semibold">{reply.authorUsername ?? reply.authorId}</span>
                      <Badge variant="outline" class="text-[10px] uppercase">{reply.commentType}</Badge>
                      <Badge variant="outline" class="text-[10px] uppercase">{reply.visibility}</Badge>
                      <Badge variant="secondary" class="text-[10px] uppercase">
                        {t('task.reviews.related_comments.reply_badge', {}, 'reply')}
                      </Badge>
                      <span class="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
                      {#if reply.editedAt}
                        <span class="text-xs text-muted-foreground">{t('task.reviews.related_comments.edited', {}, 'edited')}</span>
                      {/if}
                    </div>
                  </div>

                  {#if parentCommentPreview(reply)}
                    <div class="mt-3 rounded-md border border-amber-500/20 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                      {t('task.reviews.related_comments.replying_to', {}, 'Replying to')}: {parentCommentPreview(reply)}
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
                </article>
              {/each}
            </div>
          {/if}
        </article>
      {/each}
    </div>

    <UnifiedOffsetPagination
      pagination={pagination}
      onPageChange={handlePageChange}
    />
  {/if}
</section>
