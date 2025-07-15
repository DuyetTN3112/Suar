<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

  interface Props {
    review: {
      id: string
      flag_type: string
      severity: string
      status: string
      notes: string | null
      detected_at: string | null
      reviewed_at: string | null
      reviewer: { id: string; username: string; email: string | null } | null
      reviewee: { id: string; username: string; email: string | null } | null
      moderator: { id: string; username: string; email: string | null } | null
      task: { id: string; title: string | null } | null
      skill: { id: string; name: string | null } | null
      comment: string | null
    }
    evidences: {
      id: string
      title: string | null
      url: string | null
      evidence_type: string
      description: string | null
      created_at: string | null
    }[]
  }

  const { review, evidences }: Props = $props()

  function resolve(action: 'confirm' | 'dismiss') {
    router.put(
      `/admin/reviews/${review.id}/resolve`,
      { action },
      { preserveState: true, preserveScroll: true }
    )
  }
</script>

  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="neo-kicker">Admin / Review Detail</p>
        <h1 class="text-4xl font-bold tracking-tight">Chi tiết flagged review</h1>
        <p class="mt-2 text-sm text-muted-foreground">Trang detail để xem đủ ngữ cảnh trước khi resolve tranh chấp.</p>
      </div>
      <Link href="/admin/reviews">
        <Button variant="outline">Quay lại</Button>
      </Link>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <span>Review context</span>
            <Badge variant="outline">{review.flag_type}</Badge>
            <Badge variant="secondary">{review.severity}</Badge>
          </CardTitle>
          <CardDescription>Reviewer, reviewee, task và comment gốc</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <p class="text-muted-foreground">Reviewer</p>
              <p class="font-medium">{review.reviewer?.username ?? 'Không rõ'}</p>
              <p class="text-muted-foreground">{review.reviewer?.email ?? 'Không có email'}</p>
            </div>
            <div>
              <p class="text-muted-foreground">Reviewee</p>
              <p class="font-medium">{review.reviewee?.username ?? 'Không rõ'}</p>
              <p class="text-muted-foreground">{review.reviewee?.email ?? 'Không có email'}</p>
            </div>
            <div>
              <p class="text-muted-foreground">Task</p>
              <p class="font-medium">{review.task?.title ?? 'Không rõ task'}</p>
            </div>
            <div>
              <p class="text-muted-foreground">Skill</p>
              <p class="font-medium">{review.skill?.name ?? 'Không rõ skill'}</p>
            </div>
          </div>

          <div>
            <p class="text-muted-foreground">Comment</p>
            <div class="neo-surface-soft mt-1 p-3 text-sm">
              {review.comment ?? 'Không có comment'}
            </div>
          </div>

          <div>
            <p class="text-muted-foreground">Ghi chú moderation</p>
            <div class="neo-surface-soft mt-1 p-3 text-sm">
              {review.notes ?? 'Chưa có ghi chú'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trạng thái xử lý</CardTitle>
          <CardDescription>Resolve trực tiếp tại detail page</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div class="flex items-center gap-2">
            <Badge variant={review.status === 'pending' ? 'secondary' : 'outline'}>{review.status}</Badge>
            {#if review.reviewed_at}
              <span class="text-muted-foreground">đã xử lý {new Date(review.reviewed_at).toLocaleString('vi-VN')}</span>
            {/if}
          </div>
          <div>
            <p class="text-muted-foreground">Detected at</p>
            <p class="font-medium">{review.detected_at ? new Date(review.detected_at).toLocaleString('vi-VN') : 'Không rõ'}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Moderator</p>
            <p class="font-medium">{review.moderator?.username ?? 'Chưa có'}</p>
          </div>
          <div class="flex gap-2">
            <Button disabled={review.status !== 'pending'} onclick={() => { resolve('confirm'); }}>
              Xác nhận cờ
            </Button>
            <Button variant="destructive" disabled={review.status !== 'pending'} onclick={() => { resolve('dismiss'); }}>
              Bỏ cờ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Evidence</CardTitle>
        <CardDescription>Các proof liên quan tới review session</CardDescription>
      </CardHeader>
      <CardContent>
        {#if evidences.length === 0}
          <p class="text-sm text-muted-foreground">Chưa có evidence.</p>
        {:else}
          <div class="grid gap-3 md:grid-cols-2">
            {#each evidences as evidence}
              <div class="neo-surface-soft p-4 text-sm shadow-none">
                <p class="font-medium">{evidence.title ?? evidence.evidence_type}</p>
                <p class="mt-1 text-muted-foreground">{evidence.description ?? 'Không có mô tả'}</p>
                {#if evidence.url}
                  <a class="neo-text-blue mt-2 inline-block hover:underline" href={evidence.url} target="_blank" rel="noreferrer">
                    Mở evidence
                  </a>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
