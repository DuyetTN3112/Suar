<script lang="ts">
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

  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="neo-kicker">Admin / Organization Detail</p>
        <h1 class="text-4xl font-bold tracking-tight">{organization.name}</h1>
        <p class="mt-2 text-sm text-muted-foreground">Thông tin tổng quan của tổ chức ở góc nhìn system admin.</p>
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
              <dt class="text-sm font-medium text-muted-foreground">Organization ID</dt>
              <dd class="mt-1 text-sm font-mono text-foreground">{organization.id}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Tên</dt>
              <dd class="mt-1 text-sm text-foreground">{organization.name}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Slug</dt>
              <dd class="mt-1 text-sm font-mono text-foreground">{organization.slug}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Mô tả</dt>
              <dd class="mt-1 text-sm text-foreground">{organization.description || 'Chưa có mô tả'}</dd>
            </div>
            {#if organization.partner_type}
              <div>
                <dt class="text-sm font-medium text-muted-foreground">Partner Type</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide neo-pill-orange">
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
              <dt class="text-sm font-medium text-muted-foreground">Owner</dt>
              <dd class="mt-1">
                <Link href={`/admin/users/${organization.owner.id}`} class="neo-text-blue hover:underline">
                  {organization.owner.username}
                </Link>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Email owner</dt>
              <dd class="mt-1 text-sm text-foreground">{organization.owner.email || 'Chưa cung cấp'}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Thành viên</dt>
              <dd class="mt-1 text-sm text-foreground">{organization.stats.usersCount} người</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Dự án</dt>
              <dd class="mt-1 text-sm text-foreground">{organization.stats.projectsCount} dự án</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Tạo lúc</dt>
              <dd class="mt-1 text-sm text-foreground">
                {new Date(organization.created_at).toLocaleString('vi-VN')}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Cập nhật gần nhất</dt>
              <dd class="mt-1 text-sm text-foreground">
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
        <div class="space-y-2 text-sm text-muted-foreground">
          <p>Frontend hiện ưu tiên phần quan sát và kiểm tra dữ liệu thay vì dựng giả các nút action chưa có flow hoàn chỉnh.</p>
          <p>Nếu cần quản trị sâu hơn, system admin nên điều hướng sang user list, audit logs hoặc review moderation.</p>
        </div>
      </CardContent>
    </Card>
  </div>
