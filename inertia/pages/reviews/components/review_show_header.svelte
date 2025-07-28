<script lang="ts">
  import { ClipboardCheck, User, Calendar, CircleCheck } from 'lucide-svelte'

  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Separator from '@/components/ui/separator.svelte'

  import type { ShowReviewProps } from '../types.svelte'

  import ReviewStatusBadge from './review_status_badge.svelte'

  interface Props {
    flash?: { success?: string; error?: string }
    taskTitle: string
    reviewee?: ShowReviewProps['session']['reviewee']
    createdDate: string
    completedDate: string | null
    session: ShowReviewProps['session']
  }

  const { flash, taskTitle, reviewee, createdDate, completedDate, session }: Props = $props()
</script>

{#if flash?.success}
  <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
    {flash.success}
  </div>
{/if}
{#if flash?.error}
  <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
    {flash.error}
  </div>
{/if}

<Card>
  <CardHeader>
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <CardTitle class="text-lg">{taskTitle}</CardTitle>
        <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {#if reviewee}
            <div class="flex items-center gap-1.5">
              <User class="h-3.5 w-3.5" />
              <span>Người được đánh giá: <strong class="text-foreground">{reviewee.username}</strong></span>
            </div>
          {/if}
          <div class="flex items-center gap-1.5">
            <Calendar class="h-3.5 w-3.5" />
            <span>{createdDate}</span>
          </div>
        </div>
      </div>
      <ReviewStatusBadge status={session.status} />
    </div>
  </CardHeader>
  <CardContent>
    <div class="flex flex-wrap gap-4 text-sm">
      <div class="flex items-center gap-1.5">
        <ClipboardCheck class="h-4 w-4 text-muted-foreground" />
        <span>Manager: {session.manager_review_completed ? '✓ Đã đánh giá' : '✗ Chưa đánh giá'}</span>
      </div>
      <Separator orientation="vertical" class="h-4" />
      <div class="flex items-center gap-1.5">
        <CircleCheck class="h-4 w-4 text-muted-foreground" />
        <span>Peer: {session.peer_reviews_count}/{session.required_peer_reviews} hoàn thành</span>
      </div>
      {#if completedDate}
        <Separator orientation="vertical" class="h-4" />
        <span class="text-muted-foreground">Hoàn thành: {completedDate}</span>
      {/if}
    </div>
  </CardContent>
</Card>
