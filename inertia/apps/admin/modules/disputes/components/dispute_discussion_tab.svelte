<script lang="ts">
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Label from '@/apps/admin/shared/ui/label.svelte'
  import Textarea from '@/apps/admin/shared/ui/textarea.svelte'
  import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import { buildOffsetPagination, paginateOffsetItems } from '@/apps/admin/shared/lib/pagination'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

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
    onPostComment: () => void
  }

  let {
    comments,
    disputeStatus,
    commentBody = $bindable(),
    postingComment,
    onPostComment,
  }: Props = $props()

  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateFormatter = $derived(new Intl.DateTimeFormat(documentLocale, { dateStyle: 'medium', timeStyle: 'short' }))

  const roleMap: Record<string, string> = {
    system_admin: t('task.disputes.admin_detail.discussion_tab.roles.system_admin', {}, 'System admin'),
    reviewee: t('task.disputes.admin_detail.discussion_tab.roles.reviewee', {}, 'Reviewee'),
    reviewer: t('task.disputes.admin_detail.discussion_tab.roles.reviewer', {}, 'Reviewer'),
    org_owner: t('task.disputes.admin_detail.discussion_tab.roles.org_owner', {}, 'Org owner'),
    org_admin: t('task.disputes.admin_detail.discussion_tab.roles.org_admin', {}, 'Org admin'),
    project_manager: t('task.disputes.admin_detail.discussion_tab.roles.project_manager', {}, 'Project manager'),
  }
  const perPage = 10
  let currentPage = $state(1)
  const pagination = $derived(buildOffsetPagination({
    page: currentPage,
    perPage,
    total: comments.length,
  }))
  const paginatedComments = $derived(paginateOffsetItems(comments, pagination))

  function formatCommentDate(value: string): string {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? t('common.invalid_date', {}, 'Invalid date')
      : dateFormatter.format(date)
  }
</script>

<Card class="rounded-[28px] border-border/90">
  <CardHeader class="space-y-3">
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t('task.disputes.admin_detail.discussion_tab.eyebrow', {}, 'Joint discussion')}
      </p>
      <CardTitle class="mt-2 text-2xl">{t('task.disputes.admin_detail.discussion_tab.title', { count: comments.length }, 'Discussion (:count)')}</CardTitle>
      <p class="mt-2 text-sm text-muted-foreground">
        {t('task.disputes.admin_detail.discussion_tab.description', {}, 'Admin uses this channel to ask both sides for clarification before escalation.')}
      </p>
    </div>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if comments.length === 0}
      <p class="py-4 text-center text-sm text-muted-foreground">{t('task.disputes.admin_detail.discussion_tab.empty', {}, 'No discussion yet.')}</p>
    {:else}
      <div class="space-y-3 font-sans">
        {#each paginatedComments as comment (comment.id)}
          <div class="rounded-[22px] border border-border bg-card p-4 text-sm shadow-xs">
            <div class="mb-2 flex items-center justify-between gap-3 font-sans">
              <span class="font-bold text-foreground">
                {comment.author_id.substring(0, 8)}
                {#if comment.author_context}
                  <Badge variant="outline" class="ml-1 rounded-full text-[10px] font-mono">{roleMap[comment.author_context] ?? comment.author_context}</Badge>
                {/if}
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {formatCommentDate(comment.created_at)}
              </span>
            </div>
            <p class="mt-1 whitespace-pre-wrap leading-6 text-foreground">{comment.body}</p>
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
      <div class="mt-4 space-y-2 rounded-[24px] border border-border/80 bg-muted/40 p-4 font-sans">
        <Label for="admin-comment">{t('task.disputes.admin_detail.discussion_tab.comment_label', {}, 'Post comment')}</Label>
        <Textarea
          id="admin-comment"
          bind:value={commentBody}
          placeholder={t('task.disputes.admin_detail.discussion_tab.comment_placeholder', {}, 'Ask for clarification, counterpoints, or additional evidence...')}
          rows={4}
        />
        <Button size="sm" onclick={onPostComment} disabled={postingComment || !commentBody.trim()}>
          {postingComment
            ? t('task.disputes.admin_detail.discussion_tab.sending', {}, 'Sending...')
            : t('task.disputes.admin_detail.discussion_tab.send', {}, 'Post comment')}
        </Button>
      </div>
    {/if}
  </CardContent>
</Card>
