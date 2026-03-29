<script lang="ts">
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Link } from '@inertiajs/svelte'

  interface Organization {
    id: string
    name: string
    slug: string
    description: string | null
    plan: string | null
    partner_type: string | null
    created_at: string
    updated_at: string
    owner: {
      id: string
      username: string
      email: string | null
    }
    stats: {
      usersCount: number
      projectsCount: number
    }
  }

  interface Props {
    organization: Organization
  }

  const { organization }: Props = $props()
</script>

<AdminLayout title="Chi tiết tổ chức">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">{organization.name}</h1>
        <p class="text-slate-600 mt-1">Thông tin tổng quan của tổ chức ở góc nhìn system admin.</p>
      </div>
      <Link href="/admin/organizations">
        <Button variant="outline">Quay lại danh sách</Button>
      </Link>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin tổ chức</CardTitle>
          <CardDescription>Thông tin nền tảng và dữ liệu schema liên quan</CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-slate-600">Organization ID</dt>
              <dd class="mt-1 text-sm text-slate-900 font-mono">{organization.id}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Tên</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.name}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Slug</dt>
              <dd class="mt-1 text-sm text-slate-900 font-mono">{organization.slug}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Mô tả</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.description || 'Chưa có mô tả'}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Field legacy trong schema</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                  {organization.plan || 'null'}
                </span>
                <p class="mt-2 text-xs text-slate-500">
                  `organizations.plan` vẫn còn trong schema, nhưng hiện không nên hiểu là gói public cho organization.
                </p>
              </dd>
            </div>
            {#if organization.partner_type}
              <div>
                <dt class="text-sm font-medium text-slate-600">Partner Type</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700">
                    {organization.partner_type}
                  </span>
                </dd>
              </div>
            {/if}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Owner và thống kê</CardTitle>
          <CardDescription>Người sở hữu hiện tại và mức sử dụng cơ bản</CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-slate-600">Owner</dt>
              <dd class="mt-1">
                <Link href={`/admin/users/${organization.owner.id}`} class="text-blue-600 hover:underline">
                  {organization.owner.username}
                </Link>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Email owner</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.owner.email || 'Chưa cung cấp'}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Thành viên</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.stats.usersCount} người</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Dự án</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.stats.projectsCount} dự án</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Tạo lúc</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {new Date(organization.created_at).toLocaleString('vi-VN')}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Cập nhật gần nhất</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {new Date(organization.updated_at).toLocaleString('vi-VN')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Ghi chú vận hành</CardTitle>
        <CardDescription>Các action hệ thống mở rộng chưa nằm trong batch frontend hiện tại</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-2 text-sm text-slate-600">
          <p>Frontend hiện ưu tiên phần quan sát và kiểm tra dữ liệu thay vì dựng giả các nút action chưa có flow hoàn chỉnh.</p>
          <p>Nếu cần quản trị sâu hơn, system admin nên điều hướng sang user list, audit logs hoặc review moderation.</p>
        </div>
      </CardContent>
    </Card>
  </div>
</AdminLayout>
