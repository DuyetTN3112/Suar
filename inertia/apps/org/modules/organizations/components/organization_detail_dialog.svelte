<script lang="ts">
  import { Building, Clock, Users } from 'lucide-svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'


  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
    founded_date: string | null
    owner: string | null
    employee_count: number | null
    project_count: number | null
    industry: string | null
    location: string | null
    membership_status?: 'pending' | 'approved' | 'rejected' | null
  }

  interface MembershipInfo {
    isMember: boolean
    status: string | null
  }

  interface Props {
    open: boolean
    selectedOrg: Organization | null
    localCurrentOrgId: string | null
    checkMembershipStatus: (orgId: string) => MembershipInfo
    onSwitchOrganization: (id: string) => Promise<void>
    onJoinOrganization: (id: string) => Promise<void>
    onClose: () => void
    onOpenChange: (open: boolean) => void
  }

  const {
    open,
    selectedOrg,
    localCurrentOrgId,
    checkMembershipStatus,
    onSwitchOrganization,
    onJoinOrganization,
    onClose,
    onOpenChange,
  }: Props = $props()
  const { t } = useTranslation()
</script>

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent class="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle class="flex items-center gap-3">
        {#if selectedOrg?.logo}
          <img src={selectedOrg.logo} alt={selectedOrg.name} class="h-6 w-6 rounded-md" />
        {:else}
          <Building class="h-6 w-6" />
        {/if}
        <span class="text-xl">{selectedOrg?.name}</span>
        {#if selectedOrg && checkMembershipStatus(selectedOrg.id).isMember}
          <Badge variant="outline" class="ml-2">{t('organization.detail_dialog.joined_badge', {}, 'Joined')}</Badge>
        {/if}
        {#if selectedOrg && !checkMembershipStatus(selectedOrg.id).isMember &&
            checkMembershipStatus(selectedOrg.id).status === 'pending'}
          <Badge variant="outline" class="ml-2 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            {t('organization.detail_dialog.pending_badge', {}, 'Pending approval')}
          </Badge>
        {/if}
      </DialogTitle>
    </DialogHeader>

    <div class="space-y-4 py-3">
      <div>
        <h3 class="text-sm font-semibold mb-1">{t('organization.detail_dialog.description_title', {}, 'Description')}</h3>
        <p class="text-sm text-muted-foreground">
          {selectedOrg?.description ?? t('organization.no_description', {}, 'No description.')}
        </p>
      </div>

      <div class="border-t my-2"></div>

      <div class="grid grid-cols-[120px_1fr] gap-3 items-center">
        {#if selectedOrg?.website}
          <span class="text-sm font-medium">Website:</span>
          <a
            href={selectedOrg.website}
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-foreground hover:underline truncate"
          >
            {selectedOrg.website}
          </a>
        {/if}

        <span class="text-sm font-medium">{t('organization.detail_dialog.founded_year', {}, 'Founded year')}:</span>
        <span class="text-sm">
          {selectedOrg?.founded_date ?? t('organization.detail_dialog.not_provided', {}, 'Not provided')}
        </span>

        <span class="text-sm font-medium">{t('organization.detail_dialog.owner', {}, 'Owner')}:</span>
        <span class="text-sm">
          {selectedOrg?.owner ?? t('organization.detail_dialog.not_provided', {}, 'Not provided')}
        </span>

        <span class="text-sm font-medium">{t('organization.members', {}, 'Members')}:</span>
        <span class="text-sm">
          {selectedOrg?.employee_count
            ? t('organization.detail_dialog.employee_count', { count: selectedOrg.employee_count }, ':count members')
            : t('organization.detail_dialog.not_provided', {}, 'Not provided')}
        </span>

        <span class="text-sm font-medium">{t('organization.show.projects_title', {}, 'Projects')}:</span>
        <span class="text-sm">
          {selectedOrg?.project_count
            ? t('organization.detail_dialog.project_count', { count: selectedOrg.project_count }, ':count projects')
            : t('organization.detail_dialog.not_provided', {}, 'Not provided')}
        </span>

        {#if selectedOrg?.industry}
          <span class="text-sm font-medium">{t('organization.detail_dialog.industry', {}, 'Industry')}:</span>
          <span class="text-sm">{selectedOrg.industry}</span>
        {/if}

        {#if selectedOrg?.location}
          <span class="text-sm font-medium">{t('organization.detail_dialog.location', {}, 'Location')}:</span>
          <span class="text-sm">{selectedOrg.location}</span>
        {/if}

        <span class="text-sm font-medium">{t('organization.detail_dialog.status', {}, 'Status')}:</span>
        <span class="text-sm">
          {#if selectedOrg && checkMembershipStatus(selectedOrg.id).isMember}
            <span class="text-foreground font-medium">{t('organization.detail_dialog.joined_status', {}, 'Joined')}</span>
          {:else}
            <span class="text-amber-500 font-medium">{t('organization.detail_dialog.not_joined_status', {}, 'Not joined')}</span>
          {/if}
        </span>
      </div>
    </div>

    <DialogFooter class="gap-3 flex-row sm:justify-between border-t pt-4">
      {#if selectedOrg}
        {@const membershipInfo = checkMembershipStatus(selectedOrg.id)}
        {#if membershipInfo.isMember}
          {#if selectedOrg.id === localCurrentOrgId}
            <Button variant="outline" disabled>
              <Building class="mr-2 h-4 w-4" />
              {t('organization.detail_dialog.current', {}, 'Current')}
            </Button>
          {:else}
            <Button onclick={() => { void onSwitchOrganization(selectedOrg.id) }}>
              <Building class="mr-2 h-4 w-4" />
              {t('organization.detail_dialog.switch', {}, 'Switch')}
            </Button>
          {/if}
        {:else if membershipInfo.status === 'pending'}
          <Button variant="outline" disabled>
            <Clock class="mr-2 h-4 w-4" />
            {t('organization.detail_dialog.pending', {}, 'Pending approval')}
          </Button>
        {:else}
          <Button onclick={() => { void onJoinOrganization(selectedOrg.id) }}>
            <Users class="mr-2 h-4 w-4" />
            {t('organization.detail_dialog.join', {}, 'Join organization')}
          </Button>
        {/if}

        <Button variant="outline" onclick={onClose}>
          {t('organization.detail_dialog.close', {}, 'Close')}
        </Button>
      {/if}
    </DialogFooter>
  </DialogContent>
</Dialog>
