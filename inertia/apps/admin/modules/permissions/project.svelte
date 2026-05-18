<script lang="ts">
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
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

  interface Props {
    summary: {
      totalRoleGroups: number
      totalRoles: number
      totalUniquePermissions: number
    }
    roles: RoleMatrixEntry[]
    catalog: PermissionPresentation[]
  }

  const { summary, roles, catalog }: Props = $props()

  const catalogGroups = $derived(groupByCategory(catalog))
</script>

<svelte:head>
  <title>Admin - Vai trò dự án</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-4xl font-bold tracking-tight">Vai trò dự án</h1>
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

  <div class="mt-4 space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Danh sách vai trò dự án</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {#each roles as role}
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
        <CardTitle>Danh mục quyền dự án</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {#each catalogGroups as group}
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
  </div>
</div>
