<script lang="ts">
  import SubscriptionQrCard from '@/components/billing/subscription_qr_card.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

  interface PaymentConfig {
    bankName: string
    bankCode: string
    bankAccountNumber: string
    bankAccountName: string
    branch: string | null
  }

  interface PlanDefinition {
    id: string
    storagePlan: string
    name: string
    shortName: string
    price: number
    priceLabel: string
    paymentContentPrefix: string
    features: string[]
  }

  interface Props {
    paymentConfig: PaymentConfig
    plans: PlanDefinition[]
    stats: {
      total: number
      active: number
      expiringSoon: number
      cancelled: number
      byPlan: Record<string, number>
    }
  }

  const { paymentConfig, plans, stats }: Props = $props()
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="neo-kicker">Admin / Subscription Billing</p>
      <h1 class="text-4xl font-bold tracking-tight">QR gói Pro và Pro Max</h1>
      <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
        Bộ mã QR để test flow thanh toán chuyển khoản cho gói cá nhân, cùng cấu hình nhận tiền và mapping plan hiện dùng ở backend.
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <a href="/admin/packages" class="neo-surface-soft px-3 py-2 text-sm font-bold">Quản lý packages</a>
      <a href="/admin/audit-logs" class="neo-surface-soft px-3 py-2 text-sm font-bold">Audit log</a>
      <a href="/admin/permissions" class="neo-surface-soft px-3 py-2 text-sm font-bold">Permission matrix</a>
    </div>
  </div>

  <div class="grid gap-4 md:grid-cols-4">
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
        <CardTitle class="text-sm font-medium">Sắp hết hạn</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold neo-text-orange">{stats.expiringSoon}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Đã hủy</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.cancelled}</div></CardContent>
    </Card>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Tài khoản nhận tiền</CardTitle>
      <CardDescription>
        Lấy từ biến môi trường `SUBSCRIPTION_BANK_*`. Nếu chưa cấu hình, màn hình đang dùng fallback local để test giao diện.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-border p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ngân hàng</p>
        <p class="mt-2 text-lg font-bold">{paymentConfig.bankName}</p>
        <Badge variant="outline" class="mt-3">{paymentConfig.bankCode}</Badge>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Số tài khoản</p>
        <p class="mt-2 font-mono text-lg font-bold">{paymentConfig.bankAccountNumber}</p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tên tài khoản</p>
        <p class="mt-2 text-lg font-bold">{paymentConfig.bankAccountName}</p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Chi nhánh</p>
        <p class="mt-2 text-lg font-bold">{paymentConfig.branch ?? 'Không khai báo'}</p>
      </div>
    </CardContent>
  </Card>

  <div class="grid gap-6">
    {#each plans as plan}
      <SubscriptionQrCard
        paymentConfig={paymentConfig}
        {plan}
        activeSubscribers={stats.byPlan[plan.storagePlan] ?? 0}
      />
    {/each}
  </div>
</div>
