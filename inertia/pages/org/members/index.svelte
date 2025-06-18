<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import { formatRoleLabel } from '@/lib/access_ui'
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
    roleOptions: Array<{
      value: string
      label: string
    }>
  }

  const { members, meta, roleOptions }: Props = $props()

  let roleDrafts = $state<Record<string, string>>({})
  let savingMemberId = $state<string | null>(null)
  let roleMessage = $state('')
  let roleError = $state('')

  function getCsrfToken(): string {
    return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  function roleLabel(role: string): string {
    return roleOptions.find((option) => option.value === role)?.label ?? formatRoleLabel(role)
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

  function roleClass(role: string): string {
    switch (role) {
      case 'org_owner':
        return 'neo-pill-magenta'
      case 'org_admin':
        return 'neo-pill-blue'
      case 'hr':
      case 'cto':
      case 'project_manager':
      case 'pm':
        return 'neo-pill-orange'
      default:
        return 'neo-pill-soft'
    }
  }

  function statusClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'neo-pill-blue'
      case 'pending':
        return 'neo-pill-orange'
      case 'rejected':
        return 'neo-pill-ink'
      default:
        return 'neo-pill-soft'
    }
  }

  function selectedRole(member: Member): string {
    return roleDrafts[member.user_id] ?? member.org_role
  }

  function canEditRole(member: Member): boolean {
    return member.status === 'approved' && member.org_role !== 'org_owner'
  }

  async function saveRole(member: Member) {
    if (!canEditRole(member)) {
      return
    }

    const nextRole = selectedRole(member)
    if (nextRole === member.org_role) {
      roleMessage = 'Không có thay đổi vai trò nào cần lưu.'
      roleError = ''
      return
    }

    savingMemberId = member.user_id
    roleMessage = ''
    roleError = ''

    try {
      const response = await fetch(`/org/members/${member.user_id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          org_role: nextRole,
        }),
      })

      const payload = (await response.json()) as {
        success?: boolean
        message?: string
      }

      if (!response.ok || !payload.success) {
        roleError = payload.message || 'Không thể cập nhật vai trò.'
        return
      }

      roleMessage = payload.message || 'Đã cập nhật vai trò.'
      router.visit(`${window.location.pathname}${window.location.search}`, {
        preserveScroll: true,
        preserveState: false,
        replace: true,
      })
    } catch (error) {
      console.error('Failed to update member role', error)
      roleError = 'Không thể cập nhật vai trò.'
    } finally {
      savingMemberId = null
    }
  }
</script>

<OrganizationLayout title="Thành viên tổ chức">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="neo-kicker">Organization / Members</p>
        <h1 class="text-4xl font-bold tracking-tight">Thành viên tổ chức</h1>
        <p class="mt-2 max-w-3xl text-sm text-muted-foreground">Danh sách thành viên trong ngữ cảnh tổ chức hiện tại. Flow mời người và duyệt yêu cầu đã tách riêng sang các màn chuyên biệt.</p>
      </div>
      <div class="flex gap-2">
        <Link href="/org/departments">
          <Button variant="outline">Phòng ban</Button>
        </Link>
        <Link href="/org/roles">
          <Button variant="outline">Vai trò</Button>
        </Link>
        <Link href="/org/permissions">
          <Button variant="outline">Quyền hạn</Button>
        </Link>
        <Link href="/org/invitations/requests">
          <Button variant="outline">Yêu cầu tham gia</Button>
        </Link>
        <Link href="/org/invitations/invitations">
          <Button>Mời thành viên</Button>
        </Link>
      </div>
    </div>

    <Card class="neo-panel">
      <CardHeader>
        <CardTitle>Tất cả thành viên ({meta.total.toLocaleString()})</CardTitle>
      </CardHeader>
      <CardContent>
        {#if roleError}
          <p class="mb-4 text-sm text-destructive">{roleError}</p>
        {/if}
        {#if roleMessage}
          <p class="mb-4 text-sm text-emerald-700">{roleMessage}</p>
        {/if}
        <div class="overflow-x-auto">
          <table class="neo-data-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tham gia</th>
                <th>Đi tới</th>
              </tr>
            </thead>
            <tbody>
              {#each members as member}
                <tr class="text-sm">
                  <td class="font-medium">{member.username}</td>
                  <td class="text-muted-foreground">{member.email || '-'}</td>
                  <td>
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {roleClass(member.org_role)}">
                      {roleLabel(member.org_role)}
                    </span>
                  </td>
                  <td>
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {statusClass(member.status)}">
                      {statusLabel(member.status)}
                    </span>
                  </td>
                  <td class="text-muted-foreground">{new Date(member.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <div class="flex flex-wrap items-center gap-2">
                      {#if canEditRole(member)}
                        <Select
                          value={selectedRole(member)}
                          onValueChange={(value: string) => {
                            roleDrafts = {
                              ...roleDrafts,
                              [member.user_id]: value,
                            }
                            roleError = ''
                            roleMessage = ''
                          }}
                        >
                          <SelectTrigger class="min-w-40">
                            <span>{roleLabel(selectedRole(member))}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {#each roleOptions as option}
                              <SelectItem value={option.value}>{option.label}</SelectItem>
                            {/each}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={savingMemberId === member.user_id || selectedRole(member) === member.org_role}
                          onclick={() => {
                            void saveRole(member)
                          }}
                        >
                          {savingMemberId === member.user_id ? 'Đang lưu...' : 'Lưu role'}
                        </Button>
                      {:else}
                        <Badge variant="outline">Read only</Badge>
                      {/if}

                      <Link href="/users/{member.user_id}">
                        <Button variant="ghost" size="sm">Xem user</Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if members.length === 0}
          <div class="neo-empty-state">
            Chưa có thành viên nào trong tổ chức này.
          </div>
        {/if}

        {#if meta.lastPage > 1}
          <div class="mt-4 flex items-center justify-between">
            <p class="text-sm text-muted-foreground">
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
