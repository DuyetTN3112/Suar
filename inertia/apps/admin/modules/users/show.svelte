<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'

  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface User {
    id: string
    username: string
    email: string | null
    system_role: string
    status: string
    current_organization_id: string | null
    is_external_contributor: boolean
    created_at: string
    updated_at: string
  }

  interface Props {
    user: User
  }

  const { user }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  const userActionPath = $derived(
    user.status === 'suspended'
      ? `/admin/users/${user.id}/activate`
      : `/admin/users/${user.id}/suspend`
  )
  const userActionLabel = $derived(
    user.status === 'suspended'
      ? t('user.admin_users.show.restore_account', {}, 'Restore account')
      : t('user.admin_users.show.suspend_account', {}, 'Suspend account')
  )
  const userActionTone = $derived(user.status === 'suspended' ? 'outline' : 'destructive')
  const auditLogsHref = $derived(`/admin/audit-logs?user_id=${encodeURIComponent(user.id)}`)

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

  function roleClass(role: string): string {
    switch (role) {
      case 'superadmin':
        return 'rounded-full border border-fuchsia-500/30 px-3 py-1 text-xs font-medium bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300'
      case 'system_admin':
        return 'rounded-full px-3 py-1 text-xs font-medium bg-primary text-primary-foreground'
      default:
        return 'border border-border rounded-full px-3 py-1 text-xs font-medium bg-card text-foreground'
    }
  }

  function statusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'rounded-full px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground'
      case 'suspended':
        return 'rounded-full px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground'
      case 'pending':
        return 'rounded-full px-3 py-1 text-xs font-medium bg-primary text-primary-foreground'
      default:
        return 'border border-border rounded-full px-3 py-1 text-xs font-medium bg-card text-foreground'
    }
  }

  function handleUserStatusAction() {
    router.post(
      userActionPath,
      {
        _method: 'PUT',
      },
      {
        preserveScroll: true,
      }
    )
  }

  function formatDateTime(date: string): string {
    return new Date(date).toLocaleString(documentLocale)
  }
</script>

<svelte:head>
  <title>Admin - {user.username}</title>
</svelte:head>

  <div class="space-y-6">
    <div>
      <div>
        <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('user.admin_users.show.eyebrow', {}, 'Admin / User detail')}</p>
        <h1 class="text-4xl font-bold tracking-tight">{user.username}</h1>
        <p class="mt-2 text-sm text-muted-foreground">{statusLabel(user.status)} · {roleLabel(user.system_role)}</p>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('user.admin_users.show.account_info', {}, 'Account information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('user.admin_users.show.user_id', {}, 'User ID')}</dt>
              <dd class="mt-1 text-sm font-mono text-foreground">{user.id}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('user.admin_users.show.username', {}, 'Username')}</dt>
              <dd class="mt-1 text-sm text-foreground">{user.username}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('user.admin_users.show.email', {}, 'Email')}</dt>
              <dd class="mt-1 text-sm text-foreground">{user.email ?? t('user.admin_users.show.email_missing', {}, 'Not provided')}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('user.admin_users.show.system_role', {}, 'System role')}</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {roleClass(user.system_role)}">
                  {roleLabel(user.system_role)}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('user.admin_users.show.account_status', {}, 'Account status')}</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {statusClass(user.status)}">
                  {statusLabel(user.status)}
                </span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('user.admin_users.show.context_title', {}, 'Context and classification')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('user.admin_users.show.current_organization', {}, 'Current organization')}</dt>
              <dd class="mt-1 text-sm text-foreground">
                {#if user.current_organization_id}
                  <Link href="/admin/organizations/{user.current_organization_id}" class="text-foreground hover:underline">
                    {user.current_organization_id}
                  </Link>
                {:else}
                  <span class="text-muted-foreground">{t('user.admin_users.show.no_current_organization', {}, 'No current organization context')}</span>
                {/if}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('user.admin_users.show.work_account_type', {}, 'Work account type')}</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide {user.is_external_contributor ? 'border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 text-xs font-medium text-fuchsia-700 dark:text-fuchsia-300' : 'border border-border px-3 text-xs font-medium bg-card text-foreground'}">
                  {user.is_external_contributor ? t('user.admin_users.show.external_contributor', {}, 'External contributor') : roleLabel('member')}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('user.admin_users.show.created_at', {}, 'Created at')}</dt>
              <dd class="mt-1 text-sm text-foreground">
                {formatDateTime(user.created_at)}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('user.admin_users.show.updated_at', {}, 'Last updated')}</dt>
              <dd class="mt-1 text-sm text-foreground">
                {formatDateTime(user.updated_at)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{t('user.admin_users.show.operations', {}, 'Operations')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-2">
          <Button variant={userActionTone} onclick={handleUserStatusAction}>
            {userActionLabel}
          </Button>
          <a href={auditLogsHref}>
            <Button variant="outline">{t('user.admin_users.show.open_audit_logs', {}, 'Open audit logs')}</Button>
          </a>
          {#if user.current_organization_id}
            <Link href="/admin/organizations/{user.current_organization_id}">
              <Button variant="outline">{t('user.admin_users.show.open_current_organization', {}, 'Open current organization')}</Button>
            </Link>
          {/if}
        </div>
      </CardContent>
    </Card>
  </div>
