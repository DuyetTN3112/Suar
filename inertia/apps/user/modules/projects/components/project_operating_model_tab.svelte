<script lang="ts">
  import { buildRoleTaskLaunchHref } from '@/apps/user/modules/projects/lib/project_operating_model'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  interface RoleSkill {
    id: string
    skill?: {
      skillName?: string
      skill_name?: string
      categoryCode?: string
      category_code?: string
    }
    minimumLevel?: { code?: string | null } | null
    targetLevel?: { code?: string | null } | null
  }

  interface Role {
    id: string
    name: string
    code?: string | null
    isActive?: boolean
    skills?: RoleSkill[]
  }

  interface Props {
    projectId: string
    taskLaunchBaseUrl: string
    roles: Role[]
    canLaunchTask?: boolean
  }

  const { projectId, taskLaunchBaseUrl, roles, canLaunchTask = false }: Props = $props()
  const { t } = $derived(useTranslation())
  const activeRoles = $derived(roles.filter((role) => role.isActive !== false))

  function skillName(roleSkill: RoleSkill) {
    return roleSkill.skill?.skillName ?? roleSkill.skill?.skill_name ?? 'Skill'
  }

  function levelRange(roleSkill: RoleSkill) {
    const min = roleSkill.minimumLevel?.code?.toUpperCase() ?? 'L0'
    const target = roleSkill.targetLevel?.code?.toUpperCase() ?? 'L0'
    return `${min}-${target}`
  }
</script>

<section class="space-y-4" data-demo-section="project-operating-model">
  {#if activeRoles.length === 0}
    <div class="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      {t('project.operating_model.no_roles', {}, 'No active roles are ready to launch tasks.')}
    </div>
  {:else}
    <div class="grid gap-3 md:grid-cols-2">
      {#each activeRoles as role (role.id)}
        <article class="rounded-xl border border-border bg-background p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-bold text-foreground">{role.name}</h3>
              <p class="mt-1 text-xs text-muted-foreground">{t('project.operating_model.review_owner', {}, 'Review owner + 2 peers')}</p>
            </div>
            {#if canLaunchTask}
              <a
                class="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground"
                href={buildRoleTaskLaunchHref({
                  baseUrl: taskLaunchBaseUrl,
                  projectId,
                  roleId: role.id,
                  roleCode: role.code,
                })}
              >
                {t('project.operating_model.create_task', {}, 'Create task')}
              </a>
            {/if}
          </div>

          {#if role.skills?.length}
            <div class="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              {t('project.operating_model.skill_ranges', {}, 'Skill ranges')}
            </div>
            <div class="mt-2 flex flex-wrap gap-2 text-xs">
              {#each role.skills as roleSkill (roleSkill.id)}
                <span class="rounded-full border border-border px-2.5 py-1">
                  {skillName(roleSkill)} · {levelRange(roleSkill)}
                </span>
              {/each}
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>
