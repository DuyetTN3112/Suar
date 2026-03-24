<script lang="ts">
  import { inertia } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { CreditCard, Crown, Zap, Check } from 'lucide-svelte'

  interface Props {
    subscription: {
      plan: 'free' | 'pro' | 'pro_max'
      status: 'active' | 'cancelled' | 'past_due'
      current_period_end: string | null
      cancel_at_period_end: boolean
    }
    plans: {
      id: string
      name: string
      price: number
      features: string[]
      popular?: boolean
    }[]
  }

  let { subscription, plans }: Props = $props()

  function getPlanIcon(name: string) {
    if (name.includes('Max')) return Zap
    if (name.includes('Pro')) return Crown
    return CreditCard
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
</script>

<OrganizationLayout>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
      <p class="text-muted-foreground">Manage your subscription and payment methods</p>
    </div>

    <!-- Current Subscription -->
    <Card>
      <CardHeader>
        <CardTitle>Current Subscription</CardTitle>
        <CardDescription>Your active plan and billing details</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard class="h-6 w-6 text-primary" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-2xl font-bold capitalize">{subscription.plan}</h3>
                <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
                  {subscription.status}
                </Badge>
              </div>
              {#if subscription.current_period_end}
                <p class="text-sm text-muted-foreground">
                  {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on {formatDate(subscription.current_period_end)}
                </p>
              {/if}
            </div>
          </div>
          {#if subscription.plan !== 'free'}
            <Button variant="outline" onclick={() => inertia.visit('/org/billing/manage')}>
              Manage Subscription
            </Button>
          {/if}
        </div>
      </CardContent>
    </Card>

    <!-- Available Plans -->
    <div>
      <h2 class="text-2xl font-bold mb-4">Available Plans</h2>
      <div class="grid gap-6 md:grid-cols-3">
        {#each plans as plan}
          {@const Icon = getPlanIcon(plan.name)}
          <Card class={plan.popular ? 'border-primary shadow-lg' : ''}>
            {#if plan.popular}
              <div class="bg-primary text-primary-foreground text-center py-2 text-sm font-medium rounded-t-lg">
                Most Popular
              </div>
            {/if}
            <CardHeader>
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon class="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <div class="text-3xl font-bold mt-2">
                    ${plan.price}
                    {#if plan.price > 0}
                      <span class="text-sm font-normal text-muted-foreground">/month</span>
                    {/if}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul class="space-y-3 mb-6">
                {#each plan.features as feature}
                  <li class="flex items-start gap-2">
                    <Check class="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span class="text-sm">{feature}</span>
                  </li>
                {/each}
              </ul>
              <Button
                class="w-full"
                variant={plan.id === subscription.plan ? 'outline' : 'default'}
                disabled={plan.id === subscription.plan}
                onclick={() => inertia.post(`/org/billing/upgrade`, { plan: plan.id })}
              >
                {plan.id === subscription.plan ? 'Current Plan' : `Upgrade to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        {/each}
      </div>
    </div>
  </div>
</OrganizationLayout>
