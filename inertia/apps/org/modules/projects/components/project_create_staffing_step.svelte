<script lang="ts">
  import { ShieldCheck, Users } from 'lucide-svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  interface BlueprintRoleSlot {
    templateCode: string
    name: string
    skills: string
    note: string
  }

  interface MemberOption {
    id: string
    username: string
    email: string | null
  }

  type ProjectSetupPreset = 'delivery_squad' | 'review_pipeline' | 'marketplace_rollout'

  interface Props {
    deliveryModel: 'core_team' | 'hybrid' | 'exploration'
    staffingFocus: 'fill_now' | 'fill_after_scope' | 'explore_market'
    projectSetupPreset: ProjectSetupPreset
    initialStaffingAssignments: Record<string, string>
    selectedBlueprint: {
      label: string
      description: string
      roles: BlueprintRoleSlot[]
    }
    organizationMemberPool: MemberOption[]
    staffingCoverageSummary: string
    errors: Record<string, string>
    formData: { organization_id: string }
    onStaffingModelChange: (model: 'core_team' | 'hybrid' | 'exploration') => void
    onStaffingFocusChange: (focus: 'fill_now' | 'fill_after_scope' | 'explore_market') => void
    onPresetChange: (preset: ProjectSetupPreset) => void
    onStaffingAssignmentChange: (templateCode: string, userId: string) => void
  }

  let {
    deliveryModel,
    staffingFocus,
    projectSetupPreset,
    initialStaffingAssignments,
    selectedBlueprint,
    organizationMemberPool,
    staffingCoverageSummary,
    errors,
    formData,
    onStaffingModelChange,
    onStaffingFocusChange,
    onPresetChange,
    onStaffingAssignmentChange,
  }: Props = $props()

  const { t } = $derived(useTranslation())
  const presetOptions = ['delivery_squad', 'review_pipeline', 'marketplace_rollout'] as const
  const presetFallbacks = {
    delivery_squad: 'Delivery squad',
    review_pipeline: 'Review pipeline',
    marketplace_rollout: 'Marketplace rollout',
  } satisfies Record<ProjectSetupPreset, string>
</script>

<div class="space-y-5">
  <div class="space-y-3">
    <p class="text-sm font-semibold text-foreground">{t('project.create_page.delivery_model.heading', {}, 'Delivery model')}</p>
    <div class="grid gap-3 md:grid-cols-3">
      <button
        type="button"
        class={`rounded-2xl border p-4 text-left ${deliveryModel === 'core_team' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
        onclick={() => onStaffingModelChange('core_team')}
      >
        <p class="text-sm font-semibold text-foreground">{t('project.create_page.delivery_model.core_team', {}, 'Core team')}</p>
      </button>
      <button
        type="button"
        class={`rounded-2xl border p-4 text-left ${deliveryModel === 'hybrid' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
        onclick={() => onStaffingModelChange('hybrid')}
      >
        <p class="text-sm font-semibold text-foreground">{t('project.create_page.delivery_model.hybrid', {}, 'Hybrid')}</p>
      </button>
      <button
        type="button"
        class={`rounded-2xl border p-4 text-left ${deliveryModel === 'exploration' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
        onclick={() => onStaffingModelChange('exploration')}
      >
        <p class="text-sm font-semibold text-foreground">{t('project.create_page.delivery_model.exploration', {}, 'Exploration')}</p>
      </button>
    </div>
  </div>

  <div class="space-y-3">
    <p class="text-sm font-semibold text-foreground">{t('project.create_page.staffing_focus.heading', {}, 'Post-create priority')}</p>
    <div class="grid gap-3 md:grid-cols-3">
      <button
        type="button"
        class={`rounded-2xl border p-4 text-left ${staffingFocus === 'fill_now' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
        onclick={() => onStaffingFocusChange('fill_now')}
      >
        <p class="text-sm font-semibold text-foreground">{t('project.create_page.staffing_focus.fill_now', {}, 'Fill open roles')}</p>
      </button>
      <button
        type="button"
        class={`rounded-2xl border p-4 text-left ${staffingFocus === 'fill_after_scope' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
        onclick={() => onStaffingFocusChange('fill_after_scope')}
      >
        <p class="text-sm font-semibold text-foreground">{t('project.create_page.staffing_focus.fill_after_scope', {}, 'Set up roles first')}</p>
      </button>
      <button
        type="button"
        class={`rounded-2xl border p-4 text-left ${staffingFocus === 'explore_market' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
        onclick={() => onStaffingFocusChange('explore_market')}
      >
        <p class="text-sm font-semibold text-foreground">{t('project.create_page.staffing_focus.explore_market', {}, 'Open talent market')}</p>
      </button>
    </div>
  </div>

  <div class="space-y-3">
    <p class="text-sm font-semibold text-foreground">{t('project.create_page.blueprint_heading', {}, 'Role blueprint')}</p>
    <div class="grid gap-3 md:grid-cols-3">
      {#each presetOptions as preset}
        <button
          type="button"
          class={`rounded-2xl border p-4 text-left ${projectSetupPreset === preset ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
          onclick={() => onPresetChange(preset)}
        >
          <p class="text-sm font-semibold text-foreground">{t(`project.create_page.blueprints.${preset}.label`, {}, presetFallbacks[preset])}</p>
        </button>
      {/each}
    </div>
  </div>

  <div class="rounded-2xl border border-border bg-background p-4">
    <div class="flex items-center gap-2">
      <ShieldCheck class="h-4 w-4 text-primary" />
      <p class="text-sm font-semibold text-foreground">{selectedBlueprint.label}</p>
    </div>
    <div class="mt-4 grid gap-3 md:grid-cols-3">
      {#each selectedBlueprint.roles as role (role.templateCode)}
        <div class="rounded-2xl border border-border bg-secondary/20 p-3">
          <p class="text-sm font-semibold text-foreground">{role.name}</p>
          <p class="mt-2 text-xs leading-5 text-muted-foreground">{role.skills}</p>
        </div>
      {/each}
    </div>
  </div>

  <div class="rounded-2xl border border-border bg-background p-4">
    <div class="flex items-center gap-2">
      <Users class="h-4 w-4 text-primary" />
      <p class="text-sm font-semibold text-foreground">{t('project.create_page.initial_staffing.heading', {}, 'Initial owner assignments')}</p>
    </div>
    <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-primary font-mono">
      {staffingCoverageSummary}
    </p>

    {#if errors.initialStaffing}
      <p class="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {errors.initialStaffing}
      </p>
    {/if}

    {#if !formData.organization_id}
      <div class="mt-4 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
        {t('project.create_page.initial_staffing.missing_organization', {}, 'Choose an organization before assigning first owners.')}
      </div>
    {:else if organizationMemberPool.length === 0}
      <div class="mt-4 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
        {t('project.create_page.initial_staffing.no_members', {}, 'No members available yet.')}
      </div>
    {:else}
      <div class="mt-4 grid gap-4">
        {#each selectedBlueprint.roles as role (role.templateCode)}
          <div class="rounded-2xl border border-border p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-foreground">{role.name}</p>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">{role.skills}</p>
              </div>
              <span class="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground font-mono">
                {role.templateCode}
              </span>
            </div>
            <div class="mt-3 space-y-2">
              <Label for={`role-slot-${role.templateCode}`}>{t('project.create_page.initial_staffing.owner_label', {}, 'First owner')}</Label>
              <select
                id={`role-slot-${role.templateCode}`}
                value={initialStaffingAssignments[role.templateCode] ?? ''}
                onchange={(event) => {
                  onStaffingAssignmentChange(role.templateCode, event.currentTarget.value)
                }}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('project.create_page.initial_staffing.setup_later', {}, 'Set up later')}</option>
                {#each organizationMemberPool as member (member.id)}
                  <option value={member.id}>
                    {member.username}{member.email ? ` • ${member.email}` : ''}
                  </option>
                {/each}
              </select>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
