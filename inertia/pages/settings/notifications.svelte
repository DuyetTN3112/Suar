<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
</script>

<svelte:head>
  <title>Cài đặt thông báo</title>
</svelte:head>

<AppLayout title="Cài đặt thông báo">
  <div class="container py-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Cài đặt thông báo</h1>
      <Button variant="outline">Lưu thay đổi</Button>
    </div>

    <div class="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Tùy chọn thông báo</CardTitle>
          <CardDescription>
            Tùy chỉnh cách bạn nhận thông báo từ hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-center py-12 text-muted-foreground">
            Các tùy chọn thông báo sẽ xuất hiện ở đây
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</AppLayout>
