<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

  interface Props {
    stats: {
      total: number
      active: number
      expiringSoon: number
      cancelled: number
      byPlan: Record<string, number>
    }
    subscriptions: {
      id: string
      user_id: string
      username: string
      email: string | null
      system_role: string
      plan: string
      status: string
      started_at: string | null
      expires_at: string | null
      auto_renew: boolean
      created_at: string | null
      updated_at: string | null
    }[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search: string
      plan: string
      status: string
    }
    packages: {
      id: string
      storagePlan: string
      name: string
      priceLabel: string
      features: string[]
    }[]
  }

  const { stats, subscriptions, meta, packages }: Props = $props()

  function updateSubscription(
    subscriptionId: string,
    payload: { plan?: string; status?: string; auto_renew?: boolean }
  ) {
    router.put(`/admin/packages/${subscriptionId}`, payload, {
      preserveScroll: true,
      preserveState: true,
    })
  }
</script>

  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="neo-kicker">Admin / Packages</p>
        <h1 class="text-4xl font-bold tracking-tight">Gói dịch vụ</h1>
        <p class="mt-2 text-sm text-muted-foreground">Theo dõi adoption của gói Pro/ProMax và chỉnh trạng thái subscription trực tiếp.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/admin/qr-codes" class="neo-surface-soft px-3 py-2 text-sm font-bold">QR gói cá nhân</a>
        <a href="/admin/audit-logs" class="neo-surface-soft px-3 py-2 text-sm font-bold">Audit log</a>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Tổng subscription</CardTitle>
        </CardHeader>
        <CardContent><div class="text-2xl font-bold">{stats.total}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Đang active</CardTitle>
        </CardHeader>
        <CardContent><div class="text-2xl font-bold neo-text-blue">{stats.active}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Sắp hết hạn 14 ngày</CardTitle>
        </CardHeader>
        <CardContent><div class="text-2xl font-bold neo-text-orange">{stats.expiringSoon}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Đã hủy</CardTitle>
        </CardHeader>
        <CardContent><div class="text-2xl font-bold text-muted-foreground">{stats.cancelled}</div></CardContent>
      </Card>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      {#each packages as pkg}
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>{pkg.name}</span>
              <Badge variant="outline">{stats.byPlan[pkg.storagePlan] || 0} user</Badge>
            </CardTitle>
            <CardDescription>{pkg.priceLabel}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-2">
            {#each pkg.features as feature}
              <p class="text-sm text-muted-foreground">• {feature}</p>
            {/each}
          </CardContent>
        </Card>
      {/each}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Người dùng đang dùng gói</CardTitle>
        <CardDescription>
          Quản lý nhanh các subscription đang có trong local seed. Trang này đủ để test redirect, package adoption và update trạng thái.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <table class="neo-data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Gói</th>
                <th>Trạng thái</th>
                <th>Gia hạn</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {#each subscriptions as subscription}
                <tr class="text-sm">
                  <td>
                    <div class="font-medium">{subscription.username}</div>
                    <div class="text-xs text-muted-foreground">{subscription.email ?? 'Không có email'}</div>
                  </td>
                  <td>
                    <Badge variant="outline">{subscription.plan}</Badge>
                  </td>
                  <td>
                    <Badge variant={subscription.status === 'active' ? 'secondary' : 'outline'}>
                      {subscription.status}
                    </Badge>
                  </td>
                  <td class="text-muted-foreground">
                    {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                  </td>
                  <td>
                    <div class="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onclick={() => { updateSubscription(subscription.id, { plan: 'pro' }); }}>
                        Pro
                      </Button>
                      <Button size="sm" variant="outline" onclick={() => { updateSubscription(subscription.id, { plan: 'promax' }); }}>
                        ProMax
                      </Button>
                      <Button size="sm" variant="outline" onclick={() => { updateSubscription(subscription.id, { status: 'active', auto_renew: true }); }}>
                        Kích hoạt
                      </Button>
                      <Button size="sm" variant="destructive" onclick={() => { updateSubscription(subscription.id, { status: 'cancelled', auto_renew: false }); }}>
                        Hủy
                      </Button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if subscriptions.length === 0}
          <p class="py-8 text-center text-sm text-muted-foreground">Chưa có subscription nào.</p>
        {/if}

        {#if meta.lastPage > 1}
          <div class="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Trang {meta.currentPage}/{meta.lastPage}</span>
            <div class="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={meta.currentPage === 1}
                onclick={() => {
                  router.visit(`/admin/packages?page=${meta.currentPage - 1}`)
                }}
              >
                Trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={meta.currentPage === meta.lastPage}
                onclick={() => {
                  router.visit(`/admin/packages?page=${meta.currentPage + 1}`)
                }}
              >
                Sau
              </Button>
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
