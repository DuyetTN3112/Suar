<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { ArrowLeft, Building, Mail, MapPin, Phone, Globe, Calendar } from 'lucide-svelte'

  import Avatar from '@/apps/org/shared/ui/avatar.svelte'
  import AvatarFallback from '@/apps/org/shared/ui/avatar_fallback.svelte'
  import AvatarImage from '@/apps/org/shared/ui/avatar_image.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Table from '@/apps/org/shared/ui/table.svelte'
  import TableBody from '@/apps/org/shared/ui/table_body.svelte'
  import TableCell from '@/apps/org/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/org/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/org/shared/ui/table_header.svelte'
  import TableRow from '@/apps/org/shared/ui/table_row.svelte'
  import Tabs from '@/apps/org/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/org/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/org/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/org/shared/ui/tabs_trigger.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Organization {
    id: string
    name: string
    description: string | null
    address: string | null
    email: string | null
    phone: string | null
    website: string | null
    logo_url: string | null
    created_at: string
    updated_at: string
  }

  interface Member {
    id: string
    username: string
    email: string
    org_role: string
    role_name: string
  }

  interface OrganizationReviewSummary {
    total: number
    anonymous: number
    averageRating: number | null
    recent: Array<{
      id: string
      reviewerId: string | null
      rating: number
      comment: string | null
      isAnonymous: boolean
      createdAt: string
    }>
  }

  interface ReverseReviewGovernanceSummary {
    total: number
    anonymous: number
    byTargetType: Record<string, number>
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    organization: Organization
    members: Member[]
    membersPagination?: OffsetPagePagination
    userRole: string
    organizationReviews: OrganizationReviewSummary
    reverseReviewGovernance: ReverseReviewGovernanceSummary
  }

  const { organization, members, membersPagination, userRole, organizationReviews, reverseReviewGovernance }: Props = $props()
  const { t } = useTranslation()

  // Check if user has admin permissions
  const isAdmin = $derived(userRole === 'org_owner' || userRole === 'org_admin')
  // Check if user is organization owner
  const isSuperAdmin = $derived(userRole === 'org_owner')
  const reverseReviewTargetEntries = $derived(
    Object.entries(reverseReviewGovernance.byTargetType ?? {}).sort((left, right) => right[1] - left[1])
  )
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  function targetTypeLabel(type: string): string {
    const fallbacks: Record<string, string> = {
      organization: 'Organization',
      project: 'Project',
      manager: 'Manager review',
      peer: 'Peer',
    }

    return t(`organization.show.review_target.${type}`, {}, fallbacks[type] ?? type)
  }

  function organizationDateLabel(value: string): string {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return t('organization.show.date_unknown', {}, 'Unknown')
    }

    return new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed)
  }
</script>

<svelte:head>
  <title>{organization.name}</title>
</svelte:head>

<OrganizationLayout title={t('organization.show.page_title', {}, 'Organization details')}>
  <div class="container py-6">
    <div class="mb-6">
      <Button variant="ghost" class="pl-0">
        <Link href="/organizations">
          <ArrowLeft class="mr-2 h-4 w-4" /> {t('organization.show.back_to_list', {}, 'Back to organizations')}
        </Link>
      </Button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1">
        <Card>
          <CardHeader>
            <div class="flex justify-center mb-4">
              {#if organization.logo_url}
                <Avatar class="h-24 w-24">
                  <AvatarImage src={organization.logo_url} alt={organization.name} />
                  <AvatarFallback>{organization.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
              {:else}
                <div class="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                  <Building class="h-12 w-12 text-muted-foreground" />
                </div>
              {/if}
            </div>
            <CardTitle class="text-center text-2xl">{organization.name}</CardTitle>
          </CardHeader>

          <CardContent class="space-y-4">
            {#if organization.description}
              <div class="rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground">
                {organization.description}
              </div>
            {/if}
            {#if organization.address}
              <div class="flex items-center">
                <MapPin class="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{organization.address}</span>
              </div>
            {/if}
            {#if organization.email}
              <div class="flex items-center">
                <Mail class="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{organization.email}</span>
              </div>
            {/if}
            {#if organization.phone}
              <div class="flex items-center">
                <Phone class="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{organization.phone}</span>
              </div>
            {/if}
            {#if organization.website}
              <div class="flex items-center">
                <Globe class="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{organization.website}</span>
              </div>
            {/if}
            <div class="flex items-center">
              <Calendar class="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{t('organization.show.created_label', {}, 'Created')}: {organizationDateLabel(organization.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="lg:col-span-2">
        <Tabs value="members" class="w-full">
          <TabsList class="w-full">
            <TabsTrigger value="members" class="flex-1">
              {t('organization.show.members_tab', { count: members.length }, `Members (${members.length})`)}
            </TabsTrigger>
            <TabsTrigger value="projects" class="flex-1">
              {t('organization.show.projects_tab', {}, 'Projects')}
            </TabsTrigger>
            <TabsTrigger value="reviews" class="flex-1">
              {t('organization.show.reviews_tab', {}, 'Organization reviews')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <div class="flex justify-between items-center">
                  <CardTitle>{t('organization.show.members_title', {}, 'Members')}</CardTitle>
                  {#if isAdmin}
                    <Link href="/org/invitations">
                      <Button size="sm">{t('organization.show.invite_members', {}, 'Invite members')}</Button>
                    </Link>
                  {/if}
                </div>
              </CardHeader>
              <CardContent>
                {#if members.length === 0}
                  <div class="text-center py-6 text-muted-foreground">
                    {t('organization.show.members_empty', {}, 'This organization has no members yet')}
                  </div>
                {:else}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('organization.show.member_name_header', {}, 'Name')}</TableHead>
                        <TableHead>{t('ui_misc.organizations.email', {}, 'Email')}</TableHead>
                        <TableHead>{t('organization.show.member_role_header', {}, 'Role')}</TableHead>
                        {#if isSuperAdmin}
                          <TableHead class="w-[100px]">{t('organization.show.member_actions_header', {}, 'Actions')}</TableHead>
                        {/if}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {#each members as member (member.id)}
                        <TableRow>
                          <TableCell>
                            <div class="font-medium">{member.username || member.email}</div>
                            <div class="text-sm text-muted-foreground">@{member.username}</div>
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.role_name}</TableCell>
                          {#if isSuperAdmin}
                            <TableCell>
                              <Link href="/users/{member.id}/profile">
                                <Button variant="ghost" size="sm">{t('organization.show.view_user', {}, 'View user')}</Button>
                              </Link>
                            </TableCell>
                          {/if}
                        </TableRow>
                      {/each}
                    </TableBody>
                  </Table>
                {/if}
                {#if membersPagination}
                  <UnifiedOffsetPagination
                    pagination={membersPagination}
                    baseUrl={`/organizations/${organization.id}`}
                  />
                {/if}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>{t('organization.show.projects_title', {}, 'Projects')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex flex-col items-center gap-3 py-6 text-center text-muted-foreground">
                  <div class="flex flex-wrap justify-center gap-2">
                    <Link href="/org/projects">
                      <Button variant="outline">{t('organization.show.manage_org_projects', {}, 'Manage organization projects')}</Button>
                    </Link>
                    <Link href="/projects">
                      <Button variant="outline">{t('organization.show.general_project_list', {}, 'General project list')}</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>{t('organization.show.reviews_title', {}, 'Organization reviews')}</CardTitle>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {t('organization.show.reviews_description', {}, 'Collect recorded work-environment and manager reviews. The new flow runs after sprint closure instead of after each task.')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="grid gap-3 md:grid-cols-3">
                  <div class="rounded-xl border border-border bg-muted/20 p-4">
                    <div class="text-xs uppercase text-muted-foreground">{t('organization.show.total_reviews', {}, 'Total reviews')}</div>
                    <div class="mt-2 text-2xl font-black">{organizationReviews.total}</div>
                  </div>
                  <div class="rounded-xl border border-border bg-muted/20 p-4">
                    <div class="text-xs uppercase text-muted-foreground">{t('organization.show.average_rating', {}, 'Average rating')}</div>
                    <div class="mt-2 text-2xl font-black">
                      {organizationReviews.averageRating ?? 'N/A'}
                    </div>
                  </div>
                  <div class="rounded-xl border border-border bg-muted/20 p-4">
                    <div class="text-xs uppercase text-muted-foreground">{t('organization.show.anonymous_reviews', {}, 'Anonymous reviews')}</div>
                    <div class="mt-2 text-2xl font-black">{organizationReviews.anonymous}</div>
                  </div>
                </div>

                <div class="rounded-xl border border-border bg-background p-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div class="text-xs uppercase text-muted-foreground">{t('organization.show.sprint_reviews_title', {}, 'Organization-wide post-sprint reviews')}</div>
                      <div class="mt-2 text-2xl font-black">{reverseReviewGovernance.total}</div>
                    </div>
                    <div class="text-sm text-muted-foreground">
                      {t('organization.show.anonymous_count', { count: reverseReviewGovernance.anonymous }, `${reverseReviewGovernance.anonymous} anonymous`)}
                    </div>
                  </div>

                  {#if reverseReviewTargetEntries.length === 0}
                    <p class="mt-3 text-sm text-muted-foreground">
                      {t('organization.show.sprint_reviews_empty', {}, 'No post-sprint reviews in this organization yet.')}
                    </p>
                  {:else}
                    <div class="mt-4 flex flex-wrap gap-2">
                      {#each reverseReviewTargetEntries as [targetType, count]}
                        <div class="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-semibold">
                          {targetTypeLabel(targetType)} · {count}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </div>
</OrganizationLayout>
