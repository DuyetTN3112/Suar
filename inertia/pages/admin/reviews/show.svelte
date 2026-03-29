<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Badge from '@/components/ui/badge.svelte'

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
    evidences: Array<{
      id: string
      title: string | null
      url: string | null
      evidence_type: string
      description: string | null
      created_at: string | null
    }>
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

<AdminLayout title="Chi tiết flagged review">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Chi tiết flagged review</h1>
        <p class="mt-1 text-slate-600">Trang detail để xem đủ ngữ cảnh trước khi resolve tranh chấp.</p>
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
              <p class="text-slate-500">Reviewer</p>
              <p class="font-medium">{review.reviewer?.username || 'Không rõ'}</p>
              <p class="text-slate-500">{review.reviewer?.email || ''}</p>
            </div>
            <div>
              <p class="text-slate-500">Reviewee</p>
              <p class="font-medium">{review.reviewee?.username || 'Không rõ'}</p>
              <p class="text-slate-500">{review.reviewee?.email || ''}</p>
            </div>
            <div>
              <p class="text-slate-500">Task</p>
              <p class="font-medium">{review.task?.title || 'Không rõ task'}</p>
            </div>
            <div>
              <p class="text-slate-500">Skill</p>
              <p class="font-medium">{review.skill?.name || 'Không rõ skill'}</p>
            </div>
          </div>

          <div>
            <p class="text-slate-500">Comment</p>
            <div class="mt-1 rounded-lg border bg-slate-50 p-3 text-slate-700">
              {review.comment || 'Không có comment'}
            </div>
          </div>

          <div>
            <p class="text-slate-500">Ghi chú moderation</p>
            <div class="mt-1 rounded-lg border bg-slate-50 p-3 text-slate-700">
              {review.notes || 'Chưa có ghi chú'}
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
              <span class="text-slate-500">đã xử lý {new Date(review.reviewed_at).toLocaleString('vi-VN')}</span>
            {/if}
          </div>
          <div>
            <p class="text-slate-500">Detected at</p>
            <p class="font-medium">{review.detected_at ? new Date(review.detected_at).toLocaleString('vi-VN') : 'Không rõ'}</p>
          </div>
          <div>
            <p class="text-slate-500">Moderator</p>
            <p class="font-medium">{review.moderator?.username || 'Chưa có'}</p>
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
          <p class="text-sm text-slate-500">Chưa có evidence.</p>
        {:else}
          <div class="grid gap-3 md:grid-cols-2">
            {#each evidences as evidence}
              <div class="rounded-lg border p-4 text-sm">
                <p class="font-medium">{evidence.title || evidence.evidence_type}</p>
                <p class="mt-1 text-slate-500">{evidence.description || 'Không có mô tả'}</p>
                {#if evidence.url}
                  <a class="mt-2 inline-block text-blue-600 hover:underline" href={evidence.url} target="_blank" rel="noreferrer">
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
</AdminLayout>
