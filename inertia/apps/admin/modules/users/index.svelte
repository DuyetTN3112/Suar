<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Table from '@/apps/admin/shared/ui/table.svelte'
  import TableBody from '@/apps/admin/shared/ui/table_body.svelte'
  import TableCell from '@/apps/admin/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/admin/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/admin/shared/ui/table_header.svelte'
  import TableRow from '@/apps/admin/shared/ui/table_row.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import type { OffsetPagePagination } from '@/apps/admin/shared/lib/pagination'
  import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'
  import AdminPageHeader from '@/apps/admin/shared/components/admin_page_header.svelte'
  import DataTableFilters from '@/apps/admin/shared/ui/data_table_filters.svelte'
  import type { FilterConfig } from '@/apps/admin/shared/ui/data_table_filters_types'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

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
    pagination: OffsetPagePagination
    filters: {
      search?: string
      systemRole?: string
      status?: string
    }
  }

  const { users, pagination, filters }: Props = $props()
  const { t } = useTranslation()

  let searchValue = $state('')
  let systemRoleValue = $state('')
  let statusValue = $state('')

  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const totalLabel = $derived(pagination.total.toLocaleString(documentLocale))
  const pageFrom = $derived(pagination.total > 0 ? (pagination.page - 1) * pagination.perPage + 1 : 0)
  const pageTo = $derived(Math.min(pagination.page * pagination.perPage, pagination.total))

  $effect(() => {
    searchValue = filters.search ?? ''
    systemRoleValue = filters.systemRole ?? ''
    statusValue = filters.status ?? ''
  })

  function handleFilterChange(key: string, value: unknown) {
    const nextValue = typeof value === 'string' ? value : ''

    if (key === 'search') searchValue = nextValue
    else if (key === 'systemRole') systemRoleValue = nextValue
    else if (key === 'status') statusValue = nextValue

    router.get(
      '/admin/users',
      {
        search: searchValue || undefined,
        system_role: systemRoleValue || undefined,
        status: statusValue || undefined,
        page: 1,
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  const filterConfigs = $derived([
    {
      key: 'search',
      type: 'search',
      placeholder: t('user.admin_users.index.search_placeholder', {}, 'Search username, email...'),
    },
    {
      key: 'systemRole',
      type: 'select',
      label: t('user.admin_users.index.all_roles', {}, 'All roles'),
      options: [
        { label: t('user.admin_users.index.all_roles', {}, 'All roles'), value: '' },
        { label: roleLabel('superadmin'), value: 'superadmin' },
        { label: roleLabel('system_admin'), value: 'system_admin' },
        { label: roleLabel('member'), value: 'member' },
      ],
    },
    {
      key: 'status',
      type: 'select',
      label: t('user.admin_users.index.all_statuses', {}, 'All statuses'),
      options: [
        { label: t('user.admin_users.index.all_statuses', {}, 'All statuses'), value: '' },
        { label: statusLabel('active'), value: 'active' },
        { label: statusLabel('suspended'), value: 'suspended' },
        { label: statusLabel('pending'), value: 'pending' },
      ],
    },
  ] satisfies FilterConfig[])

  function roleLabel(role: string): string {
    switch (role) {
      case 'superadmin':
        return t('user.admin_users.role.superadmin', {}, 'Superadmin')
      case 'system_admin':
        return t('user.admin_users.role.system_admin', {}, 'System admin')
      case 'member':
        return t('user.admin_users.role.member', {}, 'Member')
      default:
        return role
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'active':
        return t('user.admin_users.status.active', {}, 'Active')
      case 'suspended':
        return t('user.admin_users.status.suspended', {}, 'Suspended')
      case 'pending':
        return t('user.admin_users.status.pending', {}, 'Pending')
      default:
        return status
    }
  }

  function roleMeta(role: string): { label: string; variant: 'default' | 'secondary' | 'outline' } {
    switch (role) {
      case 'superadmin':
        return { label: roleLabel(role), variant: 'default' }
      case 'system_admin':
        return { label: roleLabel(role), variant: 'secondary' }
      default:
        return { label: roleLabel('member'), variant: 'outline' }
    }
  }

  function statusMeta(status: string): { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' } {
    switch (status) {
      case 'active':
        return { label: statusLabel(status), variant: 'default' }
      case 'suspended':
        return { label: statusLabel(status), variant: 'destructive' }
      case 'pending':
        return { label: statusLabel(status), variant: 'secondary' }
      default:
        return { label: status, variant: 'outline' }
    }
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString(documentLocale)
  }
</script>

<svelte:head>
  <title>Admin - {t('user.admin_users.index.title', {}, 'System users')}</title>
</svelte:head>

<div class="space-y-6 animate-fade-in max-w-7xl mx-auto">
  <AdminPageHeader 
    title={t('user.admin_users.index.title', {}, 'System users')}
    description={t('user.admin_users.index.description', { count: totalLabel }, ':count accounts currently exist on the platform.')}
  >
    {#snippet actions()}
      <Button variant="outline" onclick={() => { router.visit('/admin/users?export=csv') }} class="bg-card hover:bg-muted text-foreground font-semibold">
        {t('user.admin_users.index.export_csv', {}, 'Export CSV')}
      </Button>
    {/snippet}
  </AdminPageHeader>

  <DataTableFilters
    filters={filterConfigs}
    values={{ search: searchValue, systemRole: systemRoleValue, status: statusValue }}
    onFilterChange={handleFilterChange}
  />

  <Card>
      <CardHeader>
        <CardTitle>{t('user.admin_users.index.list_title', { count: totalLabel }, 'Account list (:count)')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {#if users.length === 0}
          <div class="rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <h3 class="text-lg font-semibold text-foreground">{t('user.admin_users.index.empty_title', {}, 'No matching accounts found')}</h3>
            <p class="mt-2 text-sm text-muted-foreground">{t('user.admin_users.index.empty_hint', {}, 'Try changing filters or search keywords.')}</p>
          </div>
        {:else}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('user.admin_users.index.username', {}, 'Username')}</TableHead>
                <TableHead>{t('user.admin_users.index.email', {}, 'Email')}</TableHead>
                <TableHead>{t('user.admin_users.index.system_role', {}, 'System role')}</TableHead>
                <TableHead>{t('user.admin_users.index.status', {}, 'Status')}</TableHead>
                <TableHead>{t('user.admin_users.index.joined_at', {}, 'Joined at')}</TableHead>
                <TableHead class="text-right">{t('user.admin_users.index.actions', {}, 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {#each users as user}
                {@const role = roleMeta(user.system_role)}
                {@const status = statusMeta(user.status)}
                <TableRow>
                  <TableCell class="font-medium text-foreground">{user.username}</TableCell>
                  <TableCell class="font-mono text-sm text-muted-foreground">{user.email ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={role.variant}>{role.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell class="font-mono text-sm text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                  <TableCell class="text-right">
                    <Link
                      class="text-sm font-semibold text-orange transition-colors hover:text-orange/80"
                      href="/admin/users/{user.id}"
                    >
                      {t('user.admin_users.index.view_detail', {}, 'View detail')}
                    </Link>
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        {/if}

        <div class="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted-foreground">
            {t('user.admin_users.index.pagination_summary', { from: pageFrom, to: pageTo, total: pagination.total }, 'Showing :from-:to / :total')}
          </p>

          <UnifiedOffsetPagination
            pagination={pagination}
            baseUrl="/admin/users"
            queryParams={{
              system_role: filters.systemRole ?? undefined,
              status: filters.status ?? undefined,
            }}
          />
        </div>
      </CardContent>
  </Card>
</div>
