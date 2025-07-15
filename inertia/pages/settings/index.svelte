<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import { SETTINGS_CARDS as settingsCards } from '@/constants/settings'
  import AppLayout from '@/layouts/app_layout.svelte'
</script>

<svelte:head>
  <title>Cài đặt</title>
</svelte:head>

<AppLayout title="Cài đặt">
  <div class="container py-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <div class="space-y-2">
        <p class="neo-kicker">Settings</p>
        <h1 class="text-4xl font-bold tracking-tight">Cài đặt</h1>
        <p class="max-w-3xl text-sm text-muted-foreground">
          Toàn bộ mục con đã được đưa về sidebar chính. Màn này chỉ còn là landing page để đi nhanh tới từng khu vực.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each settingsCards as item}
          <Link href={item.href} class="neo-surface-soft p-5 transition-transform hover:-translate-y-0.5">
            <p class="neo-kicker">Open</p>
            <h2 class="mt-3 text-2xl font-bold">{item.title}</h2>
            <p class="mt-2 text-sm text-muted-foreground">{item.description}</p>
          </Link>
        {/each}
      </div>

      <Card class="neo-panel">
        <CardHeader>
          <CardTitle>Chào mừng đến với Cài đặt</CardTitle>
          <CardDescription>
            Điều hướng giờ nằm ở sidebar chính để không còn double navigation trong một màn hình.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-muted-foreground">
            Chọn một mục từ sidebar chính hoặc từ các thẻ phía trên để bắt đầu tùy chỉnh.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</AppLayout>
