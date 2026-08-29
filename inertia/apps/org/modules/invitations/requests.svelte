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

  interface JoinRequest {
    user_id: string
    username: string
    email: string
    org_role: string
    status: string
    created_at: string
  }

  interface Props {
    requests: JoinRequest[]
    pagination: OffsetPagePagination
    filters?: {
      search?: string | null
    }
  }

  const { requests, pagination }: Props = $props()
  const { t } = $derived(useTranslation())
  let processingUserId = $state<string | null>(null)

  async function processJoinRequest(userId: string, action: 'approve' | 'reject') {
    const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    processingUserId = userId
    try {
      await fetch(`/org/invitations/requests/${userId}/approve`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token ? { 'X-CSRF-TOKEN': token } : {}),
        },
        body: JSON.stringify({ action }),
      })
      router.reload({
        only: ['requests', 'pagination', 'filters', 'flash'],
      })
    } finally {
      processingUserId = null
    }
  }
</script>

<OrganizationLayout title={t('organization.requests.page_title', {}, 'Join requests')}>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('organization.requests.eyebrow', {}, 'Organization invitations')}</p>
      <h1 class="mt-1 text-3xl font-black text-foreground">{t('organization.requests.title', {}, 'Join requests')}</h1>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{t('organization.requests.list_title', {}, 'Request list')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if requests.length === 0}
          <p class="text-sm text-muted-foreground">{t('organization.requests.empty', {}, 'No pending requests.')}</p>
        {:else}
          {#each requests as request (request.user_id)}
            <article class="rounded-xl border border-border bg-background p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-bold text-foreground">{request.username}</p>
                  <p class="mt-1 text-sm text-muted-foreground">{request.email} · {formatRoleLabel(request.org_role, t)}</p>
                </div>
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    type="button"
                    disabled={processingUserId === request.user_id}
                    onclick={() => processJoinRequest(request.user_id, 'approve')}
                  >
                    {t('organization.requests.approve', {}, 'Approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    disabled={processingUserId === request.user_id}
                    onclick={() => processJoinRequest(request.user_id, 'reject')}
                  >
                    {t('organization.requests.reject', {}, 'Reject')}
                  </Button>
                </div>
              </div>
            </article>
          {/each}
        {/if}

        <UnifiedOffsetPagination {pagination} baseUrl="/org/invitations/requests" />
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
