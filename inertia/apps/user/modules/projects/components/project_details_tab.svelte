<script lang="ts">
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'
  import type { Project, ProjectMember } from '../types'

  interface ProfessionalRoleOption {
    id: string
    name: string
    code: string
    isActive?: boolean
  }

  interface Props {
    projectState: Project
    editing: boolean
    editForm: {
      name: string
      description: string
      status: string
    }
    memberCount: number
    projectTaskSummary: {
      total: number
      pending: number
      in_progress: number
      completed: number
      overdue: number
    }
    membersWithDeliveryRole: ProjectMember[]
    staffedProfessionalRoleCount: number
    activeProfessionalRoles: ProfessionalRoleOption[]
    membersWithoutDeliveryRole: ProjectMember[]
    unstaffedProfessionalRoles: ProfessionalRoleOption[]
    formatDate: (d: string, options?: Intl.DateTimeFormatOptions) => string
  }

  let {
    projectState = $bindable(),
    editing = $bindable(),
    editForm = $bindable(),
    memberCount,
    projectTaskSummary,
    membersWithDeliveryRole,
    staffedProfessionalRoleCount,
    activeProfessionalRoles,
    membersWithoutDeliveryRole,
    unstaffedProfessionalRoles,
    formatDate,
  }: Props = $props()

  const { t } = $derived(useTranslation())

  function statusLabel(status?: string | null): string {
    if (!status) return t('project.details_tab.empty_value', {}, 'None')
    return t(`project.status_${status}`, {}, status)
  }
</script>

<Card>
  <CardContent class="pt-6">
    <div class="mb-6 grid gap-4 lg:grid-cols-3">
      <div class="rounded-2xl border border-border bg-secondary/30 p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('project.details_tab.members', {}, 'Members')}</p>
        <p class="mt-2 text-2xl font-black text-foreground">{memberCount}</p>
      </div>
      <div class="rounded-2xl border border-border bg-secondary/30 p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('project.details_tab.running_tasks', {}, 'Running tasks')}</p>
        <p class="mt-2 text-2xl font-black text-foreground">{projectTaskSummary.in_progress}</p>
      </div>
      <div class="rounded-2xl border border-border bg-secondary/30 p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('project.details_tab.overdue_tasks', {}, 'Overdue tasks')}</p>
        <p class="mt-2 text-2xl font-black text-primary">{projectTaskSummary.overdue}</p>
      </div>
    </div>

    <div class="mb-6 grid gap-4 lg:grid-cols-3">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('project.details_tab.delivery_coverage', {}, 'Delivery coverage')}</p>
        <p class="mt-2 text-2xl font-black text-foreground">
          {membersWithDeliveryRole.length}/{memberCount}
        </p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('project.details_tab.role_coverage', {}, 'Role coverage')}</p>
        <p class="mt-2 text-2xl font-black text-foreground">
          {staffedProfessionalRoleCount}/{activeProfessionalRoles.length}
        </p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('project.details_tab.need_staffing', {}, 'Need staffing')}</p>
        <p class="mt-2 text-2xl font-black text-primary">
          {Math.max(unstaffedProfessionalRoles.length, membersWithoutDeliveryRole.length)}
        </p>
      </div>
    </div>

    <div class="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <div class="rounded-2xl border border-border bg-secondary/20 p-4">
        <p class="text-sm font-semibold text-foreground">{t('project.details_tab.coverage_by_role', {}, 'Coverage by role')}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          {#if activeProfessionalRoles.length === 0}
            <span class="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
              {t('project.details_tab.no_professional_role', {}, 'No professional roles yet')}
            </span>
          {:else}
            {#each activeProfessionalRoles as role}
              {@const assignedCount = membersWithoutDeliveryRole.concat(membersWithDeliveryRole).filter((member) => member.project_professional_role_id === role.id).length}
              <span class={`rounded-full px-3 py-1 text-xs font-medium ${assignedCount > 0 ? 'bg-primary/10 text-foreground' : 'border border-dashed border-border text-muted-foreground'}`}>
                {role.name} · {assignedCount > 0 ? t('project.details_tab.people_count', { count: assignedCount }, ':count people') : t('project.details_tab.no_owner', {}, 'no owner')}
              </span>
            {/each}
          {/if}
        </div>
      </div>
      <div class="rounded-2xl border border-border bg-secondary/20 p-4">
        <p class="text-sm font-semibold text-foreground">{t('project.details_tab.staffing_status', {}, 'Staffing status')}</p>
        <div class="mt-4 space-y-2 text-sm text-muted-foreground">
          {#if membersWithoutDeliveryRole.length > 0}
            <p>{t('project.details_tab.members_without_delivery_role', { count: membersWithoutDeliveryRole.length }, ':count members without delivery role.')}</p>
          {/if}
          {#if unstaffedProfessionalRoles.length > 0}
            <p>{t('project.details_tab.roles_without_owner', { count: unstaffedProfessionalRoles.length }, ':count professional roles without owners.')}</p>
          {/if}
          {#if membersWithoutDeliveryRole.length === 0 && unstaffedProfessionalRoles.length === 0}
            <p>{t('project.details_tab.staffing_ready', {}, 'Staffing is ready for task creation.')}</p>
          {/if}
        </div>
      </div>
    </div>

    <h2 class="mb-4 text-lg font-semibold">{t('project.details_tab.info_title', {}, 'Project information')}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.description', {}, 'Description')}</p>
        {#if editing}
          <Textarea
            value={editForm.description}
            rows={4}
            oninput={(event: Event) => {
              editForm.description = (event.currentTarget as HTMLTextAreaElement).value
            }}
          />
        {:else}
          <p>{projectState.description ?? t('project.details_tab.empty_value', {}, 'None')}</p>
        {/if}
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.status', {}, 'Status')}</p>
        {#if editing}
          <select bind:value={editForm.status} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="pending">{t('project.status_pending', {}, 'Pending')}</option>
            <option value="in_progress">{t('project.status_in_progress', {}, 'In progress')}</option>
            <option value="completed">{t('project.status_completed', {}, 'Completed')}</option>
            <option value="cancelled">{t('project.status_cancelled', {}, 'Cancelled')}</option>
          </select>
        {:else}
          <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
            {statusLabel(projectState.status)}
          </div>
        {/if}
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.start_date', {}, 'Start Date')}</p>
        <p>{projectState.start_date ? formatDate(projectState.start_date) : t('project.details_tab.empty_value', {}, 'None')}</p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.end_date', {}, 'End Date')}</p>
        <p>{projectState.end_date ? formatDate(projectState.end_date) : t('project.details_tab.empty_value', {}, 'None')}</p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.creator', {}, 'Creator')}</p>
        <p>{projectState.creator_name ?? t('project.details_tab.empty_value', {}, 'None')}</p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.manager', {}, 'Manager')}</p>
        <p>{projectState.manager_name ?? t('project.details_tab.empty_value', {}, 'None')}</p>
      </div>
    </div>
    {#if editing}
      <div class="mt-4 space-y-2">
        <Label for="project-name">{t('project.name', {}, 'Project Name')}</Label>
        <Input
          id="project-name"
          value={editForm.name}
          oninput={(event: Event) => {
            editForm.name = (event.currentTarget as HTMLInputElement).value
          }}
        />
      </div>
    {/if}
  </CardContent>
</Card>
