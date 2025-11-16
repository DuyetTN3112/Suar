<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardDescription from '@/apps/admin/shared/ui/card_description.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type { OffsetPagePagination } from '@/apps/admin/shared/lib/pagination'
  import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'
  import { format } from 'date-fns'
  import { dateFnsLocale, shortDatePattern } from '@/apps/admin/shared/lib/date_locale'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

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
    pagination: OffsetPagePagination
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

  const { stats, subscriptions, pagination, filters, packages }: Props = $props()
  const { t } = useTranslation()

  function formatShortDate(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return format(date, shortDatePattern(), { locale: dateFnsLocale() })
  }
  let customPlans = $state<Record<string, string>>({})
  let customStatuses = $state<Record<string, string>>({})
  let rowErrors = $state<Record<string, { plan?: string; status?: string }>>({})

  function firstError(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0]
    return value
  }

  function updateSubscription(
    subscriptionId: string,
    payload: { plan?: string; status?: string; auto_renew?: boolean }
  ) {
    router.put(`/admin/packages/${subscriptionId}`, payload, {
      preserveScroll: true,
      preserveState: true,
      onError: (errors: Record<string, string | string[]>) => {
        rowErrors = {
          ...rowErrors,
          [subscriptionId]: {
            plan: firstError(errors.plan),
            status: firstError(errors.status),
          },
        }
      },
      onSuccess: () => {
        rowErrors = { ...rowErrors, [subscriptionId]: {} }
      },
    })
  }

  function updateCustomSubscription(subscriptionId: string) {
    updateSubscription(subscriptionId, {
      plan: customPlans[subscriptionId] ?? '',
      status: customStatuses[subscriptionId] ?? '',
    })
  }
</script>

  <div class="space-y-6">
    <div>
      <div>
        <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Admin / Packages</p>
        <h1 class="text-4xl font-bold tracking-tight">{t('task.admin_packages.title', {}, 'Service packages')}</h1>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">{t('task.admin_packages.total_subscriptions', {}, 'Total subscriptions')}</CardTitle>
        </CardHeader>
        <CardContent><div class="text-2xl font-bold">{stats.total}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">{t('task.admin_packages.active', {}, 'Active')}</CardTitle>
        </CardHeader>
        <CardContent><div class="text-2xl font-bold text-foreground">{stats.active}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">{t('task.admin_packages.expiring_soon', {}, 'Expiring in 14 days')}</CardTitle>
        </CardHeader>
        <CardContent><div class="text-2xl font-bold text-primary">{stats.expiringSoon}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">{t('task.admin_packages.cancelled', {}, 'Cancelled')}</CardTitle>
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
        <CardTitle>{t('task.admin_packages.subscribers_title', {}, 'Package subscribers')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th>User</th>
                <th>{t('task.admin_packages.plan', {}, 'Plan')}</th>
                <th>{t('task.admin_packages.status', {}, 'Status')}</th>
                <th>{t('task.admin_packages.renewal', {}, 'Renewal')}</th>
                <th>{t('task.admin_packages.actions', {}, 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {#each subscriptions as subscription}
                <tr class="text-sm">
                  <td>
                    <div class="font-medium">{subscription.username}</div>
                    <div class="text-xs text-muted-foreground">{subscription.email ?? t('common.no_email', {}, 'No email')}</div>
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
                    {subscription.expires_at ? formatShortDate(subscription.expires_at) : t('common.unlimited', {}, 'Unlimited')}
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
                        {t('task.admin_packages.activate', {}, 'Activate')}
                      </Button>
                      <Button size="sm" variant="destructive" onclick={() => { updateSubscription(subscription.id, { status: 'cancelled', auto_renew: false }); }}>
                        {t('task.admin_packages.cancel', {}, 'Cancel')}
                      </Button>
                    </div>
                    <div class="mt-3 grid gap-2 sm:grid-cols-[minmax(7rem,1fr)_minmax(7rem,1fr)_auto]">
                      <input
                        class="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
                        aria-label={t('task.admin_packages.custom_plan_aria', { username: subscription.username }, 'Custom plan for :username')}
                        placeholder="plan"
                        value={customPlans[subscription.id] ?? ''}
                        oninput={(event) => {
                          customPlans = {
                            ...customPlans,
                            [subscription.id]: event.currentTarget.value,
                          }
                        }}
                      />
                      <input
                        class="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
                        aria-label={t('task.admin_packages.custom_status_aria', { username: subscription.username }, 'Custom status for :username')}
                        placeholder="status"
                        value={customStatuses[subscription.id] ?? ''}
                        oninput={(event) => {
                          customStatuses = {
                            ...customStatuses,
                            [subscription.id]: event.currentTarget.value,
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={t('task.admin_packages.apply_custom_aria', { username: subscription.username }, 'Apply custom values for :username')}
                        onclick={() => { updateCustomSubscription(subscription.id) }}
                      >
                        {t('task.admin_packages.apply', {}, 'Apply')}
                      </Button>
                    </div>
                    {#if rowErrors[subscription.id]?.plan || rowErrors[subscription.id]?.status}
                      <div class="mt-2 space-y-1 text-xs font-medium text-destructive">
                        {#if rowErrors[subscription.id]?.plan}
                          <p>{rowErrors[subscription.id]?.plan}</p>
                        {/if}
                        {#if rowErrors[subscription.id]?.status}
                          <p>{rowErrors[subscription.id]?.status}</p>
                        {/if}
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if subscriptions.length === 0}
          <p class="py-8 text-center text-sm text-muted-foreground">
            {t('task.admin_packages.empty', {}, 'No subscriptions yet.')}
          </p>
        {/if}

        {#if true}
          <div class="mt-4">
            <UnifiedOffsetPagination
              pagination={pagination}
              baseUrl="/admin/packages"
              queryParams={{
                search: filters.search || undefined,
                plan: filters.plan || undefined,
                status: filters.status || undefined,
              }}
            />
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
