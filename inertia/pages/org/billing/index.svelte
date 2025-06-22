<script lang="ts">
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { CreditCard } from 'lucide-svelte'

  interface Props {
    subscription: {
      plan: 'free' | 'starter' | 'professional' | 'enterprise'
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

  const { subscription }: Props = $props()

  function getPlanLabel(planId: string) {
    const labels = {
      free: 'Free',
      starter: 'Starter',
      professional: 'Professional',
      enterprise: 'Enterprise',
    }

    return labels[planId as keyof typeof labels] || planId
  }
</script>

<OrganizationLayout>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Billing tổ chức</h1>
      <p class="text-muted-foreground">
        Màn này chỉ đang phản ánh field legacy còn tồn tại trong schema, không phải gói sản phẩm chính thức cho organization.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Trạng thái hiện tại</CardTitle>
        <CardDescription>
          Theo product intent hiện tại, subscription áp dụng cho user account để ảnh hưởng ranking trên Marketplace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard class="h-6 w-6 text-primary" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-2xl font-bold">Organization package: không dùng làm product public</h3>
                <Badge variant="outline">legacy</Badge>
              </div>
              <p class="text-sm text-muted-foreground">
                Giá trị field schema hiện tại: <span class="font-medium">{getPlanLabel(subscription.plan)}</span>
              </p>
            </div>
          </div>

          <div class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            User subscription mới là phần đang có ý nghĩa nghiệp vụ cho Marketplace. Nếu tiếp tục giữ
            <code>organizations.plan</code>, nên xem nó là dữ liệu legacy hoặc metadata nội bộ, không nên quảng bá như gói cho tổ chức.
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
