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
  import { groupByCategory } from '@/lib/access_ui'

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

  const sections = $derived.by(() => [
    {
      value: 'system',
      label: 'Hệ thống',
      subtitle: 'Vai trò system admin và quyền nền tảng',
      roles: systemRoles,
      catalogGroups: groupByCategory(catalogs.system),
    },
    {
      value: 'organization',
      label: 'Organization',
      subtitle: 'Quyền điều hành cấp tổ chức',
      roles: organizationRoles,
      catalogGroups: groupByCategory(catalogs.organization),
    },
    {
      value: 'project',
      label: 'Project',
      subtitle: 'Quyền tác nghiệp và delivery theo project',
      roles: projectRoles,
      catalogGroups: groupByCategory(catalogs.project),
    },
  ])
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="neo-kicker">Admin / Access Control</p>
      <h1 class="text-4xl font-bold tracking-tight">Vai trò và quyền hạn hệ thống</h1>
      <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
        Màn hình chuẩn hóa access surface của backend để admin nhìn rõ role matrix, permission catalog và phạm vi từng nhóm quyền.
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <a href="/admin/audit-logs" class="neo-surface-soft px-3 py-2 text-sm font-bold">Audit log</a>
      <a href="/admin/packages" class="neo-surface-soft px-3 py-2 text-sm font-bold">Packages</a>
      <a href="/admin/qr-codes" class="neo-surface-soft px-3 py-2 text-sm font-bold">QR gói cá nhân</a>
    </div>
  </div>

  <div class="grid gap-4 md:grid-cols-3">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Nhóm vai trò</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">{summary.totalRoleGroups}</div>
        <p class="mt-1 text-xs text-muted-foreground">System, organization và project</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Tổng vai trò</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">{summary.totalRoles}</div>
        <p class="mt-1 text-xs text-muted-foreground">Các vai trò được code backend hỗ trợ</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Permission keys</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-bold">{summary.totalUniquePermissions}</div>
        <p class="mt-1 text-xs text-muted-foreground">Tập quyền duy nhất trong toàn hệ thống</p>
      </CardContent>
    </Card>
  </div>

  <Tabs value="organization">
    <TabsList class="w-full justify-start overflow-x-auto">
      {#each sections as section}
        <TabsTrigger value={section.value}>{section.label}</TabsTrigger>
      {/each}
    </TabsList>

    {#each sections as section}
      <TabsContent value={section.value} class="mt-4 space-y-4">
        <div>
          <h2 class="text-2xl font-bold">{section.label}</h2>
          <p class="text-sm text-muted-foreground">{section.subtitle}</p>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader>
              <CardTitle>Role matrix</CardTitle>
              <CardDescription>Mỗi role hiển thị đúng permission set hiện đang được backend gắn.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              {#each section.roles as role}
                <div class="rounded-xl border border-border p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-lg font-bold">{role.label}</h3>
                        <Badge variant="secondary">{role.permissionCount} quyền</Badge>
                      </div>
                      <p class="mt-1 text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <Badge variant="outline">{role.code}</Badge>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-2">
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
              <CardDescription>Phân nhóm theo category để đối chiếu nhanh khi audit quyền.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              {#each section.catalogGroups as group}
                <div class="rounded-xl border border-border p-4">
                  <h3 class="font-bold">{group.category}</h3>
                  <div class="mt-3 space-y-3">
                    {#each group.items as permission}
                      <div class="rounded-lg bg-muted/30 p-3">
                        <div class="flex items-start justify-between gap-3">
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
        </div>
      </TabsContent>
    {/each}
  </Tabs>
</div>
