<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import Button from '@/components/ui/button.svelte'
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { AlertTriangle, ArrowLeft } from 'lucide-svelte'

  interface Props {
    error: string
  }

  const { error }: Props = $props()
  const { t } = useTranslation()
</script>

<svelte:head>
  <title>Lỗi</title>
</svelte:head>

<AppLayout title="Lỗi">
  <div class="p-4 sm:p-6 flex items-center justify-center min-h-[60vh]">
    <Card class="border-2 border-destructive/50 shadow-neo max-w-md w-full">
      <CardHeader class="text-center">
        <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border-2 border-destructive/30">
          <AlertTriangle class="h-7 w-7 text-destructive" />
        </div>
        <CardTitle class="text-xl font-bold text-destructive">Đã xảy ra lỗi</CardTitle>
      </CardHeader>
      <CardContent class="text-center">
        <p class="text-sm text-muted-foreground font-bold">{error}</p>
      </CardContent>
      <CardFooter class="flex justify-center border-t-2 border-border pt-6">
        <Button class="font-bold" onclick={() => router.visit('/conversations')}>
          <ArrowLeft class="h-4 w-4 mr-2" />
          Quay lại hội thoại
        </Button>
      </CardFooter>
    </Card>
  </div>
</AppLayout>
