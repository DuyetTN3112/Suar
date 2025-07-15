<script lang="ts">
  import { page, Link } from '@inertiajs/svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'

  interface AuthUser {
    username?: string
    email?: string
    auth_method?: string | null
  }

  interface PageProps {
    auth?: {
      user?: AuthUser
    }
  }

  const props = $derived($page.props as unknown as PageProps)
  const authUser = $derived(props.auth?.user)

  function authMethodLabel(authMethod?: string | null): string {
    switch (authMethod) {
      case undefined:
      case null:
        return 'OAuth'
      case 'google':
        return 'Google'
      case 'github':
        return 'GitHub'
      default:
        return 'OAuth'
    }
  }
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
          <CardTitle>Đăng nhập và danh tính</CardTitle>
          <CardDescription>
            SUAR chỉ dùng OAuth qua Google hoặc GitHub. Không có luồng email/password và cũng không còn Firebase.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center gap-2">
            <Badge variant="outline">{authMethodLabel(authUser?.auth_method)}</Badge>
            <span class="text-sm text-muted-foreground">
              {authUser?.email ?? 'Email chưa được đồng bộ lên giao diện này'}
            </span>
          </div>
          <p class="text-sm text-muted-foreground">
            Tài khoản hiện tại thuộc về người dùng cá nhân. Các gói sản phẩm công khai của SUAR áp dụng ở cấp user account, không phải organization package.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gói tài khoản</CardTitle>
          <CardDescription>
            Product truth hiện tại chỉ có 2 gói trả phí cho từng tài khoản: <strong>Pro</strong> và <strong>Pro Max</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-lg border p-4">
              <p class="text-sm font-semibold text-muted-foreground">Base</p>
              <p class="mt-2 text-sm">Dùng hệ thống bình thường, tích lũy dữ liệu thực qua task và review.</p>
            </div>
            <div class="rounded-lg border p-4">
              <p class="text-sm font-semibold text-muted-foreground">Pro</p>
              <p class="mt-2 text-sm">Tăng lợi thế hiển thị và ranking cho tài khoản đã có năng lực thực tế.</p>
            </div>
            <div class="rounded-lg border p-4">
              <p class="text-sm font-semibold text-muted-foreground">Pro Max</p>
              <p class="mt-2 text-sm">Dành cho trường hợp muốn bù thêm lợi thế khi dữ liệu thực tế còn ít.</p>
            </div>
          </div>
          <p class="text-sm text-muted-foreground">
            Frontend batch này mới chốt product truth và điều hướng. Trang thanh toán/public billing riêng cho user package vẫn cần được triển khai tiếp ở đợt sau.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đi tới các màn liên quan</CardTitle>
          <CardDescription>
            Hồ sơ, review, task và snapshot đang là các phần ảnh hưởng trực tiếp tới giá trị của tài khoản.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-3">
          <Link href="/profile">
            <Button variant="outline">Hồ sơ năng lực</Button>
          </Link>
          <Link href="/my-reviews">
            <Button variant="outline">Review của tôi</Button>
          </Link>
          <Link href="/my-applications">
            <Button variant="outline">Đơn ứng tuyển</Button>
          </Link>
          <Link href="/marketplace/tasks">
            <Button variant="outline">Mở chợ việc</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  </div>
</AppLayout>
