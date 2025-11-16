<script lang="ts">
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Tabs from '@/apps/admin/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/admin/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/admin/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/admin/shared/ui/tabs_trigger.svelte'
  import { groupByCategory } from '@/apps/admin/shared/lib/access_ui'

  interface PermissionPresentation {
    key: string
    label: string
    description: string
    category: string
  }

  interface RoleMatrixEntry {
    code: string
    label: string
    description: string
    permissions: PermissionPresentation[]
    permissionCount: number
  }

  interface PermissionSection {
    title: string
    roleTitle: string
    catalogTitle: string
    roles: RoleMatrixEntry[]
    catalog: PermissionPresentation[]
  }

  interface Props {
    summary: {
      totalRoleGroups: number
      totalRoles: number
      totalUniquePermissions: number
    }
    systemRoles: RoleMatrixEntry[]
    organizationRoles: RoleMatrixEntry[]
    projectRoles: RoleMatrixEntry[]
    catalogs: {
      system: PermissionPresentation[]
      organization: PermissionPresentation[]
      project: PermissionPresentation[]
    }
  }

  const { summary, systemRoles, organizationRoles, projectRoles, catalogs }: Props = $props()

  let activeTab = $state('system')

  const sections = $derived<Record<string, PermissionSection>>({
    system: {
      title: 'Vai trò hệ thống',
      roleTitle: 'Danh sách vai trò hệ thống',
      catalogTitle: 'Danh mục quyền hệ thống',
      roles: systemRoles,
      catalog: catalogs.system,
    },
    organization: {
      title: 'Vai trò tổ chức',
      roleTitle: 'Danh sách vai trò tổ chức',
      catalogTitle: 'Danh mục quyền tổ chức',
      roles: organizationRoles,
      catalog: catalogs.organization,
    },
    project: {
      title: 'Vai trò dự án',
      roleTitle: 'Danh sách vai trò dự án',
      catalogTitle: 'Danh mục quyền dự án',
      roles: projectRoles,
      catalog: catalogs.project,
    },
  })

  function catalogGroups(section: PermissionSection) {
    return groupByCategory(section.catalog)
  }
</script>

<svelte:head>
  <title>Admin - Vai trò và quyền hạn</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-4xl font-bold tracking-tight">Vai trò và quyền hạn</h1>
  </div>

  <div class="grid gap-4 md:grid-cols-3">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Nhóm vai trò</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">{summary.totalRoleGroups}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Tổng vai trò</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">{summary.totalRoles}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Mã quyền</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">{summary.totalUniquePermissions}</div>
      </CardContent>
    </Card>
  </div>

  <Tabs value={activeTab} onValueChange={(value: string) => { activeTab = value }}>
    <TabsList class="flex h-auto flex-wrap justify-start gap-2 rounded-lg border border-border bg-background/80 p-2">
      <TabsTrigger value="system">Hệ thống</TabsTrigger>
      <TabsTrigger value="organization">Tổ chức</TabsTrigger>
      <TabsTrigger value="project">Dự án</TabsTrigger>
    </TabsList>

    {#each Object.entries(sections) as [sectionKey, section]}
      <TabsContent value={sectionKey} class="space-y-4">
        <h2 class="text-2xl font-semibold tracking-tight">{section.title}</h2>

        <Card>
          <CardHeader>
            <CardTitle>{section.roleTitle}</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {#each section.roles as role}
              <div class="rounded-xl border border-border p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="font-semibold text-foreground">{role.label}</p>
                      <Badge variant="outline">{role.code}</Badge>
                    </div>
                    <p class="text-sm text-muted-foreground">{role.description}</p>
                  </div>

                  <Badge variant="secondary">{role.permissionCount} quyền</Badge>
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
            <CardTitle>{section.catalogTitle}</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {#each catalogGroups(section) as group}
              <div class="rounded-xl border border-border p-4">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="font-semibold text-foreground">{group.category}</h3>
                  <Badge variant="outline">{group.items.length}</Badge>
                </div>

                <div class="mt-3 space-y-3">
                  {#each group.items as permission}
                    <div class="rounded-lg bg-muted/30 p-3">
                      <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="space-y-1">
                          <p class="font-medium text-foreground">{permission.label}</p>
                          <p class="text-xs text-muted-foreground">{permission.description}</p>
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
