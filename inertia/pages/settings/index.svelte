<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import SettingsSidebar from './components/settings_sidebar.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
</script>

<svelte:head>
  <title>Cài đặt</title>
</svelte:head>

<AppLayout title="Cài đặt">
  <div class="container py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Cài đặt</h1>
    </div>

    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-3">
        <SettingsSidebar currentPath="/settings" />
      </div>

      <div class="col-span-9">
        <Card>
          <CardHeader>
            <CardTitle>Chào mừng đến với Cài đặt</CardTitle>
            <CardDescription>
              Quản lý hồ sơ, tài khoản và tùy chọn giao diện của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-muted-foreground">
              Chọn một mục từ thanh bên để bắt đầu tùy chỉnh cài đặt của bạn.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</AppLayout>
