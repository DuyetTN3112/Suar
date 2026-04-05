<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import { Link } from '@inertiajs/svelte'

  interface User {
    id: string
    username: string
    email: string | null
    system_role: string
    status: string
    created_at: string
  }

  interface Props {
    users: User[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
      systemRole?: string
      status?: string
    }
  }

  const { users, meta, filters }: Props = $props()
  let searchValue = $state('')

  $effect(() => {
    searchValue = filters.search || ''
  })

  function handleSearch(event: SubmitEvent) {
    event.preventDefault()
    router.get(
      '/admin/users',
      {
        search: searchValue || undefined,
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

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
        return 'neo-pill-magenta'
      case 'system_admin':
        return 'neo-pill-orange'
      default:
        return 'neo-pill-soft'
    }
  }

  function statusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'neo-pill-blue'
      case 'suspended':
        return 'neo-pill-ink'
      case 'pending':
        return 'neo-pill-orange'
      default:
        return 'neo-pill-soft'
    }
  }
</script>

  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="neo-kicker">Admin / Users</p>
        <h1 class="text-4xl font-bold tracking-tight">Người dùng hệ thống</h1>
        <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
          Bề mặt này dành cho system admin. Quản trị thành viên trong từng tổ chức đã được tách sang namespace <code>/org</code>.
        </p>
      </div>
    </div>

    <Card class="neo-panel">
      <CardHeader>
        <CardTitle>Tất cả tài khoản ({meta.total.toLocaleString()})</CardTitle>
        <CardDescription>
          Dùng màn này để rà hệ thống ở cấp platform, không dùng để quản trị team cụ thể.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="mb-4 flex flex-col gap-3 md:flex-row" onsubmit={handleSearch}>
          <Input
            bind:value={searchValue}
            class="max-w-md"
            placeholder="Tìm theo username hoặc email..."
          />
          <Button type="submit" variant="outline">Tìm kiếm</Button>
        </form>

        <div class="overflow-x-auto">
          <table class="neo-data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Vai trò hệ thống</th>
                <th>Trạng thái</th>
                <th>Ngày tham gia</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {#each users as user}
                <tr class="text-sm">
                  <td class="font-medium">{user.username}</td>
                  <td class="text-muted-foreground">{user.email || '-'}</td>
                  <td>
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {roleClass(user.system_role)}">
                      {roleLabel(user.system_role)}
                    </span>
                  </td>
                  <td>
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {statusClass(user.status)}">
                      {statusLabel(user.status)}
                    </span>
                  </td>
                  <td class="text-muted-foreground">{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <Link href="/admin/users/{user.id}">
                      <Button variant="ghost" size="sm">Xem chi tiết</Button>
                    </Link>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if users.length === 0}
          <div class="neo-empty-state">
            Không có tài khoản nào khớp bộ lọc hiện tại.
          </div>
        {/if}

        {#if meta.lastPage > 1}
          <div class="mt-4 flex items-center justify-between">
            <p class="text-sm text-muted-foreground">
              Trang {meta.currentPage} / {meta.lastPage}
            </p>
            <div class="flex gap-2">
              {#if meta.currentPage > 1}
                <Link href="/admin/users?page={meta.currentPage - 1}">
                  <Button variant="outline" size="sm">Trước</Button>
                </Link>
              {/if}
              {#if meta.currentPage < meta.lastPage}
                <Link href="/admin/users?page={meta.currentPage + 1}">
                  <Button variant="outline" size="sm">Sau</Button>
                </Link>
              {/if}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
