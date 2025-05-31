<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
</script>

<svelte:head>
  <title>Cài đặt tài khoản</title>
</svelte:head>

<AppLayout title="Cài đặt tài khoản">
  <div class="container py-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Cài đặt tài khoản</h1>
    </div>

    <div class="mt-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Đăng nhập OAuth</CardTitle>
          <CardDescription>
            Ứng dụng này sử dụng OAuth (Google/GitHub) để đăng nhập. Không cần mật khẩu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-center py-8 text-muted-foreground">
            Bạn đã đăng nhập thông qua nhà cung cấp OAuth.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giao diện</CardTitle>
          <CardDescription>
            Tùy chỉnh giao diện người dùng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-center py-12 text-muted-foreground">
            Các tùy chọn giao diện sẽ xuất hiện ở đây
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</AppLayout>
