<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { Link } from '@inertiajs/svelte'

  interface Review {
    id: string
    reviewer: {
      id: string
      username: string
      email: string
    } | null
    reviewee: {
      id: string
      username: string
    } | null
    reviewed_by: {
      id: string
      username: string
    } | null
    comment: string | null
    flag_type: string
    severity: string
    status: string
    notes: string | null
    created_at: string
    reviewed_at: string | null
  }

  interface Props {
    reviews: Review[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
  }

  const { reviews, meta }: Props = $props()

  function resolveReview(id: string, action: 'confirm' | 'dismiss') {
    router.put(`/admin/reviews/${id}/resolve`, { action }, { preserveScroll: true })
  }
</script>

  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="neo-kicker">Admin / Flagged Reviews</p>
        <h1 class="text-4xl font-bold tracking-tight">Review bị gắn cờ</h1>
        <p class="mt-2 text-sm text-muted-foreground">Kiểm tra và xử lý các review bị phát hiện bất thường.</p>
      </div>
      <Link href="/admin">
        <Button variant="outline">Quay lại dashboard</Button>
      </Link>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Moderation review ({meta.total})</CardTitle>
        <CardDescription>Xử lý các review bị report hoặc bị anomaly detector gắn cờ</CardDescription>
      </CardHeader>
      <CardContent>
        {#if reviews.length === 0}
          <div class="flex items-center justify-center py-12">
            <div class="text-center max-w-md">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg
                  class="h-8 w-8 neo-text-blue"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 class="mb-2 text-lg font-semibold text-foreground">Không có review bị gắn cờ</h3>
              <p class="text-muted-foreground">
                Hiện chưa có review nào cần system admin vào xử lý.
              </p>
            </div>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="neo-data-table">
              <thead>
                <tr>
                  <th>Review</th>
                  <th>Cờ cảnh báo</th>
                  <th>Trạng thái</th>
                  <th>Thời điểm</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {#each reviews as review}
                  <tr class="text-sm">
                    <td>
                      <div class="font-medium">
                        {review.reviewer?.username || 'Không rõ'} → {review.reviewee?.username || 'Không rõ'}
                      </div>
                      <div class="mt-1 text-xs text-muted-foreground">{review.comment || 'Không có nhận xét'}</div>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <Badge variant="outline">{review.flag_type}</Badge>
                        <Badge variant="secondary">{review.severity}</Badge>
                      </div>
                    </td>
                    <td>
                      <Badge variant={review.status === 'pending' ? 'secondary' : 'outline'}>
                        {review.status}
                      </Badge>
                    </td>
                    <td class="text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</td>
                    <td>
                      <div class="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onclick={() => {
                            router.visit(`/admin/reviews/${review.id}`)
                          }}
                        >
                          Xem chi tiết
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={review.status !== 'pending'}
                          onclick={() => { resolveReview(review.id, 'confirm'); }}
                        >
                          Xác nhận
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={review.status !== 'pending'}
                          onclick={() => { resolveReview(review.id, 'dismiss'); }}
                        >
                          Bỏ cờ
                        </Button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
