<script lang="ts">
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { formatRoleLabel } from '@/apps/org/shared/lib/access_ui'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  interface Member {
    user_id: string
    username: string
    email: string
    org_role: string
    status: string
    created_at: string
  }

  interface Props {
    members: Member[]
    pagination: OffsetPagePagination
    filters: {
      search?: string | null
      orgRole?: string | null
      status?: string | null
    }
    roleOptions?: Array<{ value: string; label: string }>
  }

  const { members, pagination, filters }: Props = $props()
  const { t } = $derived(useTranslation())
  const paginationQuery = $derived({
    status: filters.status,
    org_role: filters.orgRole,
  })
</script>

<OrganizationLayout title={t('organization.members.page_title', {}, 'Organization members')}>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('organization.members.eyebrow', {}, 'Organization access')}</p>
      <h1 class="mt-1 text-3xl font-black text-foreground">{t('organization.members.title', {}, 'Organization members')}</h1>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{t('organization.members.list_title', {}, 'Member list')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if members.length === 0}
          <p class="text-sm text-muted-foreground">{t('organization.members.empty', {}, 'No matching members.')}</p>
        {:else}
          {#each members as member (member.user_id)}
            <article class="rounded-xl border border-border bg-background p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-bold text-foreground">{member.username}</p>
                  <p class="mt-1 text-sm text-muted-foreground">{member.email}</p>
                </div>
                <span class="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  {formatRoleLabel(member.org_role, t)}
                </span>
              </div>
            </article>
          {/each}
        {/if}

        <UnifiedOffsetPagination {pagination} baseUrl="/org/members" queryParams={paginationQuery} />
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
