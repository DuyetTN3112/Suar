<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'

  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

  interface User {
    id: string
    username: string
    email: string | null
    system_role: string
    status: string
    current_organization_id: string | null
    is_freelancer: boolean
    created_at: string
    updated_at: string
  }

  interface Props {
    user: User
  }

  const { user }: Props = $props()

  const userActionPath = $derived(
    user.status === 'suspended'
      ? `/admin/users/${user.id}/activate`
      : `/admin/users/${user.id}/suspend`
  )
  const userActionLabel = $derived(
    user.status === 'suspended' ? 'Khôi phục tài khoản' : 'Tạm khóa tài khoản'
  )
  const userActionTone = $derived(user.status === 'suspended' ? 'outline' : 'destructive')
  const auditLogsHref = $derived(`/admin/audit-logs?user_id=${encodeURIComponent(user.id)}`)

  function roleLabel(role: string): string {
    switch (role) {
      case 'superadmin':
        return 'Superadmin'
      case 'system_admin':
        return 'Admin hệ thống'
      default:
        return 'Người dùng thường'
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Hoạt động'
      case 'suspended':
        return 'Tạm khóa'
      case 'pending':
        return 'Chờ duyệt'
      default:
        return status
    }
  }

  function roleClass(role: string): string {
    switch (role) {
      case 'superadmin':
        return 'rounded-full px-3 py-1 text-xs font-medium bg-fuchsia-600 text-white'
      case 'system_admin':
        return 'rounded-full px-3 py-1 text-xs font-medium bg-primary text-white'
      default:
        return 'border border-border rounded-full px-3 py-1 text-xs font-medium bg-white text-foreground'
    }
  }

  function statusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'rounded-full px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground'
      case 'suspended':
        return 'rounded-full px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground'
      case 'pending':
        return 'rounded-full px-3 py-1 text-xs font-medium bg-primary text-white'
      default:
        return 'border border-border rounded-full px-3 py-1 text-xs font-medium bg-white text-foreground'
    }
  }

  function handleUserStatusAction() {
    router.post(
      userActionPath,
      {
        _method: 'PUT',
      },
      {
        preserveScroll: true,
      }
    )
  }
</script>

  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Admin / User Detail</p>
        <h1 class="text-4xl font-bold tracking-tight">{user.username}</h1>
        <p class="mt-2 text-sm text-muted-foreground">Thông tin tài khoản ở cấp platform.</p>
      </div>
      <Link href="/admin/users">
        <Button variant="outline">Quay lại danh sách</Button>
      </Link>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
          <CardDescription>Các thuộc tính cơ bản của người dùng</CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-muted-foreground">User ID</dt>
              <dd class="mt-1 text-sm font-mono text-foreground">{user.id}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Username</dt>
              <dd class="mt-1 text-sm text-foreground">{user.username}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Email</dt>
              <dd class="mt-1 text-sm text-foreground">{user.email ?? 'Chưa cung cấp'}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Vai trò hệ thống</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {roleClass(user.system_role)}">
                  {roleLabel(user.system_role)}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Trạng thái tài khoản</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {statusClass(user.status)}">
                  {statusLabel(user.status)}
                </span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ngữ cảnh và phân loại</CardTitle>
          <CardDescription>Trạng thái liên quan tới freelancer và tổ chức hiện tại</CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Tổ chức đang chọn</dt>
              <dd class="mt-1 text-sm text-foreground">
                {#if user.current_organization_id}
                  <Link href="/admin/organizations/{user.current_organization_id}" class="text-foreground hover:underline">
                    {user.current_organization_id}
                  </Link>
                {:else}
                  <span class="text-muted-foreground">Chưa có ngữ cảnh tổ chức</span>
                {/if}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Loại tài khoản làm việc</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {user.is_freelancer ? 'rounded-full px-3 py-1 text-xs font-medium bg-fuchsia-600 text-white' : 'border border-border rounded-full px-3 py-1 text-xs font-medium bg-white text-foreground'}">
                  {user.is_freelancer ? 'Freelancer' : 'Người dùng thường'}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Ngày tạo</dt>
              <dd class="mt-1 text-sm text-foreground">
                {new Date(user.created_at).toLocaleString('vi-VN')}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Cập nhật gần nhất</dt>
              <dd class="mt-1 text-sm text-foreground">
                {new Date(user.updated_at).toLocaleString('vi-VN')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Điều khiển vận hành</CardTitle>
        <CardDescription>Thao tác trực tiếp ở cấp platform và truy vết audit cho tài khoản này.</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-2">
          <Link href="/admin/users">
            <Button variant="outline">Quay lại danh sách</Button>
          </Link>
          <Button variant={userActionTone} onclick={handleUserStatusAction}>
            {userActionLabel}
          </Button>
          <a href={auditLogsHref}>
            <Button variant="outline">Mở audit logs</Button>
          </a>
          {#if user.current_organization_id}
            <Link href="/admin/organizations/{user.current_organization_id}">
              <Button variant="outline">Mở tổ chức hiện tại</Button>
            </Link>
          {/if}
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          Hành động khóa hoặc khôi phục dùng flow admin thật và có thể đối chiếu lại bằng audit log đã lọc theo user.
        </p>
      </CardContent>
    </Card>
  </div>
