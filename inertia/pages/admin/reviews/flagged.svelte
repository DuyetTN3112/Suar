<script lang="ts">
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Link } from '@inertiajs/svelte'

  interface Review {
    id: string
    content: string
    flagged_reason: string
    created_at: string
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

  let { reviews, meta }: Props = $props()
</script>

<AdminLayout title="Flagged Reviews - System Admin">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Flagged Reviews</h1>
        <p class="text-slate-600 mt-1">Manage flagged and reported reviews</p>
      </div>
      <Link href="/admin">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Review Moderation ({meta.total})</CardTitle>
        <CardDescription>Handle reported and flagged reviews</CardDescription>
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
              <h3 class="text-lg font-semibold text-slate-900 mb-2">No Flagged Reviews</h3>
              <p class="text-slate-600">
                There are currently no flagged or reported reviews to moderate.
              </p>
            </div>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="border-b">
                <tr class="text-left text-sm text-slate-600">
                  <th class="pb-3 font-medium">Review Content</th>
                  <th class="pb-3 font-medium">Reason</th>
                  <th class="pb-3 font-medium">Flagged At</th>
                  <th class="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                {#each reviews as review}
                  <tr class="text-sm">
                    <td class="py-3">{review.content}</td>
                    <td class="py-3 text-slate-600">{review.flagged_reason}</td>
                    <td class="py-3 text-slate-600">{new Date(review.created_at).toLocaleDateString()}</td>
                    <td class="py-3">
                      <div class="flex gap-2">
                        <Button variant="outline" size="sm" disabled>Approve</Button>
                        <Button variant="destructive" size="sm" disabled>Remove</Button>
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
