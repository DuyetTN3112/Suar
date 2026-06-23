<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'

  export interface ReverseReviewListItem {
    id: string
    target_label: string
    target_type?: string
    target_type_label: string
    author_label: string
    submitted_at_label: string
    rating: number
    comment: string | null
    is_anonymous: boolean
  }

  interface Props {
    title: string
    description: string
    reviews: ReverseReviewListItem[]
    stats: {
      total: number
      anonymous: number
      by_target_type: Record<string, number>
    }
    scope: 'me' | 'org' | 'admin'
  }

  const {
    title,
    description,
    reviews = [],
    stats = { total: 0, anonymous: 0, by_target_type: {} },
    scope,
  }: Props = $props()

  let filterTargetType = $state('')
  let filterMinRating = $state('')
  let showFilters = $state(false)

  function targetTypeLabel(targetType: string): string {
    const labels: Record<string, string> = {
      manager: 'Manager',
      peer: 'Peer',
      reviewee: 'Reviewee',
      self: 'Self',
      organization: 'Organization',
      project: 'Project',
    }

    return labels[targetType] ?? targetType
  }

  const targetTypes = $derived(Object.keys(stats.by_target_type))

  const filteredReviews = $derived(
    reviews
      .filter(
        (r) =>
          !filterTargetType ||
          r.target_type === filterTargetType ||
          r.target_type_label === targetTypeLabel(filterTargetType)
      )
      .filter((r) => {
        if (!filterMinRating) return true
        const min = Number(filterMinRating)
        return !Number.isNaN(min) && r.rating >= min
      })
  )


</script>

<div class="space-y-6" data-testid="reverse-review-filters">
  <div>
    <h1 class="text-4xl font-bold tracking-tight">{title}</h1>
    <p class="mt-2 text-sm text-muted-foreground">{description}</p>
  </div>

  <div class="flex flex-wrap gap-2">
    <Badge variant="outline">Total {stats.total}</Badge>
    <Badge variant="outline">Anonymous {stats.anonymous}</Badge>
    {#each Object.entries(stats.by_target_type) as [targetType, count]}
      <Badge variant="secondary">{targetTypeLabel(targetType)}: {count}</Badge>
    {/each}
    <Button variant="outline" size="sm" onclick={() => showFilters = !showFilters}>
      {showFilters ? 'Hide filters' : 'Show filters'}
    </Button>
  </div>

  {#if showFilters}
    <Card>
      <CardContent class="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div class="space-y-2">
          <Label for="rr-filter-target-type">Target type</Label>
          <select id="rr-filter-target-type" bind:value={filterTargetType} class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            <option value="">All types</option>
            {#each targetTypes as tt}
              <option value={tt}>{targetTypeLabel(tt)}</option>
            {/each}
          </select>
        </div>
        <div class="space-y-2">
          <Label for="rr-filter-min-rating">Min rating</Label>
          <Input id="rr-filter-min-rating" bind:value={filterMinRating} type="number" min="1" max="5" placeholder="1-5" />
        </div>
        <Button variant="outline" onclick={() => { filterTargetType = ''; filterMinRating = ''; }}>
          Reset
        </Button>
      </CardContent>
    </Card>
  {/if}

  <Card>
    <CardHeader>
      <CardTitle>Reverse review records</CardTitle>
      <CardDescription>
        Read-only surface for submitted reverse reviews across current scope ({scope}).
      </CardDescription>
    </CardHeader>
    <CardContent>
      {#if filteredReviews.length === 0}
        <div class="py-12 text-center text-sm text-muted-foreground">
          {reviews.length === 0 ? 'No reverse reviews found.' : 'No reviews match current filters.'}
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse" data-testid="reverse-review-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Type</th>
                <th>Rating</th>
                <th>Author</th>
                <th>Submitted</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredReviews as review (review.id)}
                <tr class="text-sm">
                  <td>
                    <Badge variant="secondary">{review.target_label}</Badge>
                  </td>
                  <td>
                    <Badge variant="outline">{review.target_type_label}</Badge>
                  </td>
                  <td>
                    <Badge variant="secondary">{review.rating}/5</Badge>
                  </td>
                  <td>
                    <Badge variant="outline">{review.author_label}</Badge>
                  </td>
                  <td class="text-xs text-muted-foreground">{review.submitted_at_label}</td>
                  <td class="max-w-[360px]">
                    <div class="line-clamp-3 text-muted-foreground">
                      {review.comment ?? 'No comment'}
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
