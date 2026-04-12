<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { groupByCategory } from '@/lib/access_ui'

  interface PermissionPresentation {
    key: string
    label: string
    description: string
    category: string
  }

  interface RoleEntry {
    code: string
    label: string
    description: string
    permissions: PermissionPresentation[]
    permissionCount: number
    isBuiltIn: boolean
    memberCount: number
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
    projectRoles: RoleEntry[]
    permissionCatalog: PermissionPresentation[]
    projectPermissionCatalog: PermissionPresentation[]
  }

  const { organization, summary, organizationRoles, projectRoles, permissionCatalog, projectPermissionCatalog }: Props =
    $props()

  const sections = $derived.by(() => [
    {
      value: 'organization',
      label: 'Organization roles',
      roles: organizationRoles,
      catalogGroups: groupByCategory(permissionCatalog),
    },
    {
      value: 'project',
      label: 'Project roles',
      roles: projectRoles,
      catalogGroups: groupByCategory(projectPermissionCatalog),
    },
  ])
</script>

<OrganizationLayout title="Quyền hạn tổ chức">
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="neo-kicker">Organization / Permissions</p>
        <h1 class="text-4xl font-bold tracking-tight">Ma trận quyền hạn</h1>
        <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
          Màn hình để owner/admin kiểm tra role nào đang có quyền gì ở organization và project, tránh nhầm lẫn khi phân quyền cho team.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/org/roles" class="neo-surface-soft px-3 py-2 text-sm font-bold">Vai trò</a>
        <a href="/org/departments" class="neo-surface-soft px-3 py-2 text-sm font-bold">Phòng ban</a>
        <a href="/org/settings" class="neo-surface-soft px-3 py-2 text-sm font-bold">Cài đặt</a>
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
          <CardTitle class="text-sm font-medium">Thành viên</CardTitle>
        </CardHeader>
        <CardContent><div class="text-3xl font-bold">{summary.approvedMembers}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Role organization</CardTitle>
        </CardHeader>
        <CardContent><div class="text-3xl font-bold">{organizationRoles.length}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Role project</CardTitle>
        </CardHeader>
        <CardContent><div class="text-3xl font-bold">{projectRoles.length}</div></CardContent>
      </Card>
    </div>

    <Tabs value="organization">
      <TabsList class="w-full justify-start">
        {#each sections as section}
          <TabsTrigger value={section.value}>{section.label}</TabsTrigger>
        {/each}
      </TabsList>

      {#each sections as section}
        <TabsContent value={section.value} class="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>{section.label}</CardTitle>
              <CardDescription>Phân rã quyền theo role để soát nhanh trước khi gán cho thành viên.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              {#each section.roles as role}
                <div class="rounded-xl border border-border p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2">
                        <p class="font-bold">{role.label}</p>
                        {#if section.value === 'organization'}
                          <Badge variant="secondary">{role.memberCount} member</Badge>
                        {/if}
                      </div>
                      <p class="mt-1 text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <Badge variant="outline">{role.permissionCount} quyền</Badge>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    {#each role.permissions as permission}
                      <Badge variant="outline">{permission.label}</Badge>
                    {/each}
                  </div>
                </div>
              {/each}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permission catalog</CardTitle>
              <CardDescription>Danh mục quyền chuẩn để dùng khi tạo custom role.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              {#each section.catalogGroups as group}
                <div class="rounded-xl border border-border p-4">
                  <div class="flex items-center justify-between gap-3">
                    <h3 class="font-bold">{group.category}</h3>
                    <Badge variant="outline">{group.items.length}</Badge>
                  </div>
                  <div class="mt-3 space-y-3">
                    {#each group.items as permission}
                      <div class="rounded-lg bg-muted/30 p-3">
                        <div class="flex items-start justify-between gap-2">
                          <div>
                            <p class="font-medium">{permission.label}</p>
                            <p class="mt-1 text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                          <Badge variant="outline">{permission.key}</Badge>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </CardContent>
          </Card>
        </TabsContent>
      {/each}
    </Tabs>
  </div>
</OrganizationLayout>
