<script lang="ts">
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import { buildOffsetPagination, paginateOffsetItems } from '@/apps/org/shared/lib/pagination'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Comment {
    id: string
    author_id: string
    body: string
    created_at: string
    author_context: string | null
  }

  interface Props {
    comments: Comment[]
    disputeStatus: string
    commentBody: string
    postingComment: boolean
    taskCommentCount: number
    onPostComment: () => void
  }

  let {
    comments,
    disputeStatus,
    commentBody = $bindable(),
    postingComment,
    taskCommentCount,
    onPostComment,
  }: Props = $props()

  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateFormatter = $derived(new Intl.DateTimeFormat(documentLocale, { dateStyle: 'medium', timeStyle: 'short' }))

  const roleMap: Record<string, string> = {
    system_admin: t('task.reviews.disputes.discussion.roles.system_admin', {}, 'System admin'),
    reviewee: t('task.reviews.disputes.discussion.roles.reviewee', {}, 'Worker'),
    reviewer: t('task.reviews.disputes.discussion.roles.reviewer', {}, 'Reviewer'),
    org_owner: t('task.reviews.disputes.discussion.roles.org_owner', {}, 'Organization owner'),
    org_admin: t('task.reviews.disputes.discussion.roles.org_admin', {}, 'Organization admin'),
    project_manager: t('task.reviews.disputes.discussion.roles.project_manager', {}, 'Project manager'),
  }
  const perPage = 10
  let currentPage = $state(1)
  const pagination = $derived(buildOffsetPagination({
    page: currentPage,
    perPage,
    total: comments.length,
  }))
  const paginatedComments = $derived(paginateOffsetItems(comments, pagination))
</script>

<Card>
  <CardHeader>
    <CardTitle class="text-xl font-black tracking-tight">{t('task.reviews.disputes.discussion.title', { total: comments.length }, `Dispute discussion (${comments.length})`)}</CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline">{taskCommentCount} {t('task.reviews.disputes.discussion.task_comments', {}, 'task comments')}</Badge>
      <Badge variant="outline">{t('task.reviews.disputes.discussion.two_sides_required', {}, '2 sides before report')}</Badge>
    </div>

    {#if comments.length === 0}
      <div class="rounded-2xl border border-dashed border-border bg-muted/10 py-8 text-center text-sm text-muted-foreground">
        {t('task.reviews.disputes.discussion.empty', {}, 'No exchanges yet between both sides.')}
      </div>
    {:else}
      <div class="space-y-3 font-sans">
        {#each paginatedComments as comment (comment.id)}
          <div class="rounded-2xl border border-border bg-card p-4 text-sm shadow-xs">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2 font-sans">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-foreground">
                  {roleMap[comment.author_context ?? ''] ?? t('task.reviews.disputes.discussion.participant', {}, 'Participant')}
                </span>
                {#if comment.author_context}
                  <Badge variant="outline" class="text-[10px] font-mono">{comment.author_context}</Badge>
                {/if}
              </div>
              <span class="text-xs text-muted-foreground font-mono">
                {dateFormatter.format(new Date(comment.created_at))}
              </span>
            </div>
            <p class="mt-2 whitespace-pre-wrap leading-6 text-foreground">{comment.body}</p>
          </div>
        {/each}
      </div>
      <UnifiedOffsetPagination
        {pagination}
        onPageChange={(page: number) => {
          currentPage = page
        }}
      />
    {/if}

    {#if disputeStatus !== 'resolved' && disputeStatus !== 'rejected'}
      <div class="mt-4 space-y-3 rounded-2xl border border-border bg-muted/10 p-4 font-sans">
        <Label for="comment-text">{t('task.reviews.disputes.discussion.write_comment', {}, 'Write a reply')}</Label>
        <Textarea
          id="comment-text"
          bind:value={commentBody}
          placeholder={t('task.reviews.disputes.discussion.comment_placeholder', {}, 'Enter reply...')}
          rows={4}
        />
        <Button class="w-full sm:w-auto" size="sm" onclick={onPostComment} disabled={postingComment || !commentBody.trim()}>
          {postingComment
            ? t('task.reviews.disputes.discussion.sending', {}, 'Sending...')
            : t('task.reviews.disputes.discussion.send', {}, 'Send reply')}
        </Button>
      </div>
    {/if}
  </CardContent>
</Card>
