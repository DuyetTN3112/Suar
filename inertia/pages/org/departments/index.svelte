<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { formatRoleLabel } from '@/lib/access_ui'

  interface RoleEntry {
    code: string
    label: string
    description: string
    permissionCount: number
    isBuiltIn: boolean
    memberCount: number
  }

  interface DepartmentEntry {
    id: string
    name: string
    description: string
    focus: string
    suggestedRoles: string[]
    matchedRoles: string[]
    estimatedHeadcount: number
  }

  interface Props {
    organization: {
      id: string
      name: string
      slug: string
      description: string | null
    }
    summary: {
      approvedMembers: number
      pendingInvitations: number
      builtInRoleCount: number
      customRoleCount: number
    }
    organizationRoles: RoleEntry[]
    departments: DepartmentEntry[]
  }

  const { organization, summary, organizationRoles, departments }: Props = $props()
</script>

<OrganizationLayout title="Phòng ban tổ chức">
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="neo-kicker">Organization / Departments</p>
        <h1 class="text-4xl font-bold tracking-tight">Cấu trúc phòng ban</h1>
        <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
          Màn planning cho tổ chức: gom role theo cụm Leadership, People, Delivery, Engineering để sau này nối tiếp sang department thật khi schema lưu trữ sẵn sàng.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/org/roles" class="neo-surface-soft px-3 py-2 text-sm font-bold">Vai trò</a>
        <a href="/org/permissions" class="neo-surface-soft px-3 py-2 text-sm font-bold">Quyền hạn</a>
        <a href="/org/members" class="neo-surface-soft px-3 py-2 text-sm font-bold">Thành viên</a>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-xl font-bold">{organization.name}</div>
          <p class="mt-1 text-xs text-muted-foreground">{organization.slug}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Thành viên duyệt</CardTitle>
        </CardHeader>
        <CardContent><div class="text-3xl font-bold">{summary.approvedMembers}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Built-in roles</CardTitle>
        </CardHeader>
        <CardContent><div class="text-3xl font-bold">{summary.builtInRoleCount}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Custom roles</CardTitle>
        </CardHeader>
        <CardContent><div class="text-3xl font-bold">{summary.customRoleCount}</div></CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Ghi chú triển khai</CardTitle>
        <CardDescription>
          Screen này chưa ghi xuống database riêng cho department. Hiện tại nó bám theo role đang có để giúp owner/admin tổ chức team trước khi khóa schema.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        {#each organizationRoles as role}
          <Badge variant="outline">{role.label} ({role.memberCount})</Badge>
        {/each}
      </CardContent>
    </Card>

    <div class="grid gap-4 xl:grid-cols-2">
      {#each departments as department}
        <Card>
          <CardHeader>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{department.name}</CardTitle>
                <CardDescription>{department.description}</CardDescription>
              </div>
              <Badge variant="secondary">{department.estimatedHeadcount} người</Badge>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Focus</p>
              <p class="mt-1 font-medium">{department.focus}</p>
            </div>

            <div>
              <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Role đề xuất</p>
              <div class="mt-2 flex flex-wrap gap-2">
                {#each department.suggestedRoles as role}
                  <Badge variant="outline">{formatRoleLabel(role)}</Badge>
                {/each}
              </div>
            </div>

            <div>
              <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Role đang khớp hiện tại</p>
              <div class="mt-2 flex flex-wrap gap-2">
                {#if department.matchedRoles.length > 0}
                  {#each department.matchedRoles as role}
                    <Badge variant="secondary">{formatRoleLabel(role)}</Badge>
                  {/each}
                {:else}
                  <p class="text-sm text-muted-foreground">Chưa có role nào đang hoạt động trong cụm này.</p>
                {/if}
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  </div>
</OrganizationLayout>
