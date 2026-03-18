<script lang="ts">
  import Avatar from '@/apps/org/shared/ui/avatar.svelte'
  import AvatarFallback from '@/apps/org/shared/ui/avatar_fallback.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import TalentExplainabilityBadges from '@/apps/org/modules/profile/components/talent_explainability_badges.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  interface ProfessionalRoleOption {
    id: string
    name: string
    code: string
  }

  interface Member {
    user_id?: string
    username: string
    email: string
    role: string
    project_professional_role_id?: string | null
    professional_role_name?: string | null
    task_count?: number
    reviewed_skills_count?: number
    imported_skills_count?: number
    under_dispute_skills_count?: number
    latest_confidence_signal?: 'low' | 'medium' | 'high' | null
  }

  interface Props {
    member: Member
    canManage: boolean
    projectProfessionalRoles: ProfessionalRoleOption[]
    getMemberInitials: (member: Member) => string
    onUpdateMemberRole: (
      userId: string,
      role: string,
      professionalRoleId: string | null
    ) => void
    onRemoveMember: (userId: string) => void
  }

  const {
    member,
    canManage,
    projectProfessionalRoles,
    getMemberInitials,
    onUpdateMemberRole,
    onRemoveMember,
  }: Props = $props()

  const { t } = $derived(useTranslation())

  function projectRoleLabel(role: string): string {
    return t(`project.member_card.project_role.${role}`, {}, role)
  }
</script>

<div class="flex flex-col gap-4 rounded-md border p-3 xl:flex-row xl:items-start xl:justify-between">
  <div class="flex min-w-0 items-center gap-3">
    <Avatar>
      <AvatarFallback>{getMemberInitials(member)}</AvatarFallback>
    </Avatar>
    <div class="min-w-0">
      <p class="truncate font-medium">{member.username || member.email}</p>
      <p class="truncate text-sm text-muted-foreground">{member.email}</p>
      <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <span class="rounded-full bg-secondary px-2 py-1 text-muted-foreground">
          {t('project.member_card.governance_label', {}, 'Governance')}: {projectRoleLabel(member.role)}
        </span>
        <span class="rounded-full bg-primary/10 px-2 py-1 text-foreground">
          {t('project.member_card.delivery_label', {}, 'Delivery')}: {member.professional_role_name ?? t('project.member_card.unassigned_role', {}, 'No role assigned')}
        </span>
        {#if member.task_count !== undefined}
          <span class="rounded-full bg-secondary px-2 py-1 text-muted-foreground">
            {t(
              'ui_misc.projects.member.task_count',
              { count: member.task_count },
              ':count tasks'
            )}
          </span>
        {/if}
      </div>
      <TalentExplainabilityBadges
        reviewedSkillsCount={member.reviewed_skills_count ?? 0}
        importedSkillsCount={member.imported_skills_count ?? 0}
        underDisputeSkillsCount={member.under_dispute_skills_count ?? 0}
        latestConfidenceSignal={member.latest_confidence_signal ?? null}
        containerClass="mt-2 flex flex-wrap gap-1"
        badgeClass="border-border bg-card text-[10px] text-foreground"
      />
    </div>
  </div>
  <div class="flex flex-col gap-2 xl:items-end">
    {#if canManage}
      <div class="grid w-full gap-2 sm:grid-cols-2 xl:w-auto">
        <label class="space-y-1">
          <span class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('project.member_card.governance_role_label', {}, 'Governance role')}</span>
          <select
            value={member.role}
            onchange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement
              onUpdateMemberRole(
                member.user_id ?? '',
                target.value,
                member.project_professional_role_id ?? null
              )
            }}
            class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="project_viewer">{t('project.member_card.project_role.project_viewer', {}, 'Viewer')}</option>
            <option value="project_member">{t('project.member_card.project_role.project_member', {}, 'Member')}</option>
            <option value="project_manager">{t('project.member_card.project_role.project_manager', {}, 'Manager')}</option>
          </select>
        </label>
        <label class="space-y-1">
          <span class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('project.member_card.delivery_role_label', {}, 'Delivery role')}</span>
          <select
            value={member.project_professional_role_id ?? ''}
            onchange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement
              onUpdateMemberRole(
                member.user_id ?? '',
                member.role,
                target.value || null
              )
            }}
            class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">{t('project.member_card.unassigned_short', {}, 'Unassigned')}</option>
            {#each projectProfessionalRoles as role}
              <option value={role.id}>{role.name}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="flex justify-end">
        <Button
          size="sm"
          variant="destructive"
          onclick={() => {
            onRemoveMember(member.user_id ?? '')
          }}
        >
          {t('project.member_card.remove', {}, 'Remove')}
        </Button>
      </div>
    {:else}
      <span class="text-xs text-muted-foreground">
        {projectRoleLabel(member.role)} · {member.professional_role_name ?? t('project.member_card.unassigned_delivery_role', {}, 'No delivery role assigned')}
      </span>
    {/if}
  </div>
</div>
