<script lang="ts">
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Link } from '@inertiajs/svelte'

  interface Member {
    user_id: string
    username: string
    email: string | null
    org_role: string
    status: string
    created_at: string
  }

  interface Props {
    members: Member[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
      orgRole?: string
      status?: string
    }
  }

  const { members, meta }: Props = $props()

  function roleLabel(role: string): string {
    switch (role) {
      case 'org_owner':
        return 'Owner'
      case 'org_admin':
        return 'Admin'
      case 'org_member':
        return 'Member'
      default:
        return role
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'approved':
        return 'Đã duyệt'
      case 'pending':
        return 'Chờ duyệt'
      case 'rejected':
        return 'Từ chối'
      default:
        return status
    }
  }
</script>

<OrganizationLayout title="Thành viên tổ chức">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Thành viên tổ chức</h1>
        <p class="mt-1 text-slate-600">Danh sách thành viên trong ngữ cảnh tổ chức hiện tại. Flow mời người và duyệt yêu cầu đã tách riêng sang các màn chuyên biệt.</p>
      </div>
      <div class="flex gap-2">
        <Link href="/org/invitations/requests">
          <Button variant="outline">Yêu cầu tham gia</Button>
        </Link>
        <Link href="/org/invitations/invitations">
          <Button>Mời thành viên</Button>
        </Link>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Tất cả thành viên ({meta.total.toLocaleString()})</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="border-b">
              <tr class="text-left text-sm text-slate-600">
                <th class="pb-3 font-medium">Thành viên</th>
                <th class="pb-3 font-medium">Email</th>
                <th class="pb-3 font-medium">Vai trò</th>
                <th class="pb-3 font-medium">Trạng thái</th>
                <th class="pb-3 font-medium">Ngày tham gia</th>
                <th class="pb-3 font-medium">Đi tới</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              {#each members as member}
                <tr class="text-sm">
                  <td class="py-3 font-medium">{member.username}</td>
                  <td class="py-3 text-slate-600">{member.email || '-'}</td>
                  <td class="py-3">
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      {member.org_role === 'org_owner' ? 'bg-purple-100 text-purple-700' :
                       member.org_role === 'org_admin' ? 'bg-blue-100 text-blue-700' :
                       'bg-slate-100 text-slate-700'}">
                      {roleLabel(member.org_role)}
                    </span>
                  </td>
                  <td class="py-3">
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      {member.status === 'approved' ? 'bg-green-100 text-green-700' :
                       member.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                       'bg-red-100 text-red-700'}">
                      {statusLabel(member.status)}
                    </span>
                  </td>
                  <td class="py-3 text-slate-600">{new Date(member.created_at).toLocaleDateString('vi-VN')}</td>
                  <td class="py-3">
                    <Link href="/users/{member.user_id}">
                      <Button variant="ghost" size="sm">Xem user</Button>
                    </Link>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if members.length === 0}
          <div class="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-slate-500">
            Chưa có thành viên nào trong tổ chức này.
          </div>
        {/if}

        {#if meta.lastPage > 1}
          <div class="mt-4 flex items-center justify-between">
            <p class="text-sm text-slate-600">
              Trang {meta.currentPage} / {meta.lastPage}
            </p>
            <div class="flex gap-2">
              {#if meta.currentPage > 1}
                <Link href="/org/members?page={meta.currentPage - 1}">
                  <Button variant="outline" size="sm">Trước</Button>
                </Link>
              {/if}
              {#if meta.currentPage < meta.lastPage}
                <Link href="/org/members?page={meta.currentPage + 1}">
                  <Button variant="outline" size="sm">Sau</Button>
                </Link>
              {/if}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
