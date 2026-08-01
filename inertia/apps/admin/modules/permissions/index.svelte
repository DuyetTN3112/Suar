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
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

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
  const { t } = useTranslation()

  let activeTab = $state('system')

  const sections = $derived<Record<string, PermissionSection>>({
    system: {
      title: t('task.admin_permissions.system_roles', {}, 'System roles'),
      roleTitle: t('task.admin_permissions.system_role_list', {}, 'System role list'),
      catalogTitle: t('task.admin_permissions.system_permission_catalog', {}, 'System permission catalog'),
      roles: systemRoles,
      catalog: catalogs.system,
    },
    organization: {
      title: t('task.admin_permissions.organization_roles', {}, 'Organization roles'),
      roleTitle: t('task.admin_permissions.organization_role_list', {}, 'Organization role list'),
      catalogTitle: t('task.admin_permissions.organization_permission_catalog', {}, 'Organization permission catalog'),
      roles: organizationRoles,
      catalog: catalogs.organization,
    },
    project: {
      title: t('task.admin_permissions.project_roles', {}, 'Project roles'),
      roleTitle: t('task.admin_permissions.project_role_list', {}, 'Project role list'),
      catalogTitle: t('task.admin_permissions.project_permission_catalog', {}, 'Project permission catalog'),
      roles: projectRoles,
      catalog: catalogs.project,
    },
  })

  function catalogGroups(section: PermissionSection) {
    return groupByCategory(section.catalog)
  }
</script>

<svelte:head>
  <title>{t('task.admin_permissions.page_title', {}, 'Admin - Roles and permissions')}</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-4xl font-bold tracking-tight">{t('task.admin_permissions.title', {}, 'Roles and permissions')}</h1>
  </div>

  <div class="grid gap-4 md:grid-cols-3">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('task.admin_permissions.role_groups', {}, 'Role groups')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">{summary.totalRoleGroups}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('task.admin_permissions.total_roles', {}, 'Total roles')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">{summary.totalRoles}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">{t('task.admin_permissions.permission_codes', {}, 'Permission codes')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">{summary.totalUniquePermissions}</div>
      </CardContent>
    </Card>
  </div>

  <Tabs value={activeTab} onValueChange={(value: string) => { activeTab = value }}>
    <TabsList class="flex h-auto flex-wrap justify-start gap-2 rounded-lg border border-border bg-background/80 p-2">
      <TabsTrigger value="system">{t('task.admin_permissions.system', {}, 'System')}</TabsTrigger>
      <TabsTrigger value="organization">{t('task.admin_permissions.organization', {}, 'Organization')}</TabsTrigger>
      <TabsTrigger value="project">{t('task.admin_permissions.project', {}, 'Project')}</TabsTrigger>
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

                  <Badge variant="secondary">{t('task.admin_permissions.permission_count', { count: role.permissionCount }, ':count permissions')}</Badge>
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
