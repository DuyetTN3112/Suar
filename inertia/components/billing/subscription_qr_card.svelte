<script lang="ts">
  import { Check, Copy, Landmark, LoaderCircle, QrCode } from 'lucide-svelte'
  import QRCode from 'qrcode'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import { buildSubscriptionTransferContent, formatVnd, generateBankQrString } from '@/lib/viet_qr'

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
    plan: PlanDefinition
    activeSubscribers?: number
  }

  const { paymentConfig, plan, activeSubscribers = 0 }: Props = $props()

  let transferReference = $state('')
  let qrCodeUrl = $state<string | null>(null)
  let isLoading = $state(false)
  let errorMessage = $state('')
  let copiedField = $state<string | null>(null)
  let renderVersion = 0

  const transferContent = $derived(
    buildSubscriptionTransferContent(plan.paymentContentPrefix, transferReference)
  )
  const qrPayload = $derived(
    generateBankQrString(
      paymentConfig.bankCode,
      paymentConfig.bankAccountNumber,
      plan.price.toString(),
      transferContent
    )
  )

  async function renderQrCode(currentVersion: number) {
    isLoading = true
    errorMessage = ''

    try {
      const svgString = await QRCode.toString(qrPayload, {
        type: 'svg',
        width: 320,
        margin: 1,
        color: {
          dark: '#111111',
          light: '#ffffff',
        },
      })

      if (currentVersion !== renderVersion) {
        return
      }

      qrCodeUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`
    } catch (error) {
      console.error('Failed to render subscription QR code', error)
      if (currentVersion === renderVersion) {
        errorMessage = 'Không thể dựng QR cho gói này.'
        qrCodeUrl = null
      }
    } finally {
      if (currentVersion === renderVersion) {
        isLoading = false
      }
    }
  }

  $effect(() => {
    if (!transferReference) {
      transferReference = `PERSONAL ${plan.shortName}`
    }
  })

  $effect(() => {
    renderVersion += 1
    const currentVersion = renderVersion
    void renderQrCode(currentVersion)
  })

  async function copyText(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value)
      copiedField = field
      window.setTimeout(() => {
        if (copiedField === field) {
          copiedField = null
        }
      }, 1500)
    } catch (error) {
      console.error('Failed to copy text', error)
    }
  }

  function copied(field: string): boolean {
    return copiedField === field
  }
</script>

<Card class="overflow-hidden border-primary/20">
  <CardHeader class="border-b bg-primary/5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <CardTitle class="flex items-center gap-2 text-xl">
            <QrCode class="h-5 w-5" />
            {plan.name}
          </CardTitle>
          <Badge variant="outline">{activeSubscribers} active</Badge>
        </div>
        <CardDescription>{plan.priceLabel}</CardDescription>
      </div>
      <Badge variant="secondary">DB plan: {plan.storagePlan}</Badge>
    </div>
  </CardHeader>

  <CardContent class="grid gap-6 pt-6 xl:grid-cols-[1.2fr_0.8fr]">
    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-border bg-muted/40 p-3">
          <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ngân hàng</p>
          <div class="mt-1 flex items-center gap-2 text-sm font-semibold">
            <Landmark class="h-4 w-4" />
            {paymentConfig.bankName}
          </div>
          <p class="mt-1 font-mono text-xs text-muted-foreground">{paymentConfig.bankCode}</p>
        </div>
        <div class="rounded-lg border border-border bg-muted/40 p-3">
          <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Số tiền</p>
          <p class="mt-1 text-lg font-bold">{formatVnd(plan.price)}</p>
          <p class="mt-1 text-xs text-muted-foreground">Gói cá nhân hàng tháng</p>
        </div>
      </div>

      <div class="space-y-2">
        <Label for={`transfer_ref_${plan.id}`}>Mã tham chiếu / username</Label>
        <Input
          id={`transfer_ref_${plan.id}`}
          bind:value={transferReference}
          maxlength={24}
          placeholder="duyettn3112"
        />
        <p class="text-xs text-muted-foreground">
          QR sẽ ghép thành nội dung chuyển khoản:
          <span class="font-semibold text-foreground"> {transferContent}</span>
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="rounded-lg border border-border bg-background p-3 text-left transition hover:bg-muted/40"
          onclick={() => {
            void copyText(paymentConfig.bankAccountNumber, `account_${plan.id}`)
          }}
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tài khoản nhận</p>
            {#if copied(`account_${plan.id}`)}
              <Check class="h-4 w-4 text-emerald-600" />
            {:else}
              <Copy class="h-4 w-4 text-muted-foreground" />
            {/if}
          </div>
          <p class="mt-1 font-mono text-base font-bold">{paymentConfig.bankAccountNumber}</p>
          <p class="mt-1 text-xs text-muted-foreground">{paymentConfig.bankAccountName}</p>
        </button>

        <button
          type="button"
          class="rounded-lg border border-border bg-background p-3 text-left transition hover:bg-muted/40"
          onclick={() => {
            void copyText(transferContent, `content_${plan.id}`)
          }}
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Nội dung CK</p>
            {#if copied(`content_${plan.id}`)}
              <Check class="h-4 w-4 text-emerald-600" />
            {:else}
              <Copy class="h-4 w-4 text-muted-foreground" />
            {/if}
          </div>
          <p class="mt-1 text-sm font-bold">{transferContent}</p>
          <p class="mt-1 text-xs text-muted-foreground">Dùng khi nâng cấp cá nhân Pro / Pro Max</p>
        </button>
      </div>

      <div class="rounded-lg border border-dashed border-border bg-muted/20 p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Quyền lợi chính</p>
        <div class="mt-3 flex flex-wrap gap-2">
          {#each plan.features as feature}
            <Badge variant="outline">{feature}</Badge>
          {/each}
        </div>
      </div>
    </div>

    <div class="flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-4 shadow-neo-sm">
      {#if isLoading}
        <div class="flex min-h-72 flex-col items-center justify-center gap-2 text-muted-foreground">
          <LoaderCircle class="h-10 w-10 animate-spin" />
          <p class="text-sm">Đang dựng QR...</p>
        </div>
      {:else if errorMessage}
        <div class="flex min-h-72 items-center justify-center px-6 text-center text-sm text-destructive">
          {errorMessage}
        </div>
      {:else if qrCodeUrl}
        <div class="flex w-full flex-col items-center">
          <img src={qrCodeUrl} alt={`QR thanh toán ${plan.name}`} class="h-72 w-72 max-w-full" />
          <Button
            variant="outline"
            class="mt-4 w-full"
            onclick={() => {
              void copyText(qrPayload, `payload_${plan.id}`)
            }}
          >
            {#if copied(`payload_${plan.id}`)}
              <Check class="mr-2 h-4 w-4" />
              Đã sao chép payload QR
            {:else}
              <Copy class="mr-2 h-4 w-4" />
              Sao chép payload QR
            {/if}
          </Button>
        </div>
      {/if}
    </div>
  </CardContent>
</Card>
