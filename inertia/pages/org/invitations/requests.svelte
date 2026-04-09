<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { Search, UserCheck, UserX } from 'lucide-svelte'

  interface Props {
    requests: {
      user_id: string
      username: string
      email: string | null
      org_role: string
      status: string
      created_at: string
    }[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
    }
  }

  const props: Props = $props()
  const requests = $derived(props.requests)
  const meta = $derived(props.meta)
  const filters = $derived(props.filters)
  let searchValue = $state('')

  $effect(() => {
    searchValue = filters.search ?? ''
  })

  function handleSearch() {
    router.get(
      '/org/invitations/requests',
      { search: searchValue, page: 1 },
      { preserveState: true, preserveScroll: true }
    )
  }

  function processRequest(userId: string, action: 'approve' | 'reject') {
    router.put(
      `/org/invitations/requests/${userId}/approve`,
      { action },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
</script>

<OrganizationLayout>
  <div class="space-y-6">
    <div>
      <p class="neo-kicker">Organization / Join Requests</p>
      <h1 class="text-4xl font-bold tracking-tight">Yêu cầu tham gia</h1>
      <p class="mt-2 text-sm text-muted-foreground">Duyệt hoặc từ chối các yêu cầu gia nhập tổ chức đang chờ xử lý.</p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div class="flex gap-4">
          <div class="flex-1 relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              class="pl-10"
              placeholder="Tìm theo username hoặc email..."
              bind:value={searchValue}
              onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleSearch() }}
            />
          </div>
          <Button onclick={handleSearch}>Tìm kiếm</Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Yêu cầu đang chờ ({meta.total})</CardTitle>
      </CardHeader>
      <CardContent>
        {#if requests.length === 0}
          <div class="py-12 text-center text-muted-foreground">
            Không có yêu cầu tham gia nào đang chờ.
          </div>
        {:else}
          <div class="space-y-4">
            {#each requests as request}
              <div class="neo-surface-soft flex items-center justify-between gap-4 p-4">
                <div>
                  <div class="font-medium">{request.username}</div>
                  <div class="text-sm text-muted-foreground">{request.email || 'Không có email'}</div>
                  <div class="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{request.org_role}</Badge>
                    <span class="text-xs text-muted-foreground">
                      Gửi ngày {formatDate(request.created_at)}
                    </span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <Button size="sm" onclick={() => { processRequest(request.user_id, 'approve') }}>
                    <UserCheck class="mr-2 h-4 w-4" />
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onclick={() => { processRequest(request.user_id, 'reject') }}
                  >
                    <UserX class="mr-2 h-4 w-4" />
                    Từ chối
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
