<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { formatRoleLabel } from '@/apps/org/shared/lib/access_ui'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  interface Invitation {
    id: string
    email: string
    org_role: string
    invited_by?: {
      id: string
      username: string | null
    } | null
    status: 'pending' | 'accepted' | 'declined' | 'expired'
    invited_at: string
    expires_at: string
  }

  interface Props {
    invitations: Invitation[]
    pagination: OffsetPagePagination
    filters: {
      search?: string | null
      status?: string | null
    }
    roleOptions?: Array<{ value: string; label: string }>
  }

  const { invitations, pagination, filters }: Props = $props()
  const { t } = $derived(useTranslation())
  let showInviteForm = $state(false)
  let inviteEmail = $state('')
  let inviteRole = $state('org_member')
  let inviteSubmitting = $state(false)
  let inviteError = $state<string | null>(null)

  function statusLabel(status: Invitation['status']): string {
    switch (status) {
      case 'pending':
        return t('organization.invitations.status.pending', {}, 'Pending')
      case 'accepted':
        return t('organization.invitations.status.accepted', {}, 'Accepted')
      case 'declined':
        return t('organization.invitations.status.declined', {}, 'Declined')
      case 'expired':
        return t('organization.invitations.status.expired', {}, 'Expired')
    }
  }

  const paginationQuery = $derived({
    search: filters.search,
    status: filters.status,
  })

  function inviteErrorFallback(email: string): string {
    return t('organization.invitations.invite_error', {}, `Unable to invite ${email}.`)
  }

  function withInviteEmail(message: string, email: string): string {
    if (email.length === 0 || message.includes(email)) {
      return message
    }

    return `${message}: ${email}`
  }

  async function readInviteError(response: Response, email: string): Promise<string> {
    try {
      const payload = (await response.json()) as { message?: unknown; errors?: Array<{ message?: unknown }> }
      const message =
        typeof payload.message === 'string'
          ? payload.message
          : typeof payload.errors?.[0]?.message === 'string'
            ? payload.errors[0].message
            : inviteErrorFallback(email)

      return withInviteEmail(message, email)
    } catch {
      return withInviteEmail(inviteErrorFallback(email), email)
    }
  }

  async function submitInvitation() {
    const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    const email = inviteEmail.trim()
    inviteSubmitting = true
    inviteError = null
    try {
      const response = await fetch('/org/members/invite', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token ? { 'X-CSRF-TOKEN': token } : {}),
        },
        body: JSON.stringify({ email, org_role: inviteRole }),
      })

      if (!response.ok) {
        inviteError = await readInviteError(response, email)
        return
      }

      router.reload({
        only: ['invitations', 'pagination', 'filters', 'flash'],
      })
    } catch {
      inviteError = withInviteEmail(inviteErrorFallback(email), email)
    } finally {
      inviteSubmitting = false
    }
  }
</script>

<OrganizationLayout title={t('organization.invitations.page_title', {}, 'Organization invitations')}>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('organization.invitations.eyebrow', {}, 'Organization invitations')}</p>
        <h1 class="mt-1 text-3xl font-black text-foreground">{t('organization.invitations.title', {}, 'Organization invitations')}</h1>
      </div>
      <Button type="button" onclick={() => { showInviteForm = !showInviteForm }}>{t('organization.invitations.invite_button', {}, 'Invite member')}</Button>
    </div>

    {#if showInviteForm}
      <Card>
        <CardHeader>
          <CardTitle>{t('organization.invitations.invite_title', {}, 'Invite member')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form class="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]" onsubmit={(event) => { event.preventDefault(); submitInvitation() }}>
            {#if inviteError}
              <p role="alert" class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive md:col-span-3">
                {inviteError}
              </p>
            {/if}
            <label class="space-y-1 text-sm font-semibold">
              <span>{t('ui_misc.organizations.email', {}, 'Email')}</span>
              <input class="h-10 w-full rounded-md border border-border px-3 text-sm" bind:value={inviteEmail} type="email" required />
            </label>
            <label class="space-y-1 text-sm font-semibold">
              <span>{t('organization.invitations.role_label', {}, 'Role')}</span>
              <select class="h-10 w-full rounded-md border border-border px-3 text-sm" bind:value={inviteRole}>
                <option value="org_member">{t('organization.role_member', {}, 'Member')}</option>
                <option value="org_admin">{t('organization.role_admin', {}, 'Admin')}</option>
              </select>
            </label>
            <div class="flex items-end">
              <Button class="w-full" type="submit" disabled={inviteSubmitting || inviteEmail.trim().length === 0}>
                {t('organization.invitations.invite_button', {}, 'Invite member')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    {/if}

    <Card>
      <CardHeader>
        <CardTitle>{t('organization.invitations.list_title', {}, 'Sent invitations')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if invitations.length === 0}
          <p class="text-sm text-muted-foreground">{t('organization.invitations.empty', {}, 'No matching invitations yet.')}</p>
        {:else}
          {#each invitations as invitation (invitation.id)}
            <article class="rounded-xl border border-border bg-background p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-bold text-foreground">{invitation.email}</p>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {formatRoleLabel(invitation.org_role, t)}
                    {#if invitation.invited_by?.username}
                      · {t('organization.invitations.invited_by', {}, 'invited by')} {invitation.invited_by.username}
                    {/if}
                  </p>
                </div>
                <span class="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  {statusLabel(invitation.status)}
                </span>
              </div>
            </article>
          {/each}
        {/if}

        <UnifiedOffsetPagination
          {pagination}
          baseUrl="/org/invitations"
          queryParams={paginationQuery}
        />
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
