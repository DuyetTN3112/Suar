<script lang="ts">
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Link } from '@inertiajs/svelte'

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
</script>

<AdminLayout title="Chi tiết tài khoản hệ thống">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">{user.username}</h1>
        <p class="mt-1 text-slate-600">Thông tin tài khoản ở cấp platform.</p>
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
              <dt class="text-sm font-medium text-slate-600">User ID</dt>
              <dd class="mt-1 text-sm text-slate-900 font-mono">{user.id}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Username</dt>
              <dd class="mt-1 text-sm text-slate-900">{user.username}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Email</dt>
              <dd class="mt-1 text-sm text-slate-900">{user.email || 'Chưa cung cấp'}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Vai trò hệ thống</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                  {user.system_role === 'superadmin' ? 'bg-red-100 text-red-700' :
                   user.system_role === 'system_admin' ? 'bg-orange-100 text-orange-700' :
                   'bg-slate-100 text-slate-700'}">
                  {roleLabel(user.system_role)}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Trạng thái tài khoản</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                  {user.status === 'active' ? 'bg-green-100 text-green-700' :
                   user.status === 'suspended' ? 'bg-red-100 text-red-700' :
                   'bg-slate-100 text-slate-700'}">
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
              <dt class="text-sm font-medium text-slate-600">Tổ chức đang chọn</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {#if user.current_organization_id}
                  <Link href="/admin/organizations/{user.current_organization_id}" class="text-blue-600 hover:underline">
                    {user.current_organization_id}
                  </Link>
                {:else}
                  <span class="text-slate-500">Chưa có ngữ cảnh tổ chức</span>
                {/if}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Loại tài khoản làm việc</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                  {user.is_freelancer ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}">
                  {user.is_freelancer ? 'Freelancer' : 'Người dùng thường'}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Ngày tạo</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {new Date(user.created_at).toLocaleString('vi-VN')}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Cập nhật gần nhất</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {new Date(user.updated_at).toLocaleString('vi-VN')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Ghi chú vận hành</CardTitle>
        <CardDescription>Một số thao tác nhạy cảm vẫn nên đi qua flow backend hoặc màn admin chuyên biệt khác.</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-2">
          <Link href="/admin/users">
            <Button variant="outline">Quay lại danh sách</Button>
          </Link>
          {#if user.current_organization_id}
            <Link href="/admin/organizations/{user.current_organization_id}">
              <Button variant="outline">Mở tổ chức hiện tại</Button>
            </Link>
          {/if}
        </div>
        <p class="mt-2 text-xs text-slate-500">
          Frontend hiện ưu tiên hiển thị đúng ngữ cảnh 3 namespace. Các thao tác như đổi role hệ thống hoặc suspend nên đi bằng flow admin thật thay vì nút giả.
        </p>
      </CardContent>
    </Card>
  </div>
</AdminLayout>
