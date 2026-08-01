<script lang="ts">
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import { groupByCategory } from '@/apps/admin/shared/lib/access_ui'
  import { Plus, Edit, Trash2 } from 'lucide-svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import { router } from '@inertiajs/svelte'
  import { toast } from 'svelte-sonner'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface PermissionPresentation {
    key: string
    label: string
    description: string
    category: string
  }

  interface RoleMatrixEntry {
    id?: string
    code: string
    label: string
    description: string
    permissions: PermissionPresentation[]
    permissionCount: number
    isCustom?: boolean
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
  const { t } = useTranslation()

  const catalogGroups = $derived(groupByCategory(catalog))

  function handleCreate() {
    router.visit('/admin/permissions/system/custom-roles/create')
  }

  function handleEdit(role: RoleMatrixEntry) {
    if (!role.id) return
    router.visit(`/admin/permissions/system/custom-roles/${role.id}/edit`)
  }

  function handleDelete(role: RoleMatrixEntry) {
    if (!role.id) return
    if (confirm(t('task.admin_permissions.delete_confirm', { role: role.label }, 'Are you sure you want to delete role ":role"?'))) {
      router.delete(`/admin/permissions/system/custom-roles/${role.id}`, {
        onSuccess: () => {
          toast.success(t('task.admin_permissions.delete_success', {}, 'Role deleted'))
        },
        onError: (errors) => {
          toast.error(errors.message || t('task.admin_permissions.delete_error', {}, 'Unable to delete role'))
        }
      })
    }
  }
</script>

<svelte:head>
  <title>{t('task.admin_permissions.system_roles', {}, 'System roles')}</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-4xl font-bold tracking-tight">{t('task.admin_permissions.system_roles', {}, 'System roles')}</h1>
    <Button onclick={handleCreate}>
      <Plus class="mr-2 h-4 w-4" />
      {t('task.admin_permissions.create_role', {}, 'Create role')}
    </Button>
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

  <div class="mt-4 space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>{t('task.admin_permissions.system_role_list', {}, 'System role list')}</CardTitle>
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

              <div class="flex items-center gap-2">
                <Badge variant="secondary">{t('task.admin_permissions.permission_count', { count: role.permissionCount }, ':count permissions')}</Badge>
                {#if role.isCustom}
                  <Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => handleEdit(role)}>
                    <Edit class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive hover:text-destructive" onclick={() => handleDelete(role)}>
                    <Trash2 class="h-4 w-4" />
                  </Button>
                {/if}
              </div>
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
        <CardTitle>{t('task.admin_permissions.system_permission_catalog', {}, 'System permission catalog')}</CardTitle>
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
