<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AdminLayout from '@/layouts/admin_layout.svelte'
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

<AdminLayout title="Review bị gắn cờ">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Review bị gắn cờ</h1>
        <p class="text-slate-600 mt-1">Kiểm tra và xử lý các review bị phát hiện bất thường.</p>
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
              <div class="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg
                  class="w-8 h-8 text-green-600"
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
              <h3 class="text-lg font-semibold text-slate-900 mb-2">Không có review bị gắn cờ</h3>
              <p class="text-slate-600">
                Hiện chưa có review nào cần system admin vào xử lý.
              </p>
            </div>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="border-b">
                <tr class="text-left text-sm text-slate-600">
                  <th class="pb-3 font-medium">Review</th>
                  <th class="pb-3 font-medium">Cờ cảnh báo</th>
                  <th class="pb-3 font-medium">Trạng thái</th>
                  <th class="pb-3 font-medium">Thời điểm</th>
                  <th class="pb-3 font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                {#each reviews as review}
                  <tr class="text-sm">
                    <td class="py-3">
                      <div class="font-medium">
                        {review.reviewer?.username || 'Không rõ'} → {review.reviewee?.username || 'Không rõ'}
                      </div>
                      <div class="text-slate-600 text-xs mt-1">{review.comment || 'Không có nhận xét'}</div>
                    </td>
                    <td class="py-3">
                      <div class="flex items-center gap-2">
                        <Badge variant="outline">{review.flag_type}</Badge>
                        <Badge variant="secondary">{review.severity}</Badge>
                      </div>
                    </td>
                    <td class="py-3">
                      <Badge variant={review.status === 'pending' ? 'secondary' : 'outline'}>
                        {review.status}
                      </Badge>
                    </td>
                    <td class="py-3 text-slate-600">{new Date(review.created_at).toLocaleDateString()}</td>
                    <td class="py-3">
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
</AdminLayout>
