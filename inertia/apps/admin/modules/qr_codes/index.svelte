<script lang="ts">
  import SubscriptionQrCard from '@/apps/admin/shared/components/billing/subscription_qr_card.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardDescription from '@/apps/admin/shared/ui/card_description.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

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
  const { t } = useTranslation()
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('admin_ui.qr_codes.eyebrow', {}, 'Admin / Subscription Billing')}</p>
      <h1 class="text-4xl font-bold tracking-tight">{t('admin_ui.qr_codes.title', {}, 'QR for Pro and Pro Max plans')}</h1>
      <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
        {t('admin_ui.qr_codes.description', {}, 'QR codes for testing bank transfer payment flows for personal plans, including receiving account configuration and backend plan mapping.')}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <a href="/admin/packages" class="border border-border rounded-lg px-3 py-2 bg-card text-sm font-medium">{t('admin_ui.qr_codes.manage_packages', {}, 'Manage packages')}</a>
      <a href="/admin/audit-logs" class="border border-border rounded-lg px-3 py-2 bg-card text-sm font-medium">{t('admin_ui.qr_codes.audit_log', {}, 'Audit log')}</a>
      <a href="/admin/permissions" class="border border-border rounded-lg px-3 py-2 bg-card text-sm font-medium">{t('admin_ui.qr_codes.permission_matrix', {}, 'Permission matrix')}</a>
    </div>
  </div>

  <div class="grid gap-4 md:grid-cols-4">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('admin_ui.qr_codes.total_subscriptions', {}, 'Total subscriptions')}</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.total}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('admin_ui.qr_codes.active', {}, 'Active')}</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold text-foreground">{stats.active}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('admin_ui.qr_codes.expiring_soon', {}, 'Expiring soon')}</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold text-primary">{stats.expiringSoon}</div></CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('admin_ui.qr_codes.cancelled', {}, 'Cancelled')}</CardTitle>
      </CardHeader>
      <CardContent><div class="text-2xl font-bold">{stats.cancelled}</div></CardContent>
    </Card>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>{t('admin_ui.qr_codes.recipient_account', {}, 'Recipient account')}</CardTitle>
      <CardDescription>
        {t('admin_ui.qr_codes.recipient_description', {}, 'Loaded from SUBSCRIPTION_BANK_* environment variables. If missing, this screen uses local fallback values for UI testing.')}
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-border p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('admin_ui.qr_codes.bank', {}, 'Bank')}</p>
        <p class="mt-2 text-lg font-bold">{paymentConfig.bankName}</p>
        <Badge variant="outline" class="mt-3">{paymentConfig.bankCode}</Badge>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('admin_ui.qr_codes.account_number', {}, 'Account number')}</p>
        <p class="mt-2 font-mono text-lg font-bold">{paymentConfig.bankAccountNumber}</p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('admin_ui.qr_codes.account_name', {}, 'Account name')}</p>
        <p class="mt-2 text-lg font-bold">{paymentConfig.bankAccountName}</p>
      </div>
      <div class="rounded-xl border border-border p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('admin_ui.qr_codes.branch', {}, 'Branch')}</p>
        <p class="mt-2 text-lg font-bold">{paymentConfig.branch ?? t('admin_ui.qr_codes.branch_missing', {}, 'Not declared')}</p>
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
